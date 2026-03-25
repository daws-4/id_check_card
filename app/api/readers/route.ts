import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Reader } from '@/models/Reader';

export async function GET(req: Request) {
  try {
    await connectDB();
    const readers = await Reader.find({}).populate('organization_id', 'name type').populate('group_id', 'name');
    return NextResponse.json(readers);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { esp32_id, organization_id, location, status, group_id } = body;

    if (!esp32_id || !organization_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingReader = await Reader.findOne({ esp32_id });
    if (existingReader) {
      return NextResponse.json({ error: 'esp32_id already exists' }, { status: 409 });
    }

    const newReader = await Reader.create({
      esp32_id,
      organization_id,
      group_id: group_id || undefined,
      location,
      status: status || 'active'
    });

    return NextResponse.json({ message: 'Reader created', reader: newReader }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
