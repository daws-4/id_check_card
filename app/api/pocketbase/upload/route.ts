import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import { getPbAdmin, getPublicPbFileUrl } from '@/config/pocketbase';

/**
 * Upload a photo for a user to PocketBase and save the URL back to MongoDB.
 * 
 * POST /api/pocketbase/upload
 * Body: FormData with:
 *   - photo (File): The image file
 *   - user_id (string): MongoDB user _id
 *   - photo_type (string, optional): 'profile' | 'carnet_front' | 'carnet_back'
 *   - organization_id (string, optional): MongoDB org ID
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmins can upload photos
    const role = (session.user as any).role;
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Solo los super admins pueden modificar imágenes' }, { status: 403 });
    }

    const formData = await req.formData();
    const photo = formData.get('photo') as File;
    const userId = formData.get('user_id') as string;
    const photoType = (formData.get('photo_type') as string) || 'profile';
    const organizationId = (formData.get('organization_id') as string) || '';

    if (!photo || !userId) {
      return NextResponse.json({ error: 'photo and user_id are required' }, { status: 400 });
    }

    // Verify user exists in MongoDB
    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Upload photo to PocketBase
    const pb = await getPbAdmin();

    // Check if user already has a photo record of this type - update instead of creating duplicate
    let existingRecord = null;
    try {
      existingRecord = await pb.collection('user_photos').getFirstListItem(
        `user_mongo_id="${userId}"`
      );
    } catch {
      // No existing record found, will create new
    }

    const pbFormData = new FormData();
    pbFormData.append('user_mongo_id', userId);
    pbFormData.append('photo', photo);
    pbFormData.append('id', userId.substring(0, 15)); // Custom 15 character ID based on mongo _id

    let record;
    if (existingRecord) {
      // Update existing record
      record = await pb.collection('user_photos').update(existingRecord.id, pbFormData);
    } else {
      // Create new record
      record = await pb.collection('user_photos').create(pbFormData);
    }

    // Build the public URL and save to MongoDB user
    const photoUrl = getPublicPbFileUrl('user_photos', record.id, record['photo']);

    // Update user's photo_url in MongoDB if this is a profile photo
    if (photoType === 'profile') {
      await User.findByIdAndUpdate(userId, { photo_url: photoUrl });
    }

    return NextResponse.json({
      message: 'Photo uploaded successfully',
      photo_url: photoUrl,
      record_id: record.id,
      updated: !!existingRecord,
    });
  } catch (error: any) {
    console.error('[PocketBase Upload] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload photo' }, { status: 500 });
  }
}
