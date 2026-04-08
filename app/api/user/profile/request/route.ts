import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/config/db";
import { ProfileEditRequest } from "@/models/ProfileEditRequest";
import { Membership } from "@/models/Membership";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    await connectDB();

    const body = await req.json();
    const memberships = await Membership.find({ user_id: userId });
    
    if (memberships.length === 0) {
      return NextResponse.json({ error: "El usuario no pertenece a ninguna organización" }, { status: 400 });
    }

    // Initialize approvals mapping
    const approvals = new Map<string, boolean>();
    for (const m of memberships) {
      approvals.set(m.organization_id.toString(), false);
    }

    const { name, last_name, birth_date, blood_type, document_id } = body;
    const requested_changes = { name, last_name, birth_date, blood_type, document_id };

    // Check if there is an existing pending request
    const existing = await ProfileEditRequest.findOne({ user_id: userId, status: 'pending' });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una solicitud pendiente" }, { status: 400 });
    }

    const request = new ProfileEditRequest({
      user_id: userId,
      requested_changes,
      status: 'pending',
      approvals,
    });

    await request.save();

    return NextResponse.json({ message: "Solicitud enviada exitosamente", request }, { status: 201 });
  } catch (error) {
    console.error("Profile Request POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
