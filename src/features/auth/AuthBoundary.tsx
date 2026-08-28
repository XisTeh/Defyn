import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { AuthSessionService, type AuthSessionSnapshot } from '../../application/auth/auth-session';
import { shouldExposeLocalData, type LocalOwnershipDecision } from '../../application/auth/local-installation-ownership';
import { localInstallationOwnershipService } from '../../infrastructure/indexed-db/local-owner-repository';
import { readViteSupabaseConfig, type SupabaseRuntimeConfig } from '../../infrastructure/supabase/config';
import { Button } from '../../shared/components/Button';
import { LocalDataAccessGuard } from './LocalDataAccessGuard';
import type { DefynSupabaseClient } from '../../infrastructure/supabase/client';
import './auth.css';

const SyncSessionBoundary = lazy(() => import('../sync/SyncSessionBoundary').then((module) => ({ default: module.SyncSessionBoundary })));

type AuthView = 'sign-in' | 'sign-up' | 'forgot-password';

function configuredRuntime(): SupabaseRuntimeConfig | Error {
  try { return readViteSupabaseConfig(); }
  catch (caught) { return caught instanceof Error ? caught : new Error('Configuração do Supabase inválida.'); }
}

export function AuthBoundary({ children }: { children: ReactNode }) {
  const runtime = useMemo(() => configuredRuntime(), []);
  if (runtime instanceof Error) return <AuthConfigurationError message={runtime.message} />;
  if (runtime.mode === 'local') return children;
  return <SupabaseAuthBoundary runtime={runtime}>{children}</SupabaseAuthBoundary>;
}

function SupabaseAuthBoundary({ runtime, children }: { runtime: Extract<SupabaseRuntimeConfig, { mode: 'supabase' }>; children: ReactNode }) {
  const [runtimeServices, setRuntimeServices] = useState<{ service: AuthSessionService; client: DefynSupabaseClient }>();
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      import('../../infrastructure/supabase/client'),
      import('../../infrastructure/supabase/supabase-auth-gateway'),
    ]).then(([clientModule, gatewayModule]) => {
      const client = clientModule.createSupabaseClient(runtime);
      if (active) setRuntimeServices({ service: new AuthSessionService(new gatewayModule.SupabaseAuthGateway(client)), client });
    }).catch((caught: unknown) => { if (active) setLoadError(authErrorMessage(caught)); });
    return () => { active = false; };
  }, [runtime]);

  if (loadError) return <AuthConfigurationError message={loadError} />;
  if (!runtimeServices) return <AuthBootScreen />;
  return <ActiveSupabaseAuthBoundary service={runtimeServices.service} client={runtimeServices.client}>{children}</ActiveSupabaseAuthBoundary>;
}

function ActiveSupabaseAuthBoundary({ service, client, children }: { service: AuthSessionService; client: DefynSupabaseClient; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuthSessionSnapshot>({ status: 'loading', session: null, recovery: false });
  const [fatalError, setFatalError] = useState('');

  useEffect(() => {
    let active = true;
    const subscription = service.subscribe((next) => { if (active) flushSync(() => setSnapshot(next)); });
    service.bootstrap()
      .then((next) => { if (active) setSnapshot((current) => current.recovery ? current : next); })
      .catch((caught: unknown) => { if (active) setFatalError(authErrorMessage(caught)); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [service]);

  if (fatalError) return <AuthConfigurationError message={fatalError} />;
  if (snapshot.status === 'loading') return <AuthBootScreen />;
  if (snapshot.status === 'signed-out') return <AuthScreen service={service} />;
  if (snapshot.recovery) return <UpdatePasswordScreen service={service} onComplete={() => setSnapshot({ ...snapshot, recovery: false })} />;
  return <AuthenticatedSession key={snapshot.session.user.id} service={service} client={client} session={snapshot.session}>{children}</AuthenticatedSession>;
}

function AuthenticatedSession({ service, client, session, children }: { service: AuthSessionService; client: DefynSupabaseClient; session: Session; children: ReactNode }) {
  const [decision, setDecision] = useState<LocalOwnershipDecision>();
  const [ownershipError, setOwnershipError] = useState('');
  const [linking, setLinking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    localInstallationOwnershipService.resolve(session.user.id)
      .then((result) => { if (active) setDecision(result); })
      .catch(() => { if (active) setOwnershipError('Não foi possível verificar a proteção dos dados deste dispositivo.'); });
    return () => { active = false; };
  }, [session.user.id]);

  async function signOut() {
    setSigningOut(true);
    try { await service.signOut(); }
    finally { setSigningOut(false); }
  }

  async function linkLegacyData() {
    setLinking(true); setOwnershipError('');
    try { setDecision(await localInstallationOwnershipService.linkLegacyData(session.user.id)); }
    catch { setOwnershipError('Não foi possível vincular os dados locais com segurança.'); }
    finally { setLinking(false); }
  }

  if (ownershipError) return <LocalOwnershipErrorScreen message={ownershipError} signingOut={signingOut} onSignOut={() => void signOut()} />;
  if (!decision) return <div className="boot-screen"><span className="brand-mark">D</span><strong>DEFYN</strong><p>Protegendo os dados deste dispositivo…</p></div>;
  if (decision.status === 'needs-link') return <LocalOwnershipScreen
    kind="claim"
    busy={linking || signingOut}
    onPrimary={() => void linkLegacyData()}
    onSignOut={() => void signOut()}
  />;
  if (decision.status === 'blocked') return <LocalOwnershipScreen
    kind="blocked"
    busy={signingOut}
    onSignOut={() => void signOut()}
  />;
  if (!shouldExposeLocalData(decision)) return null;

  return <LocalDataAccessGuard decision={decision}>
    <Suspense fallback={<AuthBootScreen />}><SyncSessionBoundary accountId={session.user.id} email={session.user.email} client={client} onSignOut={() => service.signOut()}>{children}</SyncSessionBoundary></Suspense>
  </LocalDataAccessGuard>;
}

function LocalOwnershipScreen({ kind, busy, onPrimary, onSignOut }: { kind: 'claim' | 'blocked'; busy: boolean; onPrimary?: () => void; onSignOut: () => void }) {
  const claiming = kind === 'claim';
  return <main className="auth-page single ownership-page"><section className="auth-card ownership-card">
    <header><span className="auth-mobile-brand visible">DEFYN</span><span className="page-eyebrow">Proteção neste dispositivo</span><h2>{claiming ? 'Dados locais encontrados' : 'Dados vinculados a outra conta'}</h2><p>{claiming
      ? 'Este dispositivo possui dados criados antes da conta online. Confirme se eles pertencem à conta atualmente conectada.'
      : 'Este dispositivo possui dados locais vinculados a outra conta DEFYN. Para protegê-los, o conteúdo não será exibido nesta sessão.'}</p></header>
    {claiming && <p className="ownership-note">O vínculo é somente neste dispositivo. Nenhum perfil, treino, foto ou registro será enviado ao Supabase agora.</p>}
    {!claiming && <p className="ownership-note">Entre com a conta que vinculou esta instalação ou use outro dispositivo ou perfil do navegador.</p>}
    <div className="ownership-actions">
      {claiming && <Button type="button" loading={busy} onClick={onPrimary}>Vincular a esta conta</Button>}
      <Button type="button" variant={claiming ? 'secondary' : 'primary'} disabled={busy} onClick={onSignOut}>Sair</Button>
    </div>
  </section></main>;
}

function LocalOwnershipErrorScreen({ message, signingOut, onSignOut }: { message: string; signingOut: boolean; onSignOut: () => void }) {
  return <main className="auth-page single ownership-page"><section className="auth-card ownership-card" role="alert"><header><span className="auth-mobile-brand visible">DEFYN</span><span className="page-eyebrow">Proteção local</span><h2>Dados indisponíveis</h2><p>{message} Nenhum conteúdo local foi aberto.</p></header><div className="ownership-actions"><Button type="button" loading={signingOut} onClick={onSignOut}>Sair</Button></div></section></main>;
}

function AuthScreen({ service }: { service: AuthSessionService }) {
  const [view, setView] = useState<AuthView>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function changeView(next: AuthView) {
    setView(next); setError(''); setMessage(''); setPassword(''); setConfirmation('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setMessage('');
    const normalizedEmail = email.trim();
    if (!normalizedEmail) { setError('Informe seu e-mail.'); return; }
    if (view === 'sign-up' && password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      if (view === 'sign-in') await service.signIn(normalizedEmail, password);
      if (view === 'sign-up') {
        const result = await service.signUp(normalizedEmail, password);
        if (result.confirmationPending) setMessage('Conta criada. Confirme seu e-mail pelo link enviado antes de entrar.');
      }
      if (view === 'forgot-password') {
        const redirectTo = `${window.location.origin}${window.location.pathname}?auth=recovery`;
        await service.requestPasswordReset(normalizedEmail, redirectTo);
        setMessage('Se existir uma conta para esse e-mail, o link de recuperação será enviado.');
      }
    } catch (caught) { setError(authErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  const signingUp = view === 'sign-up';
  const forgot = view === 'forgot-password';
  return <main className="auth-page">
    <section className="auth-identity" aria-label="DEFYN">
      <span className="auth-brand-mark">D</span><span className="auth-wordmark">DEFYN</span>
      <div><span className="page-eyebrow">Local-first · multi-dispositivo</span><h1>Seu ritmo.<br />Seu registro.</h1><p>Seus dados continuam disponíveis neste dispositivo. A conta prepara o DEFYN para compartilhar dados com segurança entre PC e celular.</p></div>
    </section>
    <section className="auth-card">
      <header><span className="auth-mobile-brand">DEFYN</span><span className="page-eyebrow">Conta segura</span><h2>{signingUp ? 'Criar conta' : forgot ? 'Recuperar senha' : 'Entrar no DEFYN'}</h2><p>{forgot ? 'Enviaremos um link para você definir uma nova senha.' : 'Continue seu acompanhamento em qualquer dispositivo.'}</p></header>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <label>E-mail<input type="email" name="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {!forgot && <label>Senha<input type="password" name="password" autoComplete={signingUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>}
        {signingUp && <><label>Confirmar senha<input type="password" name="password-confirmation" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label><p className="auth-password-help">Os requisitos de senha são os configurados no seu projeto Supabase. Se algum requisito não for atendido, o DEFYN mostrará a mensagem recebida com segurança.</p></>}
        {error && <p className="auth-feedback error" role="alert">{error}</p>}
        {message && <p className="auth-feedback success" role="status">{message}</p>}
        <Button type="submit" loading={busy}>{signingUp ? 'Criar conta' : forgot ? 'Enviar link' : 'Entrar'}</Button>
      </form>
      <nav aria-label="Opções de autenticação">
        {!forgot && !signingUp && <button type="button" onClick={() => changeView('forgot-password')}>Esqueci minha senha</button>}
        <p>{signingUp ? 'Já tem uma conta?' : forgot ? 'Lembrou sua senha?' : 'Ainda não tem conta?'} <button type="button" onClick={() => changeView(signingUp || forgot ? 'sign-in' : 'sign-up')}>{signingUp || forgot ? 'Entrar' : 'Criar conta'}</button></p>
      </nav>
    </section>
  </main>;
}

function UpdatePasswordScreen({ service, onComplete }: { service: AuthSessionService; onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setBusy(true);
    try { await service.updatePassword(password); onComplete(); }
    catch (caught) { setError(authErrorMessage(caught)); }
    finally { setBusy(false); }
  }
  return <main className="auth-page single"><section className="auth-card"><header><span className="auth-mobile-brand visible">DEFYN</span><span className="page-eyebrow">Recuperação</span><h2>Definir nova senha</h2><p>Escolha a nova senha da sua conta DEFYN.</p></header><form onSubmit={(event) => void submit(event)}><label>Nova senha<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label>Confirmar nova senha<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>{error && <p className="auth-feedback error" role="alert">{error}</p>}<Button type="submit" loading={busy}>Salvar nova senha</Button></form></section></main>;
}

function AuthBootScreen() { return <div className="boot-screen"><span className="brand-mark">D</span><strong>DEFYN</strong><p>Verificando sua conta…</p></div>; }
function AuthConfigurationError({ message }: { message: string }) { return <div className="boot-screen error-state" role="alert"><span className="brand-mark">!</span><strong>Supabase não configurado</strong><p>{message}</p><small>Revise o arquivo .env.local conforme docs/SUPABASE_SETUP.md.</small></div>; }

function authErrorMessage(caught: unknown): string {
  if (!(caught instanceof Error)) return 'Não foi possível concluir. Tente novamente.';
  const normalized = caught.message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha inválidos.';
  if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (normalized.includes('user already registered')) return 'Já existe uma conta para este e-mail.';
  if (normalized.includes('password')) return caught.message;
  if (normalized.includes('fetch') || normalized.includes('network')) return 'Sem conexão com o serviço de conta. Seus dados locais continuam disponíveis neste dispositivo.';
  return caught.message || 'Não foi possível concluir. Tente novamente.';
}
