import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getPbAdmin } from '@/config/pocketbase';

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Solo los super admins pueden eliminar imágenes' }, { status: 403 });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const pb = await getPbAdmin();
    
    try {
      const existingRecord = await pb.collection('IDCHECKCARD_user_photos').getFirstListItem(
        `user_mongo_id="${user_id}"`
      );
      
      if (existingRecord) {
        await pb.collection('IDCHECKCARD_user_photos').delete(existingRecord.id);
      }
    } catch (err: any) {
      console.log("[PocketBase] No record found to delete or error:", err.message);
      // We don't fail here if it doesn't exist in PB, maybe it was already deleted natively
    }

    return NextResponse.json({ message: 'Photo deleted from Pocketbase successfully' });
  } catch (error: any) {
    console.error('[PocketBase Delete] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete photo from pocketbase' }, { status: 500 });
  }
}
