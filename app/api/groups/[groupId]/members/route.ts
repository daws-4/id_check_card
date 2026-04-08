import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import { GroupMembership } from "@/models/GroupMembership";
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
    const members = await GroupMembership.find({ group_id: groupId }).populate("user_id", "name email nfc_card_id");

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching group members:", error);
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

    const { user_id, role } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
    }

    await connectDB();

    // Validate user_type matches group type
    const { Group } = await import("@/models/Group");
    const { User } = await import("@/models/User");
    
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const requiredType = group.type === 'work' ? 'worker' : 'student';
    if (user.user_type && user.user_type !== requiredType) {
      const groupLabel = group.type === 'work' ? 'trabajo' : 'estudio';
      const userLabel = user.user_type === 'worker' ? 'trabajador' : 'estudiante';
      return NextResponse.json({ 
        error: `No se puede agregar un ${userLabel} a un grupo de ${groupLabel}` 
      }, { status: 400 });
    }

    // Check if member already exists
    const existing = await GroupMembership.findOne({ group_id: groupId, user_id });
    if (existing) {
      return NextResponse.json({ error: "User is already a member of this group" }, { status: 400 });
    }

    const newMembership = await GroupMembership.create({
      group_id: groupId,
      user_id,
      role: role || 'member'
    });

    const populatedMembership = await newMembership.populate("user_id", "name email nfc_card_id");

    return NextResponse.json(populatedMembership, { status: 201 });
  } catch (error) {
    if ((error as any).code === 11000) {
      return NextResponse.json({ error: "User already in group" }, { status: 400 });
    }
    console.error("Error adding member to group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
    }

    await connectDB();
    const deleted = await GroupMembership.findOneAndDelete({ group_id: groupId, user_id });

    if (!deleted) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

    return NextResponse.json({ message: "Member removed from group successfully" });
  } catch (error) {
    console.error("Error removing group member:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
