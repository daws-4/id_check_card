import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import { Task } from "@/models/Task";
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
    const tasks = await Task.find({ group_id: groupId }).sort({ createdAt: -1 });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching group tasks:", error);
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
    const { title, description, due_date, is_recurring, recurrence } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await connectDB();
    
    const taskData: any = { group_id: groupId, title, description, is_recurring: !!is_recurring };
    if (due_date) {
      taskData.due_date = new Date(due_date);
    }
    if (is_recurring && recurrence) {
      taskData.recurrence = recurrence;
    }

    const newTask = await Task.create(taskData);

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");

    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: "Invalid task_id" }, { status: 400 });
    }

    await connectDB();
    const deleted = await Task.findByIdAndDelete(taskId);

    if (!deleted) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
