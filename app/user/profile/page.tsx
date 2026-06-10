"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Select, SelectItem } from "@heroui/select";
import { UserCircle, Save, Lock, Shield } from "lucide-react";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Utilidad para comprimir imágenes en el cliente usando HTML5 Canvas
const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto Canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Error al convertir a Blob"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isRequestMode, setIsRequestMode] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [documentId, setDocumentId] = useState("");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setCanEdit(data.canEditProfile);
        setHasPendingRequest(data.hasPendingRequest);
        // Populate form
        setName(data.user.name || "");
        setLastName(data.user.last_name || "");
        setBirthDate(
          data.user.birth_date
            ? new Date(data.user.birth_date).toISOString().split("T")[0]
            : ""
        );
        setBloodType(data.user.blood_type || "");
        setDocumentId(data.user.document_id || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMB = file.size / (1024 * 1024);

    // 1. Validar límite duro de 5MB
    if (sizeInMB > 5) {
      setMessage({ 
        type: "error", 
        text: `El archivo excede el tamaño máximo de 5MB (${sizeInMB.toFixed(2)} MB). Por favor, sube una imagen más ligera.` 
      });
      return;
    }

    setUploadingPhoto(true);
    setMessage(null);

    let fileToUpload: File | Blob = file;

    // 2. Si pesa más de 3MB y menos de 5MB, comprimir en el cliente
    if (sizeInMB > 3) {
      try {
        setMessage({ type: "success", text: "Comprimiendo imagen en la plataforma..." });
        fileToUpload = await compressImage(file);
        console.log(`Imagen comprimida con éxito. Nuevo tamaño estimado: ${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB`);
      } catch (err) {
        console.error("Error al comprimir en el cliente:", err);
        // Si falla, procedemos con el original ya que pesa menos de 5MB
      }
    }

    const formData = new FormData();
    formData.append("file", fileToUpload, file.name);
    formData.append("type", "profile");
    formData.append("id", user._id);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok) {
        setUser((prev: any) => ({ ...prev, photo_url: result.url }));
        setMessage({ type: "success", text: "Foto de perfil actualizada correctamente" });
      } else {
        setMessage({ type: "error", text: result.error || "Error al subir la foto" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error al conectar con el servidor" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const url = isRequestMode ? "/api/user/profile/request" : "/api/user/profile";
      const method = isRequestMode ? "POST" : "PUT";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          last_name: lastName,
          birth_date: birthDate || "",
          blood_type: bloodType,
          document_id: documentId,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        if (isRequestMode) {
          setMessage({ type: "success", text: "Solicitud de edición enviada exitosamente" });
          setHasPendingRequest(true);
          setIsRequestMode(false);
        } else {
          setMessage({ type: "success", text: "Perfil actualizado exitosamente" });
          setUser(result.user);
        }
      } else {
        setMessage({ type: "error", text: result.error || "Error al actualizar" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center text-gray-500 mt-20">Error al cargar perfil</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-carbon-black)]">Mi Perfil</h1>
        <p className="text-gray-500 mt-1">Tu información personal</p>
      </div>

      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-[var(--color-electric-sapphire)] to-[var(--color-tropical-teal)] shadow-lg border-none text-white">
        <CardBody className="p-6 flex flex-row items-center gap-5">
          <div className="relative group w-20 h-20 flex-shrink-0 flex items-center justify-center">
            {uploadingPhoto ? (
              <div className="bg-white/20 rounded-full w-full h-full flex items-center justify-center">
                <Spinner size="md" color="white" />
              </div>
            ) : user.photo_url ? (
              <img
                src={user.photo_url}
                alt="Foto de perfil"
                className="w-full h-full rounded-full object-cover border-2 border-white/40 shadow-inner"
              />
            ) : (
              <div className="bg-white/20 rounded-full p-4 w-full h-full flex items-center justify-center">
                <UserCircle className="w-12 h-12 text-white" />
              </div>
            )}
            
            {(canEdit || isRequestMode) && !uploadingPhoto && (
              <label className="absolute inset-0 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-[10px] text-white font-semibold text-center px-1">Cambiar</span>
                <input type="file" accept="image/*" className="hidden cursor-pointer" onChange={handlePhotoChange} />
              </label>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {user.name} {user.last_name || ""}
            </h2>
            <p className="text-white/80 text-sm">{user.email}</p>
            <div className="flex gap-2 mt-2">
              <Chip size="sm" variant="flat" className="bg-white/20 text-white">
                {user.role === "user" ? "Usuario" : user.role}
              </Chip>
              {user.has_nfc_card && (
                <Chip size="sm" variant="flat" className="bg-white/20 text-white" startContent={<Shield className="w-3 h-3" />}>
                  Tarjeta NFC
                </Chip>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Edit Permission Notice */}
      {hasPendingRequest && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Solicitud en proceso</p>
            <p className="text-xs">
              Tienes una solicitud de actualización de perfil pendiente de aprobación por los administradores.
            </p>
          </div>
        </div>
      )}

      {!canEdit && !hasPendingRequest && !isRequestMode && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <Lock className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">Edición restringida</p>
            <p className="text-xs">
              Tu organización no permite editar tu información personal. Puedes solicitar a un administrador que la cambie.
            </p>
          </div>
          <Button size="sm" color="warning" variant="flat" onPress={() => setIsRequestMode(true)}>
            Solicitar Edición
          </Button>
        </div>
      )}
      
      {!canEdit && !hasPendingRequest && isRequestMode && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200 text-primary-800 justify-between">
           <div>
             <p className="font-medium text-sm">Modo de Solicitud</p>
             <p className="text-xs">Edita los campos que desees y luego envía la solicitud para su aprobación.</p>
           </div>
           <Button size="sm" color="default" variant="flat" onPress={() => { setIsRequestMode(false); setMessage(null); }}>
             Cancelar
           </Button>
        </div>
      )}

      {/* Profile Form */}
      <Card className="bg-white shadow-md border-none">
        <CardHeader className="px-6 pt-5 pb-0">
          <h3 className="text-lg font-bold">Información Personal</h3>
        </CardHeader>
        <CardBody className="px-6 py-5 space-y-5">
          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Correo Electrónico"
              value={user.email}
              isReadOnly
              variant="bordered"
              classNames={{
                inputWrapper: "border-gray-200 bg-gray-50",
                input: "text-gray-500",
              }}
              description="No editable"
            />
            <Input
              label="Rol"
              value={user.role === "user" ? "Usuario" : user.role}
              isReadOnly
              variant="bordered"
              classNames={{
                inputWrapper: "border-gray-200 bg-gray-50",
                input: "text-gray-500",
              }}
              description="No editable"
            />
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={name}
              onValueChange={setName}
              isReadOnly={!canEdit && !isRequestMode}
              variant="bordered"
              classNames={
                canEdit || isRequestMode
                  ? {
                      inputWrapper:
                        "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
                    }
                  : { inputWrapper: "border-gray-200 bg-gray-50", input: "text-gray-500" }
              }
            />
            <Input
              label="Apellido"
              value={lastName}
              onValueChange={setLastName}
              isReadOnly={!canEdit && !isRequestMode}
              variant="bordered"
              classNames={
                canEdit || isRequestMode
                  ? {
                      inputWrapper:
                        "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
                    }
                  : { inputWrapper: "border-gray-200 bg-gray-50", input: "text-gray-500" }
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={birthDate}
              onValueChange={setBirthDate}
              isReadOnly={!canEdit && !isRequestMode}
              variant="bordered"
              classNames={
                canEdit || isRequestMode
                  ? {
                      inputWrapper:
                        "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
                    }
                  : { inputWrapper: "border-gray-200 bg-gray-50", input: "text-gray-500" }
              }
            />
            <Input
              label="Cédula / Documento"
              value={documentId}
              onValueChange={setDocumentId}
              isReadOnly={!canEdit && !isRequestMode}
              variant="bordered"
              classNames={
                canEdit || isRequestMode
                  ? {
                      inputWrapper:
                        "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
                    }
                  : { inputWrapper: "border-gray-200 bg-gray-50", input: "text-gray-500" }
              }
            />
          </div>

          {canEdit || isRequestMode ? (
            <Select
              label="Tipo de Sangre"
              selectedKeys={bloodType ? new Set([bloodType]) : new Set()}
              onSelectionChange={(keys) => {
                const arr = Array.from(keys) as string[];
                setBloodType(arr[0] || "");
              }}
              variant="bordered"
              classNames={{
                trigger:
                  "border-[var(--color-maya-blue)]/50 focus-within:border-[var(--color-maya-blue)]",
              }}
            >
              {BLOOD_TYPES.map((bt) => (
                <SelectItem key={bt}>{bt}</SelectItem>
              ))}
            </Select>
          ) : (
            <Input
              label="Tipo de Sangre"
              value={bloodType || "—"}
              isReadOnly
              variant="bordered"
              classNames={{
                inputWrapper: "border-gray-200 bg-gray-50",
                input: "text-gray-500",
              }}
            />
          )}

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm text-center ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Save Button */}
          {(canEdit || isRequestMode) && !hasPendingRequest && (
            <Button
              color="primary"
              className="w-full bg-gradient-to-r from-[var(--color-electric-sapphire)] to-[var(--color-tropical-teal)] text-white shadow-lg text-md font-medium"
              size="lg"
              isLoading={saving}
              onPress={handleSave}
              startContent={!saving && <Save className="w-4 h-4" />}
            >
              {isRequestMode ? "Enviar Solicitud de Actualización" : "Guardar Cambios"}
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
