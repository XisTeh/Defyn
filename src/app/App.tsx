import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { DeleteProfileService } from '../application/profile/delete-profile';
import { ProfileSessionService } from '../application/profile/profile-session';
import { WaterService } from '../application/hydration/water-service';
import type { CreateProfileResult } from '../application/profile/create-profile';
import type { UserProfile } from '../domain/profile/profile';
import { repositories } from '../infrastructure/repositories';
import { AppShell } from '../features/app-shell/AppShell';
import { TodayDashboard } from '../features/dashboard/TodayDashboard';
import { ProfileSetup } from '../features/profile-setup/ProfileSetup';
import { ProfileManager } from '../features/profiles/ProfileManager';
import type { AppView } from './navigation';
import { ModuleFallback } from '../shared/components/ModuleFallback';

const BackupPanel = lazy(() => import('../features/backup/BackupPanel').then((module) => ({ default: module.BackupPanel })));
const DailyTrackingWorkspace = lazy(() => import('../features/daily-tracking/DailyTrackingWorkspace').then((module) => ({ default: module.DailyTrackingWorkspace })));
const TrainingWorkspace = lazy(() => import('../features/training/TrainingWorkspace').then((module) => ({ default: module.TrainingWorkspace })));
const ProgressWorkspace = lazy(() => import('../features/progress/ProgressWorkspace').then((module) => ({ default: module.ProgressWorkspace })));

const sessionService = new ProfileSessionService(repositories.profiles, repositories.activeProfile);
const deleteProfileService = new DeleteProfileService(
  repositories.profiles,
  repositories.activeProfile,
  repositories.profileData,
);
const waterService = new WaterService(repositories.water);

export function App() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile>();
  const [view, setView] = useState<AppView>('today');
  const [editingProfile, setEditingProfile] = useState<UserProfile | 'new'>();
  const [initializing, setInitializing] = useState(true);
  const [fatalError, setFatalError] = useState('');
  const [notice, setNotice] = useState('');
  const [dataRevision, setDataRevision] = useState(0);

  const loadSession = useCallback(async () => {
    const session = await sessionService.load();
    setProfiles(session.profiles);
    setActiveProfile(session.activeProfile);
    return session;
  }, []);

  useEffect(() => {
    let active = true;
    sessionService.load()
      .then((session) => {
        if (!active) return;
        setProfiles(session.profiles);
        setActiveProfile(session.activeProfile);
      })
      .catch((caught: unknown) => {
        if (active) setFatalError(caught instanceof Error ? caught.message : 'Não foi possível abrir os dados locais.');
      })
      .finally(() => { if (active) setInitializing(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function profileSaved(result: CreateProfileResult) {
    await repositories.activeProfile.set(result.profile.id);
    await loadSession();
    setEditingProfile(undefined);
    setView('today');
    setDataRevision((value) => value + 1);
    setNotice(`${result.profile.name} está ativo. Metas atualizadas.`);
  }

  async function switchProfile(profileId: string) {
    const profile = await sessionService.switchTo(profileId);
    setActiveProfile(profile);
    setView('today');
    setDataRevision((value) => value + 1);
    setNotice(`Acompanhando ${profile.name}.`);
  }

  async function deleteProfile(profileId: string) {
    await deleteProfileService.execute(profileId);
    const session = await loadSession();
    setView(session.activeProfile ? 'profiles' : 'today');
    setNotice('Perfil e dados associados foram excluídos.');
  }

  async function quickWater(amountMl: number) {
    if (!activeProfile) return;
    await waterService.log(activeProfile.id, amountMl);
    setDataRevision((value) => value + 1);
    setNotice(`+${amountMl} ml registrado para ${activeProfile.name}.`);
  }

  if (initializing) return <div className="boot-screen"><span className="brand-mark">D</span><strong>DEFYN</strong><p>Abrindo seus dados locais…</p></div>;
  if (fatalError) return <div className="boot-screen error-state" role="alert"><span className="brand-mark">!</span><strong>Não foi possível iniciar</strong><p>{fatalError}</p><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>;
  if (profiles.length === 0 || !activeProfile) {
    return <ProfileSetup standalone onSaved={profileSaved} />;
  }

  const profileForEditor = editingProfile === 'new' ? undefined : editingProfile ?? activeProfile;
  return <AppShell
    profiles={profiles}
    activeProfile={activeProfile}
    view={editingProfile ? 'profile' : view}
    notice={notice}
    onNavigate={(next) => { setEditingProfile(undefined); setView(next); }}
    onSwitchProfile={(id) => void switchProfile(id)}
    onAddProfile={() => setEditingProfile('new')}
    onQuickWater={quickWater}
  >
    {editingProfile || view === 'profile' ? <ProfileSetup key={profileForEditor?.id ?? 'new-profile'} profile={profileForEditor} onSaved={profileSaved} onCancel={() => { setEditingProfile(undefined); setView('today'); }} /> : (
      <CurrentView
        view={view}
        activeProfile={activeProfile}
        profiles={profiles}
        revision={dataRevision}
        onNotice={setNotice}
        onSwitch={(id) => void switchProfile(id)}
        onEdit={(profile) => setEditingProfile(profile)}
        onAdd={() => setEditingProfile('new')}
        onDelete={deleteProfile}
        onRestored={async () => { await loadSession(); setDataRevision((value) => value + 1); setView('today'); setNotice('Backup restaurado.'); }}
        onChanged={() => setDataRevision((value) => value + 1)}
        onNavigate={setView}
      />
    )}
  </AppShell>;
}

interface CurrentViewProps {
  view: AppView;
  activeProfile: UserProfile;
  profiles: UserProfile[];
  revision: number;
  onNotice: (message: string) => void;
  onSwitch: (id: string) => void;
  onEdit: (profile: UserProfile) => void;
  onAdd: () => void;
  onDelete: (id: string) => Promise<void>;
  onRestored: () => Promise<void>;
  onChanged: () => void;
  onNavigate: (view: AppView) => void;
}

function CurrentView(props: CurrentViewProps) {
  if (props.view === 'today') return <TodayDashboard profileId={props.activeProfile.id} revision={props.revision} onNotice={props.onNotice} onNavigateTraining={() => props.onNavigate('training')} onNavigateDiary={() => props.onNavigate('diary')} onNavigateProgress={() => props.onNavigate('progress')} />;
  if (props.view === 'profiles') return <ProfileManager profiles={props.profiles} activeProfileId={props.activeProfile.id} onSwitch={props.onSwitch} onEdit={props.onEdit} onAdd={props.onAdd} onDelete={props.onDelete} />;
  if (props.view === 'backup') return <Suspense fallback={<ModuleFallback label="Abrindo backup" />}><BackupPanel onRestored={props.onRestored} /></Suspense>;
  if (props.view === 'diary') return <Suspense fallback={<ModuleFallback label="Abrindo diário" />}><DailyTrackingWorkspace profile={props.activeProfile} revision={props.revision} onChanged={props.onChanged} onNotice={props.onNotice} /></Suspense>;
  if (props.view === 'training') return <Suspense fallback={<ModuleFallback label="Abrindo treinos" />}><TrainingWorkspace profile={props.activeProfile} revision={props.revision} onChanged={props.onChanged} onNotice={props.onNotice} /></Suspense>;
  if (props.view === 'progress') return <Suspense fallback={<ModuleFallback label="Abrindo progresso" />}><ProgressWorkspace profile={props.activeProfile} revision={props.revision} onChanged={props.onChanged} onNotice={props.onNotice} onEditProfile={() => props.onEdit(props.activeProfile)} /></Suspense>;
  if (props.view === 'profile') return null;
  return null;
}
