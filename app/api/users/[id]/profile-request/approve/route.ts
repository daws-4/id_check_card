import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/config/db";
import { ProfileEditRequest } from "@/models/ProfileEditRequest";
import { User } from "@/models/User";
import { Membership } from "@/models/Membership";
import mongoose from "mongoose";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organization_id");
    const action = searchParams.get("action"); // 'approve' or 'reject'

    if (!orgId || !action) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await connectDB();

    const request = await ProfileEditRequest.findOne({ user_id: id, status: 'pending' });
    if (!request) {
      return NextResponse.json({ error: "No pending request found" }, { status: 404 });
    }

    if (action === "reject") {
      request.status = 'rejected';
      await request.save();
      return NextResponse.json({ message: "Solicitud rechazada" });
    }

    if (action === "approve") {
      request.approvals.set(orgId, true);
      
      // Check if all are true
      let allApproved = true;
      request.approvals.forEach((val: boolean) => {
        if (val !== true) {
          allApproved = false;
        }
      });

      if (allApproved) {
        request.status = 'approved';
        
        // Apply changes
        const changes = request.requested_changes;
        const updateData: any = { $set: {}, $unset: {} };
        
        if (changes.name) updateData.$set.name = changes.name;
        if (changes.last_name) updateData.$set.last_name = changes.last_name;
        else if (changes.last_name === "") updateData.$unset.last_name = 1;
        
        if (changes.birth_date) updateData.$set.birth_date = changes.birth_date;
        else if (changes.birth_date === "") updateData.$unset.birth_date = 1;
        
        if (changes.blood_type) updateData.$set.blood_type = changes.blood_type;
        else if (changes.blood_type === "") updateData.$unset.blood_type = 1;
        
        if (changes.document_id) updateData.$set.document_id = changes.document_id;
        else if (changes.document_id === "") updateData.$unset.document_id = 1;

        if (Object.keys(updateData.$set).length === 0) delete updateData.$set;
        if (Object.keys(updateData.$unset).length === 0) delete updateData.$unset;

        await User.findByIdAndUpdate(id, updateData);
      }
      
      await request.save();
      return NextResponse.json({ message: "Aprobación registrada", status: request.status });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("ProfileRequest POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
