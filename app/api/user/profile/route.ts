import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/config/db";
import { User } from "@/models/User";
import { Membership } from "@/models/Membership";
import { Organization } from "@/models/Organization";

async function canEditProfile(userId: string): Promise<boolean> {
  const memberships = await Membership.find({ user_id: userId });
  const orgIds = memberships.map((m: any) => m.organization_id);
  const orgs = await Organization.find({ _id: { $in: orgIds } });

  // User can edit if at least one org allows it
  return orgs.some((org: any) => org.settings?.allow_profile_edit === true);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    await connectDB();

    const user = await User.findById(userId).select("-password_hash");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const editable = await canEditProfile(userId);

    return NextResponse.json({
      user,
      canEditProfile: editable,
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    await connectDB();

    const editable = await canEditProfile(userId);
    if (!editable) {
      return NextResponse.json(
        { error: "Tu organización no permite editar el perfil" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, last_name, birth_date, blood_type, document_id } = body;

    const updateData: any = { $set: {}, $unset: {} };

    if (name) updateData.$set.name = name;
    if (last_name) updateData.$set.last_name = last_name;
    else if (last_name === "") updateData.$unset.last_name = 1;

    if (birth_date) updateData.$set.birth_date = birth_date;
    else if (birth_date === "") updateData.$unset.birth_date = 1;

    if (blood_type) updateData.$set.blood_type = blood_type;
    else if (blood_type === "") updateData.$unset.blood_type = 1;

    if (document_id) updateData.$set.document_id = document_id;
    else if (document_id === "") updateData.$unset.document_id = 1;

    // Clean up empty objects
    if (Object.keys(updateData.$set).length === 0) delete updateData.$set;
    if (Object.keys(updateData.$unset).length === 0) delete updateData.$unset;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password_hash");

    if (!updatedUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ message: "Perfil actualizado", user: updatedUser });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
