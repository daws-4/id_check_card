import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import { Group } from "@/models/Group";
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
    const group = await Group.findById(groupId).populate("organization_id", "name");

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const { name, type } = await req.json();

    if (!name && !type) {
      return NextResponse.json({ error: "Provide at least name or type to update" }, { status: 400 });
    }

    await connectDB();
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: { ...(name && { name }), ...(type && { type }) } },
      { new: true }
    );

    if (!updatedGroup) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    await connectDB();
    const deletedGroup = await Group.findByIdAndDelete(groupId);

    if (!deletedGroup) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    // Note: cascade deletion of tasks/schedules/memberships should ideally happen here 
    // or via mongoose pre hooks, but we'll stick to deleting the group for now.

    return NextResponse.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
