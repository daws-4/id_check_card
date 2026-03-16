import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const user = await User.findById(params.id).select('-password_hash');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, email, password, nfc_card_id } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (nfc_card_id) updateData.nfc_card_id = nfc_card_id;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(params.id, updateData, { new: true }).select('-password_hash');
    if (!updatedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ message: 'User updated', user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const deletedUser = await User.findByIdAndDelete(params.id).select('-password_hash');
    if (!deletedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ message: 'User deleted', user: deletedUser });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
