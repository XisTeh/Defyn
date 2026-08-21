import { useEffect, useState } from 'react';
import type { UserProfile } from '../../domain/profile/profile';
import { profileInitials } from '../../shared/profile-initials';
import { repositories } from '../../infrastructure/repositories';

export function ProfileAvatar({ profile, className = '', size = 'md', decorative = false }: { profile: UserProfile; className?: string; size?: 'sm' | 'md' | 'lg'; decorative?: boolean }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let url = ''; let active = true;
    if (!profile.avatarMediaId) { queueMicrotask(() => { if (active) setSource(''); }); return () => { active = false; }; }
    repositories.media.getById(profile.avatarMediaId).then((media) => {
      if (!active || !media) return;
      url = URL.createObjectURL(media.blob); setSource(url);
    });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [profile.avatarMediaId]);
  const fallback = profileInitials(profile.name);
  return <span className={`profile-avatar-core profile-avatar--${size} ${className}`.trim()} aria-label={decorative ? undefined : `Foto de ${profile.name}`} aria-hidden={decorative || undefined}>{source ? <img src={source} alt="" onError={() => setSource('')} /> : <span aria-hidden="true">{fallback}</span>}</span>;
}
