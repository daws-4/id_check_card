import PocketBase from 'pocketbase';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://images.enlaredve.com';

/**
 * PocketBase client singleton for server-side usage.
 * Used for file storage (user photos, org logos, etc.)
 * 
 * For client-side usage, import getPublicPbFileUrl() to build URLs.
 */

// Server-side authenticated client (cached)
let _pbAdmin: PocketBase | null = null;

export async function getPbAdmin(): Promise<PocketBase> {
  if (_pbAdmin && _pbAdmin.authStore.isValid) {
    return _pbAdmin;
  }

  _pbAdmin = new PocketBase(PB_URL);
  
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASS;

  if (!email || !password) {
    throw new Error('PB_ADMIN_EMAIL and PB_ADMIN_PASS must be set in environment variables');
  }

  await _pbAdmin.collection('_superusers').authWithPassword(email, password);
  return _pbAdmin;
}

/**
 * Build a public URL to access a PocketBase file.
 * Format: {PB_URL}/api/files/{collectionId}/{recordId}/{filename}
 */
export function getPublicPbFileUrl(
  collectionIdOrName: string,
  recordId: string,
  filename: string,
  thumb?: string // e.g. "200x200" for thumbnails
): string {
  let url = `${PB_URL}/api/files/${collectionIdOrName}/${recordId}/${filename}`;
  if (thumb) url += `?thumb=${thumb}`;
  return url;
}

/**
 * Public PocketBase client (no auth, for read-only public collections).
 */
export function getPublicPb(): PocketBase {
  return new PocketBase(PB_URL);
}

export { PB_URL };
