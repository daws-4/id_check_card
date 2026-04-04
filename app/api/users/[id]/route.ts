import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import { getPbAdmin } from '@/config/pocketbase';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = await User.findById(id).select('-password_hash');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const sessionUserRole = (session.user as any).role;

    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { name, last_name, email, password, has_nfc_card, birth_date, document_id, blood_type, user_type, emergency_contacts, insurance_info, residence_info, strict_schedule_enforcement, photo_url, status } = body;

    if (photo_url !== undefined && sessionUserRole !== 'superadmin') {
      return NextResponse.json({ error: 'Solo los superadmins pueden modificar fotografías de usuario' }, { status: 403 });
    }

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updateData: any = { $set: {}, $unset: {} };
    if (name) updateData.$set.name = name;
    if (last_name) updateData.$set.last_name = last_name;
    else if (last_name === "") updateData.$unset.last_name = 1;

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, role: user.role });
      if (existingUser) {
        return NextResponse.json({ error: 'El email ya está registrado para este rol' }, { status: 409 });
      }
      updateData.$set.email = email;
    }
    if (has_nfc_card !== undefined) updateData.$set.has_nfc_card = has_nfc_card;
    
    if (birth_date) updateData.$set.birth_date = birth_date;
    else if (birth_date === "") updateData.$unset.birth_date = 1;

    if (document_id) updateData.$set.document_id = document_id;
    else if (document_id === "") updateData.$unset.document_id = 1;

    if (blood_type) updateData.$set.blood_type = blood_type;
    else if (blood_type === "") updateData.$unset.blood_type = 1;

    if (user_type) updateData.$set.user_type = user_type;
    if (status) updateData.$set.status = status;
    if (strict_schedule_enforcement !== undefined) updateData.$set.strict_schedule_enforcement = strict_schedule_enforcement;
    if (photo_url !== undefined) {
      if (photo_url === "") updateData.$unset.photo_url = 1;
      else updateData.$set.photo_url = photo_url;
    }

    const currentUserType = user_type || user.user_type;
    const currentRole = user.role;

    if (currentRole === 'user' && currentUserType === 'student') {
      if (emergency_contacts !== undefined) {
        if (!Array.isArray(emergency_contacts) || emergency_contacts.length === 0) {
          return NextResponse.json({ error: 'Los contactos de emergencia son obligatorios para estudiantes' }, { status: 400 });
        }
        if (emergency_contacts.length > 3) {
          return NextResponse.json({ error: 'Máximo 3 contactos de emergencia' }, { status: 400 });
        }
        for (const contact of emergency_contacts) {
          if (!contact.name || !contact.phone || !contact.relationship) {
            return NextResponse.json({ error: 'Todos los campos del contacto de emergencia son obligatorios' }, { status: 400 });
          }
        }
        updateData.$set.emergency_contacts = emergency_contacts;
      }
      
      if (residence_info !== undefined) {
        if (!residence_info.address || !residence_info.city || !residence_info.state) {
          return NextResponse.json({ error: 'La información de residencia es obligatoria para estudiantes' }, { status: 400 });
        }
        updateData.$set.residence_info = residence_info;
      }
    } else {
      if (emergency_contacts !== undefined) {
        if (emergency_contacts === null || emergency_contacts.length === 0) updateData.$unset.emergency_contacts = 1;
        else updateData.$set.emergency_contacts = emergency_contacts;
      }
      if (residence_info !== undefined) {
        if (!residence_info) updateData.$unset.residence_info = 1;
        else updateData.$set.residence_info = residence_info;
      }
    }

    if (insurance_info !== undefined) {
       if (insurance_info === "") updateData.$unset.insurance_info = 1;
       else updateData.$set.insurance_info = insurance_info;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.$set.password_hash = await bcrypt.hash(password, salt);
    }
    
    // Clean up empty objects
    if (Object.keys(updateData.$set).length === 0) delete updateData.$set;
    if (Object.keys(updateData.$unset).length === 0) delete updateData.$unset;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { returnDocument: 'after' }).select('-password_hash');
    if (!updatedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ message: 'User updated', user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedUser = await User.findByIdAndDelete(id).select('-password_hash');
    if (!deletedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Attempt to delete photo in pocketbase
    try {
      if (deletedUser.photo_url) {
        const pb = await getPbAdmin();
        const existingRecord = await pb.collection('IDCHECKCARD_user_photos').getFirstListItem(`user_mongo_id="${id}"`);
        if (existingRecord) {
          await pb.collection('IDCHECKCARD_user_photos').delete(existingRecord.id);
        }
      }
    } catch (e: any) {
      console.log("[PocketBase cleanup] skipped/failed on user deletion:", e.message);
    }

    return NextResponse.json({ message: 'User deleted', user: deletedUser });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
