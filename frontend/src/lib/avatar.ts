const SUPABASE_URL = (import.meta.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const AVATAR_BUCKET = import.meta.env.AVATAR_BUCKET ?? 'avatars';


const AVATAR_EXTENSION = 'webp';

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export function getAvatarUrl(
    userId: string,
    avatarUploaded: boolean,
    avatarVersion: number,
): string | null {
    if (!avatarUploaded || !SUPABASE_URL) {
        return null;
    }

    // ?v= busts the cache after a re-upload, since the filename itself
    // never changes.
    return `${SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${userId}.${AVATAR_EXTENSION}?v=${avatarVersion}`;
}