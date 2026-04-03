"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  ShieldX,
  Heart,
  Phone,
  Building2,
  Droplets,
  User as UserIcon,
  AlertCircle,
  FileText,
} from "lucide-react";

interface VerifyData {
  user: {
    name: string;
    last_name: string;
    photo_url: string | null;
    blood_type: string | null;
    document_id: string | null;
    user_type: string;
    status: string;
    emergency_contacts: { name: string; phone: string; relationship: string }[];
    insurance_info: string | null;
  };
  organization: {
    name: string;
    type: string;
  };
  verified: boolean;
  verified_at: string;
}

export default function VerifyProfilePage() {
  const params = useParams();
  const orgId = params?.orgId as string;
  const userId = params?.userId as string;

  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !userId) return;
    fetch(`/api/verify/${orgId}/${userId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al verificar");
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orgId, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Verificando identidad...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center">
          <ShieldX className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-300">Verificación Fallida</h1>
          <p className="text-red-200/70 mt-2 text-sm">{error || "No se pudo verificar este carnet"}</p>
        </div>
      </div>
    );
  }

  const { user, organization, verified, verified_at } = data;
  const fullName = `${user.name} ${user.last_name}`.trim();
  const verifiedDate = new Date(verified_at);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Status Banner */}
        <div
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-t-2xl text-sm font-semibold ${
            verified
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
          }`}
        >
          {verified ? (
            <>
              <ShieldCheck className="w-5 h-5" />
              USUARIO VERIFICADO
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5" />
              CUENTA PENDIENTE
            </>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-b-2xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-teal-600/30 to-blue-600/30 p-6 text-center">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 mx-auto flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4 overflow-hidden">
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {user.name.charAt(0)}
                  {user.last_name?.charAt(0) || ""}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{fullName}</h1>
            {user.document_id && (
              <p className="text-slate-300 text-sm mt-1 font-mono">
                C.I: {user.document_id}
              </p>
            )}
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                user.user_type === "student"
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-purple-500/20 text-purple-300"
              }`}
            >
              {user.user_type === "student" ? "Estudiante" : "Trabajador"}
            </span>
          </div>

          {/* Organization */}
          <div className="px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="bg-teal-500/10 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Organización</p>
                <p className="text-white font-semibold">{organization.name}</p>
              </div>
            </div>
          </div>

          {/* Blood Type */}
          {user.blood_type && (
            <div className="px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/10 p-2 rounded-lg">
                  <Droplets className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Tipo de Sangre</p>
                  <p className="text-white font-bold text-lg">{user.blood_type}</p>
                </div>
              </div>
            </div>
          )}

          {/* Insurance Info */}
          {user.insurance_info && (
            <div className="px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Seguro</p>
                  <p className="text-white text-sm">{user.insurance_info}</p>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contacts */}
          {user.emergency_contacts.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                Contactos de Emergencia
              </h3>
              <div className="space-y-3">
                {user.emergency_contacts.map((contact, i) => (
                  <a
                    key={i}
                    href={`tel:${contact.phone}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <UserIcon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{contact.name}</p>
                        <p className="text-slate-500 text-xs">{contact.relationship}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-teal-400">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-mono">{contact.phone}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 text-center">
            <p className="text-slate-600 text-xs">
              Verificado el{" "}
              {verifiedDate.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-teal-500/60 text-[10px] mt-1 uppercase tracking-widest font-semibold">
              Secure Pass NFC • Id_CheckCard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
