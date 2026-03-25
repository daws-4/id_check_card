import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/config/db";
import mongoose from "mongoose";
import { Task } from "@/models/Task";
import { TaskCompletion } from "@/models/TaskCompletion";
import { GroupMembership } from "@/models/GroupMembership";

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const { taskId } = await params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    await connectDB();

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // Verify user belongs to the task's group
    const membership = await GroupMembership.findOne({
      user_id: userId,
      group_id: task.group_id,
    });
    if (!membership) {
      return NextResponse.json(
        { error: "No perteneces al grupo de esta tarea" },
        { status: 403 }
      );
    }

    // Check if already completed
    const existing = await TaskCompletion.findOne({
      task_id: taskId,
      user_id: userId,
    });
    if (existing) {
      return NextResponse.json(
        { message: "Tarea ya marcada como completada", completion: existing },
        { status: 200 }
      );
    }

    const completion = await TaskCompletion.create({
      task_id: taskId,
      user_id: userId,
    });

    return NextResponse.json(
      { message: "Tarea completada", completion },
      { status: 201 }
    );
  } catch (error) {
    console.error("Task complete error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const { taskId } = await params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    await connectDB();

    const deleted = await TaskCompletion.findOneAndDelete({
      task_id: taskId,
      user_id: userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "No se encontró la completación" }, { status: 404 });
    }

    return NextResponse.json({ message: "Tarea desmarcada" });
  } catch (error) {
    console.error("Task uncomplete error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
