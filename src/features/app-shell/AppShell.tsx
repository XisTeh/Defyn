import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { UserProfile } from '../../domain/profile/profile';
import type { AppView } from '../../app/navigation';
import { ProfileAvatar } from '../profiles/ProfileAvatar';
import { PwaCoordinator } from '../pwa/PwaCoordinator';
import { useDeviceExperience } from '../pwa/use-device-experience';
import './app-shell.css';

const navItems: readonly { view: AppView; label: string; symbol: string }[] = [
  { view: 'today', label: 'Hoje', symbol: '◒' },
  { view: 'diary', label: 'Diário', symbol: '≡' },
  { view: 'foods', label: 'Alimentos', symbol: '◇' },
  { view: 'recipes', label: 'Receitas', symbol: '⌁' },
  { view: 'planner', label: 'Planejamento', symbol: '◎' },
  { view: 'training', label: 'Treinos', symbol: '◫' },
  { view: 'progress', label: 'Progresso', symbol: '↗' },
];

interface AppShellProps {
  profiles: UserProfile[];
  activeProfile: UserProfile;
  view: AppView;
  children: ReactNode;
  notice?: string;
  onNavigate: (view: AppView) => void;
  onSwitchProfile: (profileId: string) => void;
  onAddProfile: () => void;
  onQuickWater: (amountMl: number) => Promise<void>;
}

export function AppShell({
  profiles, activeProfile, view, children, notice, onNavigate, onSwitchProfile,
  onAddProfile, onQuickWater,
}: AppShellProps) {
  const deviceExperience = useDeviceExperience(activeProfile.id);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (event.target instanceof Node && profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  function navigate(next: AppView) {
    onNavigate(next);
    setMoreOpen(false);
    setQuickOpen(false);
  }

  return (
    <div className="application-shell">
      <aside className="desktop-sidebar" aria-label="Navegação principal">
        <div className="sidebar-brand"><span className="brand-mark">D</span><span>DEFYN</span><small>Local-first</small></div>
        <div className="profile-switcher" ref={profileMenuRef}>
          <button className="profile-switcher-button" type="button" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>
            <ProfileAvatar profile={activeProfile} className="profile-avatar" />
            <span className="profile-switcher-copy"><strong>{activeProfile.name}</strong><small>Perfil ativo</small></span>
            <span aria-hidden="true">⌄</span>
          </button>
          {profileMenuOpen && (
            <div className="profile-menu" role="menu">
              <span className="menu-label">Trocar pessoa</span>
              {profiles.map((profile) => (
                <button key={profile.id} type="button" role="menuitem" onClick={() => { onSwitchProfile(profile.id); setProfileMenuOpen(false); }}>
                  <ProfileAvatar profile={profile} className="mini-avatar" /><span>{profile.name}</span>{profile.id === activeProfile.id && <b aria-label="Perfil ativo">✓</b>}
                </button>
              ))}
              <hr />
              <button type="button" role="menuitem" onClick={() => { onAddProfile(); setProfileMenuOpen(false); }}><span className="mini-avatar add">+</span><span>Adicionar pessoa</span></button>
              <button type="button" role="menuitem" onClick={() => navigate('profiles')}><span className="mini-avatar">••</span><span>Gerenciar perfis</span></button>
            </div>
          )}
        </div>
        <button className="sidebar-primary-action" type="button" onClick={onAddProfile}><span>+</span> Adicionar pessoa</button>
        <nav className="sidebar-nav">
          <span className="nav-section-label">Acompanhamento</span>
          {navItems.map((item) => (
            <button key={item.view} type="button" className={view === item.view ? 'active' : ''} aria-current={view === item.view ? 'page' : undefined} onClick={() => navigate(item.view)}>
              <span className="nav-symbol" aria-hidden="true">{item.symbol}</span><span>{item.label}</span>
            </button>
          ))}
          <span className="nav-section-label separated">Sua conta local</span>
          <button type="button" className={view === 'profile' ? 'active' : ''} onClick={() => navigate('profile')}><span className="nav-symbol" aria-hidden="true">◎</span><span>Ficha e metas</span></button>
          <button type="button" className={view === 'profiles' ? 'active' : ''} onClick={() => navigate('profiles')}><span className="nav-symbol" aria-hidden="true">◉</span><span>Perfis</span><span className="nav-count">{profiles.length}</span></button>
          <button type="button" className={view === 'backup' ? 'active' : ''} onClick={() => navigate('backup')}><span className="nav-symbol" aria-hidden="true">⇅</span><span>Backup</span></button>
        </nav>
        <div className={`sidebar-foot ${deviceExperience.online ? '' : 'is-offline'}`}><span className="status-dot" /> <span>{deviceExperience.online ? 'Offline disponível' : 'Sem conexão'}</span><small>{deviceExperience.offlineReady ? 'Aplicativo pronto para uso offline' : 'Dados neste dispositivo'}</small>{deviceExperience.canInstall && <button type="button" onClick={() => void deviceExperience.install()}>Instalar DEFYN</button>}</div>
      </aside>

      <div className="app-main-column">
        <header className="mobile-header">
          <button className="mobile-brand" type="button" onClick={() => navigate('today')} aria-label="Ir para Hoje"><span className="brand-mark">D</span><b>DEFYN</b></button>
          <button className="mobile-profile-button" type="button" onClick={() => setMoreOpen(true)} aria-label={`Perfil ativo: ${activeProfile.name}. Abrir menu.`}><ProfileAvatar profile={activeProfile} /><b>{activeProfile.name}</b><i aria-hidden="true">⌄</i></button>
        </header>
        {notice && <div className="app-notice" role="status" aria-live="polite">{notice}</div>}
        <div className="app-content">{children}</div>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
        <button className={view === 'today' ? 'active' : ''} type="button" onClick={() => navigate('today')}><span>◒</span><small>Hoje</small></button>
        <button className={view === 'diary' ? 'active' : ''} type="button" onClick={() => navigate('diary')}><span>≡</span><small>Diário</small></button>
        <button className="quick-add-button" type="button" onClick={() => setQuickOpen(true)} aria-label="Abrir ações rápidas"><span>+</span></button>
        <button className={view === 'progress' ? 'active' : ''} type="button" onClick={() => navigate('progress')}><span>↗</span><small>Progresso</small></button>
        <button className={moreOpen ? 'active' : ''} type="button" onClick={() => setMoreOpen(true)}><span>•••</span><small>Mais</small></button>
      </nav>

      {quickOpen && <Sheet title="Ação rápida" onClose={() => setQuickOpen(false)}><div className="sheet-links quick-links"><button type="button" onClick={() => navigate('diary')}>+ Adicionar alimento à refeição</button><button type="button" onClick={() => navigate('foods')}>Fotografar ou cadastrar alimento</button></div><p className="sheet-copy">Registrar água para {activeProfile.name}</p><div className="sheet-water-actions">{[200, 300, 500].map((amount) => <button key={amount} type="button" onClick={async () => { await onQuickWater(amount); setQuickOpen(false); }}>+ {amount} ml</button>)}</div></Sheet>}
      {moreOpen && <Sheet title={activeProfile.name} onClose={() => setMoreOpen(false)}>
        <div className="sheet-profile-list">{profiles.map((profile) => <button key={profile.id} type="button" className={profile.id === activeProfile.id ? 'active' : ''} onClick={() => { onSwitchProfile(profile.id); setMoreOpen(false); }}><ProfileAvatar profile={profile} className="mini-avatar" /><span><strong>{profile.name}</strong><small>{profile.id === activeProfile.id ? 'Perfil ativo' : 'Trocar para este perfil'}</small></span><b>{profile.id === activeProfile.id ? '✓' : '›'}</b></button>)}</div>
        <p className="sheet-device-status"><span className={`status-dot ${deviceExperience.online ? '' : 'offline'}`} />{deviceExperience.online ? 'Online · uso offline disponível' : 'Sem conexão · usando dados locais'}</p>
        <div className="sheet-links"><button type="button" onClick={() => { onAddProfile(); setMoreOpen(false); }}>+ Adicionar pessoa</button><button type="button" onClick={() => navigate('training')}>Treinos</button><button type="button" onClick={() => navigate('profile')}>Ficha e metas</button><button type="button" onClick={() => navigate('profiles')}>Gerenciar perfis</button><button type="button" onClick={() => navigate('backup')}>Backup local</button>{deviceExperience.canInstall && <button type="button" onClick={() => { setMoreOpen(false); void deviceExperience.install(); }}>Instalar DEFYN</button>}</div>
      </Sheet>}
      <PwaCoordinator experience={deviceExperience} />
    </div>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={title}><div className="sheet-handle" /><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Fechar">×</button></header>{children}</section></div>;
}
