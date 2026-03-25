import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import { Group } from "@/models/Group";
import connectDB from "@/config/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organization_id = searchParams.get("organization_id");

    if (!organization_id || !mongoose.Types.ObjectId.isValid(organization_id)) {
      return NextResponse.json({ error: "Invalid or missing organization_id" }, { status: 400 });
    }

    await connectDB();
    const groups = await Group.find({ organization_id }).sort({ createdAt: -1 });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { organization_id, name, type } = body;

    if (!organization_id || !mongoose.Types.ObjectId.isValid(organization_id)) {
      return NextResponse.json({ error: "Invalid organization_id" }, { status: 400 });
    }

    if (!name || (type !== "study" && type !== "work")) {
      return NextResponse.json({ error: "Name and valid type (study/work) are required" }, { status: 400 });
    }

    await connectDB();
    const newGroup = await Group.create({ organization_id, name, type });

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
