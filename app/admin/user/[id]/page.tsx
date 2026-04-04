"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, Tab } from "@heroui/tabs";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Switch } from "@heroui/switch";
import { Spinner } from "@heroui/spinner";
import { ArrowLeft, User as UserIcon, Contact, Activity, QrCode, ExternalLink, Building2, Copy, Check, HeartPulse, ShieldAlert, Upload, Trash2, CreditCard, ZoomIn, Mail, Key, ShieldCheck } from "lucide-react";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isPwdOpen, onOpen: onPwdOpen, onOpenChange: onPwdOpenChange } = useDisclosure();
  const [zoom, setZoom] = useState(1);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [copiedOrgId, setCopiedOrgId] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    email: "",
    document_id: "",
    birth_date: "",
    blood_type: "",
    nfc_card_id: "",
    has_nfc_card: false,
    role: "normal",
    status: "pending",
    user_type: "worker",
    photo_url: "",
    insurance_info: "",
    residence_info: { address: "", city: "", state: "" },
    emergency_contacts: [
      { name: "", phone: "", relationship: "" }
    ]
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, logRes, membRes, sessionRes] = await Promise.all([
        fetch(`/api/users/${id}`),
        fetch(`/api/attendance?user_id=${id}`),
        fetch(`/api/memberships?user_id=${id}`),
        fetch(`/api/auth/session`)
      ]);
      
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData?.user) {
          setSessionRole((sessionData.user as any).role);
        }
      }

      if (userRes.ok) {
        const u = await userRes.json();
        setUser(u);
        setFormData({
          name: u.name || "",
          last_name: u.last_name || "",
          email: u.email || "",
          document_id: u.document_id || "",
          birth_date: u.birth_date ? new Date(u.birth_date).toISOString().split('T')[0] : "",
          blood_type: u.blood_type || "",
          nfc_card_id: u.nfc_card_id || "",
          has_nfc_card: !!u.has_nfc_card,
          role: u.role || "normal",
          status: u.status || "pending",
          user_type: u.user_type || "worker",
          photo_url: u.photo_url || "",
          insurance_info: u.insurance_info || "",
          residence_info: u.residence_info || { address: "", city: "", state: "" },
          emergency_contacts: u.emergency_contacts?.length > 0 ? u.emergency_contacts : [{ name: "", phone: "", relationship: "" }]
        });
      }
      
      if (logRes.ok) setLogs(await logRes.json());
      if (membRes.ok) setMemberships(await membRes.json());
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("user_id", id);
      form.append("photo_type", "profile");

      const res = await fetch("/api/pocketbase/upload", {
        method: "POST",
        body: form,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, photo_url: data.photo_url });
        alert("Foto actualizada y vinculada correctamente en Pocketbase");
        fetchData(); // Refrescar para ver datos actualizados
      } else {
        const err = await res.json();
        alert(err.error || "Error al subir fotografía");
      }
    } catch (err) {
      console.error("Error capturando foto", err);
      alert("Error subiendo foto");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleResendInvite = async () => {
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });

      if (res.ok) {
        alert("Invitación reenviada exitosamente a " + user.email);
      } else {
        const err = await res.json();
        alert(err.error || "Error al reenviar invitación");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al reenviar");
    } finally {
      setIsResending(false);
    }
  };

  const handlePasswordChange = async (onClose: () => void) => {
    if (!newPassword) return alert("Ingresa una contraseña");
    setIsChangingPwd(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          targetUserId: id, 
          newPassword: newPassword 
        }),
      });

      if (res.ok) {
        alert("Contraseña actualizada correctamente");
        setNewPassword("");
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Error al actualizar contraseña");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("¿Seguro que deseas eliminar la foto de este usuario?")) return;
    setSaving(true);
    try {
      // 1. First, attempt to delete from PocketBase
      await fetch("/api/pocketbase/photo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: id }),
      });

      // 2. Then remove from MongoDB
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_url: "" }),
      });
      if (res.ok) {
        setFormData({ ...formData, photo_url: "" });
        // alert("Foto eliminada correctamente");
      } else {
        const err = await res.json();
        alert(err.error || "Error al eliminar la foto de mongo");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const payload: any = { ...formData };
      
      // Limpiar contactos vacíos
      if (payload.emergency_contacts) {
        payload.emergency_contacts = payload.emergency_contacts.filter((c: any) => c.name || c.phone || c.relationship);
      }
      
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert("Usuario actualizado correctamente");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Error al actualizar");
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const getVerifyUrl = (orgId: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/verify/${orgId}/${id}`;
  };

  const handleCopyLink = (orgId: string) => {
    navigator.clipboard.writeText(getVerifyUrl(orgId));
    setCopiedOrgId(orgId);
    setTimeout(() => setCopiedOrgId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-gray-500 text-center py-12">Usuario no encontrado.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1a1b1e] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-default-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-2 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-electric-sapphire)]/10 text-[var(--color-electric-sapphire)] flex items-center justify-center font-bold text-xl">
              {user.name?.substring(0, 2).toUpperCase() || <UserIcon />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-carbon-black)] dark:text-white leading-tight">
                {user.name} {user.last_name || ""}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 font-mono">{user.email}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                  user.role === 'superadmin' ? 'bg-[var(--color-tropical-teal)]/20 text-[var(--color-tropical-teal)]' : 
                  user.role === 'org_admin' ? 'bg-[var(--color-maya-blue)]/20 text-[var(--color-maya-blue)]' : 
                  'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400'
                }`}>
                  {user.role}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                  user.status === 'active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                }`}>
                  {user.status || 'pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.status !== 'active' && (
            <Button
              variant="flat"
              color="warning"
              onPress={handleResendInvite}
              isLoading={isResending}
              startContent={<Mail className="w-4 h-4" />}
              className="font-semibold px-4"
            >
              Reenviar Invitación
            </Button>
          )}
          <Button 
            color="primary" 
            onPress={handleUpdate} 
            isLoading={saving}
            className="bg-[var(--color-maya-blue)] shadow-md shadow-[var(--color-maya-blue)]/20 font-semibold px-6"
          >
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        aria-label="Opciones de usuario" 
        color="primary" 
        variant="underlined"
        classNames={{
          tabList: "gap-6 w-full relative rounded-none p-0 mx-2 border-b border-divider",
          cursor: "w-full bg-[var(--color-electric-sapphire)]",
          tab: "max-w-fit px-2 h-12 data-[selected=true]:text-[var(--color-electric-sapphire)]",
          tabContent: "group-data-[selected=true]:font-bold"
        }}
      >
        <Tab key="info" title={<div className="flex items-center gap-2"><Contact className="w-4 h-4"/><span>Información</span></div>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <Card className="shadow-sm border border-gray-100 dark:border-default-100 bg-white dark:bg-[#1a1b1e]">
              <CardBody className="p-6 space-y-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-divider pb-2 mb-4">Datos Personales</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Nombre" variant="bordered" value={formData.name} onValueChange={(v) => setFormData({...formData, name: v})} />
                  <Input label="Apellidos" variant="bordered" value={formData.last_name} onValueChange={(v) => setFormData({...formData, last_name: v})} />
                </div>
                <Input label="Correo Electrónico" type="email" variant="bordered" value={formData.email} onValueChange={(v) => setFormData({...formData, email: v})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Cédula/Documento" variant="bordered" value={formData.document_id} onValueChange={(v) => setFormData({...formData, document_id: v})} />
                  <Input label="Fecha de Nacimiento" type="date" variant="bordered" value={formData.birth_date} onValueChange={(v) => setFormData({...formData, birth_date: v})} />
                </div>
                <Select label="Grupo Sanguíneo" variant="bordered" selectedKeys={[formData.blood_type]} onChange={(e) => setFormData({...formData, blood_type: e.target.value})}>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bt => <SelectItem key={bt}>{bt}</SelectItem>)}
                </Select>
              </CardBody>
            </Card>

            {sessionRole === 'superadmin' && (
              <Card className="shadow-sm border border-gray-100 dark:border-default-100 bg-white dark:bg-[#1a1b1e]">
                <CardBody className="p-6 space-y-4">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-divider pb-2 mb-4">Fotografía Facial</h4>
                  <div className="flex flex-col gap-3">
                    {formData.photo_url ? (
                      <div className="relative group mx-auto mb-2">
                        <div className="w-32 h-32 rounded-xl overflow-hidden border border-divider shadow-inner bg-default-50 flex items-center justify-center cursor-pointer" onClick={() => { setZoom(1); onOpen(); }}>
                           <img src={formData.photo_url} alt="Foto" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        </div>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          className="absolute bottom-1 right-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white backdrop-blur-md border border-white/20"
                          onPress={() => { setZoom(1); onOpen(); }}
                        >
                          <ZoomIn className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    ) : (
                    <div className="w-32 h-32 rounded-xl border border-dashed border-divider mx-auto mb-2 flex flex-col items-center justify-center text-gray-400 bg-default-50/50">
                      <UserIcon className="w-8 h-8 mb-1 opacity-50" />
                      <span className="text-xs font-medium">Sin foto</span>
                    </div>
                  )}

                  <div className="flex gap-2 w-full">
                    <Button 
                      color="primary" 
                      variant="flat"
                      isLoading={isUploadingPhoto} 
                      className="relative overflow-hidden w-full flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {formData.photo_url ? "Reemplazar" : "Subir a Pocketbase"}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhoto}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[0]" 
                      />
                    </Button>

                    {formData.photo_url && (
                      <Button
                        isIconOnly
                        color="danger"
                        variant="flat"
                        onPress={handleRemovePhoto}
                        isLoading={saving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
            )}
            <Card className="shadow-sm border border-gray-100 dark:border-default-100 bg-white dark:bg-[#1a1b1e] md:col-span-2">
              <CardBody className="p-6 space-y-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-divider pb-2 mb-4">Configuración Avanzada</h4>
                
                <Select label="Rol de Sistema" variant="bordered" selectedKeys={[formData.role]} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                  <SelectItem key="user">Usuario Estándar</SelectItem>
                  <SelectItem key="org_admin">Administrador de Org</SelectItem>
                  <SelectItem key="superadmin">Superadmin Global</SelectItem>
                </Select>

                <Select label="Tipo de Perfil" variant="bordered" selectedKeys={[formData.user_type]} onChange={(e) => setFormData({...formData, user_type: e.target.value})}>
                  <SelectItem key="worker">Trabajador</SelectItem>
                  <SelectItem key="student">Estudiante</SelectItem>
                </Select>

                <Select label="Estado de Cuenta" variant="bordered" selectedKeys={[formData.status]} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <SelectItem key="active">Activo</SelectItem>
                  <SelectItem key="pending">Pendiente (Requiere Invitación)</SelectItem>
                  <SelectItem key="suspended">Suspendido</SelectItem>
                </Select>

                <div className="p-4 bg-[var(--color-electric-sapphire)]/5 dark:bg-default-50 rounded-xl mt-4 border border-[var(--color-electric-sapphire)]/20 dark:border-default-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--color-electric-sapphire)]/10 rounded-lg text-[var(--color-electric-sapphire)]">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tarjeta NFC Física</h5>
                      <p className="text-xs text-gray-500 dark:text-default-400">Indica si el usuario tiene una tarjeta vinculada</p>
                    </div>
                  </div>
                  <Switch 
                    isSelected={formData.has_nfc_card} 
                    onValueChange={(v) => setFormData({...formData, has_nfc_card: v})}
                    color="primary"
                    size="sm"
                  />
                </div>

                {sessionRole === 'superadmin' && (
                  <div className="mt-6 pt-6 border-t border-divider">
                    <Button
                      color="danger"
                      variant="light"
                      startContent={<Key className="w-4 h-4" />}
                      className="font-semibold"
                      onPress={onPwdOpen}
                    >
                      Restablecer Contraseña del Usuario
                    </Button>
                    <p className="text-[10px] text-gray-400 mt-2">
                       Acción administrativa. No requiere la contraseña actual del usuario.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Modal de Vista Ampliada */}
            <Modal 
              isOpen={isOpen} 
              onOpenChange={onOpenChange}
              size="4xl"
              scrollBehavior="inside"
              backdrop="blur"
              classNames={{
                base: "bg-transparent shadow-none",
                closeButton: "bg-white/10 hover:bg-white/20 text-white p-2 text-xl z-50 fixed",
              }}
            >
              <ModalContent>
                {(onClose) => (
                  <ModalBody className="p-0 flex flex-col items-center justify-center overflow-hidden h-[85vh] relative">
                    {/* Controles de Zoom Flotantes */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 bg-black/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
                       <Button isIconOnly size="sm" variant="light" className="text-white hover:bg-white/10" onPress={() => setZoom(prev => Math.max(1, prev - 0.5))}> - </Button>
                       <div className="w-16 text-center">
                        <span className="text-white text-[10px] font-bold tracking-wider uppercase opacity-80">Zoom</span>
                        <div className="text-white text-xs font-mono leading-none">{(zoom * 100).toFixed(0)}%</div>
                       </div>
                       <Button isIconOnly size="sm" variant="light" className="text-white hover:bg-white/10" onPress={() => setZoom(prev => Math.min(4, prev + 0.5))}> + </Button>
                       <div className="w-[1px] h-4 bg-white/20 mx-1"></div>
                       <Button size="sm" variant="light" className="text-white text-xs font-semibold px-3 hover:bg-white/10" onPress={() => setZoom(1)}> Reset </Button>
                    </div>

                    <div className="w-full h-full overflow-auto flex items-start justify-center p-4 md:p-12 custom-scrollbar scroll-smooth">
                      <div className="min-w-full min-h-full flex items-center justify-center">
                        <img 
                          src={formData.photo_url} 
                          alt="Usuario Ampliado" 
                          style={{ 
                            transform: `scale(${zoom})`, 
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transformOrigin: 'center center'
                          }}
                          className="max-w-full h-auto shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl border border-white/5"
                        />
                      </div>
                    </div>
                  </ModalBody>
                )}
              </ModalContent>
            </Modal>

            {/* Modal para Cambiar Contraseña (Administrador) */}
            <Modal 
              isOpen={isPwdOpen} 
              onOpenChange={onPwdOpenChange}
              backdrop="blur"
            >
              <ModalContent>
                {(onClose) => (
                  <>
                    <ModalHeader className="flex flex-col gap-1 items-center pb-2">
                      <div className="p-3 bg-danger/10 rounded-full text-danger mb-2">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold">Cambiar Contraseña</h3>
                      <p className="text-xs text-default-500 font-normal">Establece una nueva clave para {user.name}</p>
                    </ModalHeader>
                    <ModalBody className="py-4">
                      <Input
                        label="Nueva Contraseña"
                        type="password"
                        variant="bordered"
                        placeholder="Ingresa la nueva clave"
                        value={newPassword}
                        onValueChange={setNewPassword}
                        description="Mínimo 8 caracteres, una mayúscula y un número."
                      />
                    </ModalBody>
                    <ModalFooter>
                      <Button variant="flat" onPress={onClose}>Cancelar</Button>
                      <Button 
                        color="danger" 
                        onPress={() => handlePasswordChange(onClose)}
                        isLoading={isChangingPwd}
                      >
                        Actualizar Clave
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>
          </div>
        </Tab>

        <Tab key="health" title={<div className="flex items-center gap-2"><HeartPulse className="w-4 h-4"/><span>Perfil Médico & Residencia</span></div>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <Card className="shadow-sm border border-gray-100 dark:border-default-100 bg-white dark:bg-[#1a1b1e]">
              <CardBody className="p-6 space-y-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-divider pb-2 flex items-center justify-between">
                  <span>Contactos de Emergencia</span>
                  <Button 
                    size="sm" 
                    variant="flat" 
                    color="primary" 
                    isDisabled={formData.emergency_contacts.length >= 3}
                    onPress={() => setFormData({...formData, emergency_contacts: [...formData.emergency_contacts, {name:'', phone:'', relationship:''}]})}
                  >
                    Añadir
                  </Button>
                </h4>
                {formData.emergency_contacts.map((contact, idx) => (
                  <div key={idx} className="border border-divider rounded-xl p-4 bg-default-50 relative">
                    <div className="absolute top-2 right-2">
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => {
                        const newContacts = [...formData.emergency_contacts];
                        newContacts.splice(idx, 1);
                        setFormData({...formData, emergency_contacts: newContacts});
                      }}><ShieldAlert className="w-4 h-4"/></Button>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Input label="Nombre del contacto" size="sm" variant="faded" value={contact.name} onValueChange={(v) => {
                        const arr = [...formData.emergency_contacts];
                        arr[idx].name = v;
                        setFormData({...formData, emergency_contacts: arr});
                      }} />
                      <div className="flex gap-2">
                        <Input label="Teléfono" size="sm" variant="faded" value={contact.phone} onValueChange={(v) => {
                          const arr = [...formData.emergency_contacts];
                          arr[idx].phone = v;
                          setFormData({...formData, emergency_contacts: arr});
                        }} />
                        <Input label="Parentesco" size="sm" variant="faded" value={contact.relationship} onValueChange={(v) => {
                          const arr = [...formData.emergency_contacts];
                          arr[idx].relationship = v;
                          setFormData({...formData, emergency_contacts: arr});
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.emergency_contacts.length === 0 && <p className="text-sm text-gray-500">No hay contactos de emergencia.</p>}
              </CardBody>
            </Card>

            <div className="flex flex-col gap-5">
              <Card className="shadow-sm border border-gray-100 dark:border-default-100 bg-white dark:bg-[#1a1b1e]">
                <CardBody className="p-6 space-y-4">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-divider pb-2 mb-2">Información Médica</h4>
                  <Input label="Seguro Médico / Póliza (Opcional)" variant="bordered" placeholder="Ej: Seguros Caracas #1234" value={formData.insurance_info} onValueChange={(v) => setFormData({...formData, insurance_info: v})} />
                </CardBody>
              </Card>

              <Card className="shadow-sm border border-gray-100 dark:border-default-100 bg-white dark:bg-[#1a1b1e]">
                <CardBody className="p-6 space-y-4">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-divider pb-2 mb-2">Información de Residencia</h4>
                  <Input label="Dirección (Avenida, Calle, Nro)" variant="bordered" value={formData.residence_info.address} onValueChange={(v) => setFormData({...formData, residence_info: {...formData.residence_info, address: v}})} />
                  <div className="flex gap-4">
                    <Input label="Ciudad" variant="bordered" value={formData.residence_info.city} onValueChange={(v) => setFormData({...formData, residence_info: {...formData.residence_info, city: v}})} />
                    <Input label="Estado/Provincia" variant="bordered" value={formData.residence_info.state} onValueChange={(v) => setFormData({...formData, residence_info: {...formData.residence_info, state: v}})} />
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </Tab>

        <Tab key="activity" title={<div className="flex items-center gap-2"><Activity className="w-4 h-4"/><span>Asistencias</span></div>}>
          <Card className="shadow-sm border border-gray-100 dark:border-default-100 mt-4 bg-white dark:bg-[#1a1b1e]">
            <CardBody className="p-0">
              {logs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>No se registran asistencias para este usuario.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-lavender-mist)]/50 dark:bg-default-50 border-b border-gray-100 dark:border-default-100">
                        <th className="py-3 px-5 text-xs font-bold text-gray-500 uppercase">Fecha y Hora</th>
                        <th className="py-3 px-5 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                        <th className="py-3 px-5 text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="py-3 px-5 text-xs font-bold text-gray-500 uppercase">Lector</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-default-100">
                      {logs.map((log: any) => (
                        <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-default-100 transition-colors">
                          <td className="py-3 px-5 text-sm dark:text-gray-300">
                            {new Date(log.timestamp).toLocaleString("es-VE")}
                          </td>
                          <td className="py-3 px-5">
                            <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-md border ${
                              log.type === 'entrada' ? 'bg-[var(--color-electric-sapphire)]/10 text-[var(--color-electric-sapphire)] border-[var(--color-electric-sapphire)]/20' : 'bg-orange-100 text-orange-600 border-orange-200'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="py-3 px-5">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              log.status === 'on_time' ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              {log.status === 'on_time' ? 'A Tiempo' : log.status}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-sm text-gray-500">
                            {log.reader_id?.location || log.reader_id?.esp32_id || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>

        <Tab key="qr" title={<div className="flex items-center gap-2"><QrCode className="w-4 h-4"/><span>Perfil QR</span></div>}>
          <Card className="shadow-sm border border-gray-100 dark:border-default-100 mt-4 bg-white dark:bg-[#1a1b1e]">
            <CardBody className="p-6">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-divider pb-2 mb-5">
                Enlaces de Verificación Pública (QR)
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Cada enlace es único por organización. Al escanearlo, cualquier persona puede verificar la identidad del usuario, su tipo de sangre, contactos de emergencia y estado de membresía — <strong>sin necesidad de iniciar sesión</strong>.
              </p>

              {memberships.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Este usuario no pertenece a ninguna organización.</p>
                  <p className="text-xs mt-1">Asígnalo a una organización para generar su enlace QR.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {memberships.map((m: any) => {
                    const org = m.organization_id;
                    const orgId = typeof org === "object" ? org._id : org;
                    const orgName = typeof org === "object" ? org.name : orgId;
                    const url = getVerifyUrl(orgId);
                    const isCopied = copiedOrgId === orgId;

                    return (
                      <div key={orgId} className="p-4 rounded-xl bg-gradient-to-r from-[var(--color-electric-sapphire)]/5 to-[var(--color-tropical-teal)]/5 dark:from-[var(--color-electric-sapphire)]/10 dark:to-[var(--color-tropical-teal)]/10 border border-[var(--color-electric-sapphire)]/15 dark:border-default-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[var(--color-electric-sapphire)]" />
                            <span className="font-semibold text-sm text-[var(--color-carbon-black)] dark:text-white">{orgName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyLink(orgId)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                isCopied
                                  ? "bg-success/20 text-success"
                                  : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                              }`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {isCopied ? "¡Copiado!" : "Copiar"}
                            </button>
                            <Link
                              href={`/verify/${orgId}/${id}`}
                              target="_blank"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-electric-sapphire)] text-white hover:opacity-90 transition-opacity"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Abrir
                            </Link>
                          </div>
                        </div>
                        <code className="block w-full text-xs bg-white/60 dark:bg-black/30 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 font-mono break-all select-all">
                          {url}
                        </code>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}
