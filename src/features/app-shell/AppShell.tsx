import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { UserProfile } from '../../domain/profile/profile';
import type { AppView } from '../../app/navigation';
import { ProfileAvatar } from '../profiles/ProfileAvatar';
import { PwaCoordinator } from '../pwa/PwaCoordinator';
import { useDeviceExperience } from '../pwa/use-device-experience';
import { isActiveNavigation, mobileDrawerReducer, navigationSections } from './mobile-navigation';
import './app-shell.css';

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
  const [drawerOpen, dispatchDrawer] = useReducer(mobileDrawerReducer, false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

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
    dispatchDrawer('navigate');
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
          {navigationSections[0]?.items.map((item) => (
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
          <button ref={drawerTriggerRef} className="mobile-menu-button" type="button" aria-label="Abrir menu" aria-expanded={drawerOpen} aria-controls="defyn-mobile-drawer" onClick={() => dispatchDrawer('open')}><span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" /></button>
          <button className="mobile-brand" type="button" onClick={() => navigate('today')} aria-label="Ir para Hoje"><span className="brand-mark">D</span><b>DEFYN</b></button>
          <button className="mobile-profile-button" type="button" onClick={() => dispatchDrawer('open')} aria-label={`Perfil ativo: ${activeProfile.name}. Abrir menu.`}><ProfileAvatar profile={activeProfile} /><b>{activeProfile.name}</b><i aria-hidden="true">⌄</i></button>
        </header>
        {notice && <div className="app-notice" role="status" aria-live="polite">{notice}</div>}
        <div className="app-content">{children}</div>
      </div>

      {drawerOpen && <MobileDrawer profiles={profiles} activeProfile={activeProfile} view={view} deviceExperience={deviceExperience} onClose={() => dispatchDrawer('close')} onNavigate={navigate} onSwitchProfile={(profileId) => { onSwitchProfile(profileId); dispatchDrawer('close'); }} onAddProfile={() => { onAddProfile(); dispatchDrawer('close'); }} onQuickWater={async (amount) => { await onQuickWater(amount); dispatchDrawer('close'); }} />}
      <PwaCoordinator experience={deviceExperience} />
    </div>
  );
}

function MobileDrawer({ profiles, activeProfile, view, deviceExperience, onClose, onNavigate, onSwitchProfile, onAddProfile, onQuickWater }: { profiles: UserProfile[]; activeProfile: UserProfile; view: AppView; deviceExperience: ReturnType<typeof useDeviceExperience>; onClose: () => void; onNavigate: (view: AppView) => void; onSwitchProfile: (profileId: string) => void; onAddProfile: () => void; onQuickWater: (amount: number) => Promise<void> }) {
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onCloseRef.current(); return; }
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0]; const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); trigger?.focus(); };
  }, []);
  return <div className="mobile-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside ref={panel} id="defyn-mobile-drawer" className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu principal"><header><div><span className="brand-mark">D</span><span><strong>DEFYN</strong><small>Local-first</small></span></div><button ref={closeButton} type="button" onClick={onClose} aria-label="Fechar menu">×</button></header><div className="mobile-drawer-scroll"><section className="drawer-profile"><span className="drawer-kicker">Perfil atual</span><div><ProfileAvatar profile={activeProfile} className="profile-avatar" /><span><strong>{activeProfile.name}</strong><small>{deviceExperience.online ? 'Offline disponível' : 'Sem conexão · dados locais'}</small></span></div><div className="drawer-profile-list">{profiles.map((profile) => <button key={profile.id} type="button" className={profile.id === activeProfile.id ? 'active' : ''} aria-pressed={profile.id === activeProfile.id} onClick={() => onSwitchProfile(profile.id)}><ProfileAvatar profile={profile} className="mini-avatar" /><span>{profile.name}</span>{profile.id === activeProfile.id && <b>✓</b>}</button>)}</div><button className="drawer-add-profile" type="button" onClick={onAddProfile}>+ Adicionar pessoa</button></section><nav className="mobile-drawer-nav" aria-label="Áreas do DEFYN">{navigationSections.map((section) => <section key={section.label}><span className="drawer-kicker">{section.label}</span>{section.items.map((item) => <button key={item.view} type="button" className={isActiveNavigation(view, item.view) ? 'active' : ''} aria-current={isActiveNavigation(view, item.view) ? 'page' : undefined} onClick={() => onNavigate(item.view)}><span aria-hidden="true">{item.symbol}</span><strong>{item.label}</strong>{item.view === 'profiles' && <small>{profiles.length}</small>}</button>)}</section>)}</nav><section className="drawer-quick-water"><span className="drawer-kicker">Água rápida</span><div>{[200, 300, 500].map((amount) => <button key={amount} type="button" onClick={() => void onQuickWater(amount)}>+ {amount} ml</button>)}</div></section>{deviceExperience.canInstall && <button className="drawer-install" type="button" onClick={() => { onClose(); void deviceExperience.install(); }}>Instalar DEFYN</button>}</div></aside></div>;
}
