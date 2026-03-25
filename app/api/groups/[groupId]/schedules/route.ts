import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import { Schedule } from "@/models/Schedule";
import connectDB from "@/config/db";

export async function GET(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    await connectDB();
    const schedules = await Schedule.find({ group_id: groupId });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching group schedules:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const body = await req.json();
    const { title, start_time, end_time, days_of_week } = body;

    if (!title || !start_time || !end_time || !Array.isArray(days_of_week)) {
      return NextResponse.json({ error: "Missing required schedule fields" }, { status: 400 });
    }

    await connectDB();

    const newSchedule = await Schedule.create({
      group_id: groupId,
      title,
      start_time,
      end_time,
      days_of_week, // Expecting array 0 (Sun) to 6 (Sat)
    });

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get("schedule_id");

    if (!scheduleId || !mongoose.Types.ObjectId.isValid(scheduleId)) {
      return NextResponse.json({ error: "Invalid schedule_id" }, { status: 400 });
    }

    await connectDB();
    const deleted = await Schedule.findByIdAndDelete(scheduleId);

    if (!deleted) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

    return NextResponse.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
