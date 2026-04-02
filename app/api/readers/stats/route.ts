import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { AttendanceLog } from '@/models/AttendanceLog';
import { Reader } from '@/models/Reader';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const organization_id = searchParams.get('organization_id');

    if (!organization_id) {
      return NextResponse.json({ error: 'organization_id is required' }, { status: 400 });
    }

    await connectDB();

    // Get all readers for this org
    const readers = await Reader.find({ organization_id });
    const readerIds = readers.map((r: any) => r._id);

    // Get today's start
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Aggregate total counts and today counts per reader
    const [totalCounts, todayCounts, lastReadings] = await Promise.all([
      AttendanceLog.aggregate([
        { $match: { reader_id: { $in: readerIds } } },
        { $group: { _id: '$reader_id', count: { $sum: 1 } } },
      ]),
      AttendanceLog.aggregate([
        { $match: { reader_id: { $in: readerIds }, timestamp: { $gte: todayStart } } },
        { $group: { _id: '$reader_id', count: { $sum: 1 } } },
      ]),
      AttendanceLog.aggregate([
        { $match: { reader_id: { $in: readerIds } } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$reader_id', lastTimestamp: { $first: '$timestamp' } } },
      ]),
    ]);

    // Build a map: readerId -> { total, today, lastReading }
    const statsMap: Record<string, { total: number; today: number; lastReading: string | null }> = {};
    for (const r of readers) {
      const rid = (r as any)._id.toString();
      statsMap[rid] = { total: 0, today: 0, lastReading: null };
    }
    for (const tc of totalCounts) {
      statsMap[tc._id.toString()] = { ...statsMap[tc._id.toString()], total: tc.count };
    }
    for (const tc of todayCounts) {
      statsMap[tc._id.toString()] = { ...statsMap[tc._id.toString()], today: tc.count };
    }
    for (const lr of lastReadings) {
      statsMap[lr._id.toString()] = { ...statsMap[lr._id.toString()], lastReading: lr.lastTimestamp };
    }

    return NextResponse.json(statsMap);
  } catch (error: any) {
    console.error('Error fetching reader stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
