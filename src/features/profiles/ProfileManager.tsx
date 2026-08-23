import { useState } from 'react';
import type { UserProfile } from '../../domain/profile/profile';
import { ProfileAvatar } from './ProfileAvatar';
import './profile-manager.css';

interface ProfileManagerProps {
  profiles: UserProfile[];
  activeProfileId: string;
  onSwitch: (id: string) => void;
  onEdit: (profile: UserProfile) => void;
  onAdd: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function ProfileManager({ profiles, activeProfileId, onSwitch, onEdit, onAdd, onDelete }: ProfileManagerProps) {
  const [pendingDelete, setPendingDelete] = useState<UserProfile>();
  const [deleting, setDeleting] = useState(false);
  return <div className="profiles-page page-container">
    <header className="section-page-header"><div><span className="page-eyebrow">Perfis locais</span><h1>Pessoas neste dispositivo</h1><p>Ficha, metas, diário, água e progresso permanecem separados por pessoa.</p></div><button className="page-primary-button" type="button" onClick={onAdd}>+ Adicionar pessoa</button></header>
    <div className="profile-list">{profiles.map((profile) => <article key={profile.id} className={profile.id === activeProfileId ? 'active' : ''}>
      <ProfileAvatar profile={profile} className="large-avatar" size="lg" />
      <div className="profile-card-copy"><div><h2>{profile.name}</h2>{profile.id === activeProfileId && <span>Perfil ativo</span>}</div><p>{goalLabel(profile.goal)} · {profile.currentWeightKg.toLocaleString('pt-BR')} kg · {profile.metabolicMethod === 'mifflin-st-jeor' ? 'Mifflin' : 'Harris–Benedict'}</p></div>
      <div className="profile-card-actions">{profile.id !== activeProfileId && <button type="button" onClick={() => onSwitch(profile.id)}>Usar perfil</button>}<button type="button" onClick={() => onEdit(profile)}>Editar ficha</button><button className="danger-text" type="button" onClick={() => setPendingDelete(profile)}>Excluir</button></div>
    </article>)}</div>
    <button className="add-profile-card" type="button" onClick={onAdd}><span>+</span><div><strong>Adicionar outra pessoa</strong><small>Crie metas e acompanhamento independentes.</small></div></button>
    {pendingDelete && <div className="modal-backdrop"><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><span className="danger-mark">!</span><h2 id="delete-title">Excluir {pendingDelete.name}?</h2><p>Isso removerá definitivamente metas, resumos diários, água, treinos, pesagens, medidas e progresso desta pessoa. Dados legados compartilhados permanecem preservados.</p><div><button type="button" onClick={() => setPendingDelete(undefined)} disabled={deleting}>Cancelar</button><button className="danger-button" type="button" disabled={deleting} onClick={async () => { setDeleting(true); await onDelete(pendingDelete.id); setDeleting(false); setPendingDelete(undefined); }}>{deleting ? 'Excluindo…' : 'Sim, excluir perfil'}</button></div></section></div>}
  </div>;
}

function goalLabel(goal: UserProfile['goal']): string {
  return goal === 'fat-loss' ? 'Definição' : goal === 'weight-gain' ? 'Ganho' : goal === 'maintenance' ? 'Manutenção' : 'Meta personalizada';
}
