import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    await connectDB();
    const users = await User.find({}).select('-password_hash');
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, email, password, nfc_card_id } = body;

    if (!name || !email || !password || !nfc_card_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { nfc_card_id }] });
    if (existingUser) {
      return NextResponse.json({ error: 'Email or nfc_card_id already exists' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password_hash,
      nfc_card_id
    });

    const userObj = newUser.toObject();
    delete (userObj as any).password_hash;

    return NextResponse.json({ message: 'User created', user: userObj }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
