import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import connectDB from "@/config/db";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sesión
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Extraer FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // 'profile' | 'logo'
    const id = formData.get("id") as string | null;     // ID del usuario o de la organización

    if (!file || !type || !id) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (file, type, id)" }, { status: 400 });
    }

    // 3. Validar tipo MIME
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP, SVG)." },
        { status: 400 }
      );
    }

    // 4. Validar tamaño máximo (5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: "El archivo excede el tamaño máximo permitido de 5MB" },
        { status: 400 }
      );
    }

    // 5. Convertir a Buffer para subir a S3/R2
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Obtener la extensión del archivo
    let extension = "jpg";
    if (file.type === "image/png") extension = "png";
    else if (file.type === "image/webp") extension = "webp";
    else if (file.type === "image/svg+xml") extension = "svg";

    const timestamp = Date.now();
    const filename = `${id}_${timestamp}.${extension}`;

    let key = "";
    let publicUrl = "";

    await connectDB();

    // 6. Subir según tipo
    if (type === "profile") {
      // Validar permisos: el superadmin puede editar a cualquiera, un usuario normal solo a sí mismo, y un org_admin a miembros de sus organizaciones
      const sessionUser = session.user as any;
      let hasPermission = sessionUser.role === "superadmin" || sessionUser.id === id;

      if (!hasPermission && sessionUser.role === "org_admin") {
        const userOrgs = sessionUser.orgs || [];
        const { Membership } = require("@/models/Membership");
        const membership = await Membership.findOne({
          user_id: id,
          organization_id: { $in: userOrgs }
        });
        if (membership) {
          hasPermission = true;
        }
      }

      if (!hasPermission) {
        return NextResponse.json({ error: "No tienes permiso para actualizar esta foto de perfil" }, { status: 403 });
      }

      const user = await User.findById(id);
      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      // Eliminar foto anterior si existía
      if (user.photo_url) {
        try {
          await deleteFromR2(user.photo_url);
        } catch (err) {
          console.error("Error al borrar foto anterior en R2:", err);
        }
      }

      key = `profiles/${filename}`;
      publicUrl = await uploadToR2(buffer, key, file.type);

      // Actualizar en base de datos
      user.photo_url = publicUrl;
      await user.save();

    } else if (type === "logo") {
      // Validar permisos: el superadmin puede editar cualquier organización, un org_admin debe pertenecer a ella
      const sessionUser = session.user as any;
      const userOrgs = sessionUser.orgs || [];
      
      if (sessionUser.role !== "superadmin" && !userOrgs.includes(id)) {
        return NextResponse.json({ error: "No tienes permiso para actualizar el logotipo de esta organización" }, { status: 403 });
      }

      const organization = await Organization.findById(id);
      if (!organization) {
        return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
      }

      // Eliminar logotipo anterior si existía
      if (organization.logo_url) {
        try {
          await deleteFromR2(organization.logo_url);
        } catch (err) {
          console.error("Error al borrar logo anterior en R2:", err);
        }
      }

      key = `logos/${filename}`;
      publicUrl = await uploadToR2(buffer, key, file.type);

      // Actualizar en base de datos
      organization.logo_url = publicUrl;
      await organization.save();

    } else {
      return NextResponse.json({ error: "Tipo de subida no válido" }, { status: 400 });
    }

    return NextResponse.json({
      message: "Imagen subida y actualizada con éxito",
      url: publicUrl,
    });

  } catch (error: any) {
    console.error("R2 UPLOAD ROUTE ERROR:", error);
    return NextResponse.json({ error: "Error interno en el servidor", details: error.message }, { status: 500 });
  }
}
