import { useEffect, useState } from 'react';
import type { UserProfile } from '../../domain/profile/profile';
import { profileInitials } from '../../shared/profile-initials';
import { repositories } from '../../infrastructure/repositories';
import { MEDIA_CACHED_EVENT, MEDIA_NEEDED_EVENT } from '../../application/media/media-events';

export function ProfileAvatar({ profile, className = '', size = 'md', decorative = false }: { profile: UserProfile; className?: string; size?: 'sm' | 'md' | 'lg'; decorative?: boolean }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let url = ''; let active = true;
    if (!profile.avatarMediaId) { queueMicrotask(() => { if (active) setSource(''); }); return () => { active = false; }; }
    const load = () => repositories.media.getById(profile.avatarMediaId!).then((media) => {
      if (!active) return;
      if (!media) { window.dispatchEvent(new CustomEvent(MEDIA_NEEDED_EVENT, { detail: { mediaId: profile.avatarMediaId } })); return; }
      url = URL.createObjectURL(media.blob); setSource(url);
    });
    const cached = (event: Event) => { if ((event as CustomEvent<{mediaId?:string}>).detail?.mediaId === profile.avatarMediaId) void load(); };
    window.addEventListener(MEDIA_CACHED_EVENT, cached);
    void load();
    return () => { active = false; window.removeEventListener(MEDIA_CACHED_EVENT, cached); if (url) URL.revokeObjectURL(url); };
  }, [profile.avatarMediaId]);
  const fallback = profileInitials(profile.name);
  return <span className={`profile-avatar-core profile-avatar--${size} ${className}`.trim()} aria-label={decorative ? undefined : `Foto de ${profile.name}`} aria-hidden={decorative || undefined}>{source ? <img src={source} alt="" onError={() => setSource('')} /> : <span aria-hidden="true">{fallback}</span>}</span>;
}
