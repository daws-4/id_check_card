import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getPbAdmin } from '@/config/pocketbase';

/**
 * PocketBase Collection Setup Endpoint.
 * 
 * Creates the `user_photos` collection in PocketBase if it doesn't exist.
 * Only superadmins can call this endpoint.
 * 
 * Collection: user_photos
 *   - mongo_user_id (text, required): The MongoDB _id of the user
 *   - photo (file, required): The photo file (jpg, png, webp)
 *   - photo_type (text): 'profile' | 'carnet_front' | 'carnet_back'
 *   - organization_id (text): MongoDB org ID for context
 * 
 * POST /api/pocketbase/setup
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmins can perform this action' }, { status: 403 });
    }

    const pb = await getPbAdmin();

    // Check if collection already exists
    try {
      await pb.collections.getOne('user_photos');
      return NextResponse.json({ message: 'Collection "user_photos" already exists', created: false });
    } catch {
      // Collection doesn't exist, create it
    }

    const collection = await pb.collections.create({
      name: 'user_photos',
      type: 'base',
      listRule: '',    // Public read access (for QR profile viewing)
      viewRule: '',    // Public view access
      createRule: null, // Only via superuser auth (server-side)
      updateRule: null, // Only via superuser auth (server-side)
      deleteRule: null, // Only via superuser auth (server-side)
      fields: [
        {
          name: 'mongo_user_id',
          type: 'text',
          required: true,
        },
        {
          name: 'photo',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
        },
        {
          name: 'photo_type',
          type: 'text',
          required: false,
        },
        {
          name: 'organization_id',
          type: 'text',
          required: false,
        },
      ],
    });

    return NextResponse.json({
      message: 'Collection "user_photos" created successfully',
      created: true,
      collection_id: collection.id,
    });
  } catch (error: any) {
    console.error('[PocketBase Setup] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to setup PocketBase' }, { status: 500 });
  }
}
