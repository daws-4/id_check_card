import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Reader } from '@/models/Reader';

const TAG = '[Readers API]';

function elapsed(start: number): string {
  return `${(Date.now() - start).toFixed(0)}ms`;
}

export async function GET(req: Request) {
  const reqStart = Date.now();
  console.log(`${TAG} ────── GET START ──────`);
  try {
    const { searchParams } = new URL(req.url);
    const organization_id = searchParams.get('organization_id');
    console.log(`${TAG} GET params: organization_id=${organization_id}`);

    const dbStart = Date.now();
    await connectDB();
    console.log(`${TAG} GET DB connected (${elapsed(dbStart)})`);

    const query = organization_id ? { organization_id } : {};
    console.log(`${TAG} GET query:`, JSON.stringify(query));

    const queryStart = Date.now();
    const readers = await Reader.find(query).populate('organization_id', 'name type').populate('group_id', 'name');
    console.log(`${TAG} GET found ${readers.length} readers (${elapsed(queryStart)})`);

    console.log(`${TAG} ────── GET END (${elapsed(reqStart)}) 200 ──────`);
    return NextResponse.json(readers);
  } catch (error: any) {
    console.error(`${TAG} ────── GET ERROR (${elapsed(reqStart)}) ──────`);
    console.error(`${TAG} GET Error name: ${error.name}`);
    console.error(`${TAG} GET Error message: ${error.message}`);
    console.error(`${TAG} GET Error stack:`, error.stack);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const reqStart = Date.now();
  console.log(`${TAG} ────── POST START ──────`);
  try {
    const dbStart = Date.now();
    await connectDB();
    console.log(`${TAG} POST DB connected (${elapsed(dbStart)})`);

    const body = await req.json();
    console.log(`${TAG} POST body:`, JSON.stringify(body));
    const { esp32_id, organization_id, location, status, group_id } = body;

    if (!esp32_id || !organization_id) {
      console.warn(`${TAG} POST 400 — Missing fields: esp32_id=${esp32_id}, organization_id=${organization_id}`);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const checkStart = Date.now();
    const existingReader = await Reader.findOne({ esp32_id });
    console.log(`${TAG} POST duplicate check for esp32_id="${esp32_id}" (${elapsed(checkStart)}):`, existingReader ? `EXISTS → id=${existingReader._id}` : 'OK (unique)');
    if (existingReader) {
      console.warn(`${TAG} POST 409 — esp32_id="${esp32_id}" already exists`);
      return NextResponse.json({ error: 'esp32_id already exists' }, { status: 409 });
    }

    const createStart = Date.now();
    const newReader = await Reader.create({
      esp32_id,
      organization_id,
      group_id: group_id || undefined,
      location,
      status: status || 'active'
    });
    console.log(`${TAG} POST reader created (${elapsed(createStart)}): id=${newReader._id}, esp32_id=${newReader.esp32_id}`);

    console.log(`${TAG} ────── POST END (${elapsed(reqStart)}) 201 ──────`);
    return NextResponse.json({ message: 'Reader created', reader: newReader }, { status: 201 });
  } catch (error: any) {
    console.error(`${TAG} ────── POST ERROR (${elapsed(reqStart)}) ──────`);
    console.error(`${TAG} POST Error name: ${error.name}`);
    console.error(`${TAG} POST Error message: ${error.message}`);
    console.error(`${TAG} POST Error stack:`, error.stack);
    if (error.errors) {
      console.error(`${TAG} POST Validation errors:`, JSON.stringify(error.errors, null, 2));
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
