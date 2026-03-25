import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';

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
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { name, last_name, email, password, has_nfc_card, birth_date, document_id, blood_type } = body;

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

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.$set.password_hash = await bcrypt.hash(password, salt);
    }
    
    // Clean up empty objects
    if (Object.keys(updateData.$set).length === 0) delete updateData.$set;
    if (Object.keys(updateData.$unset).length === 0) delete updateData.$unset;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password_hash');
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

    return NextResponse.json({ message: 'User deleted', user: deletedUser });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
