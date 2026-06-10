"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { ArrowLeft, Save, ShieldAlert, FileText, CheckCircle2, AlertTriangle, Layers, DollarSign, Cpu, Users, Trash2, ZoomIn, Eye } from "lucide-react";

interface Organization {
  _id: string;
  name: string;
  type: string;
  tax_id?: string;
  billing_plan?: string;
  billing_rates?: {
    cost_per_active_user: number;
    cost_per_active_reader: number;
    currency: string;
  };
  subscription_tier?: number;
  max_users_limit?: number;
}

function getClientLimitForTier(type: string, tier: number): number {
  const t = type.toLowerCase();
  if (t === 'gym' || t === 'membership_venue') {
    if (tier === 1) return 50;
    if (tier === 2) return 150;
    if (tier === 3) return 300;
    return 500;
  } else if (t === 'school' || t === 'university') {
    if (tier === 1) return 100;
    if (tier === 2) return 250;
    if (tier === 3) return 500;
    return 1000;
  } else {
    if (tier === 1) return 30;
    if (tier === 2) return 100;
    if (tier === 3) return 250;
    return 500;
  }
}

interface BillingPreview {
  organization_id: string;
  organization_name: string;
  organization_type: string;
  active_users_count: number;
  active_readers_count: number;
  cost_per_user: number;
  cost_per_reader: number;
  subtotal_users: number;
  subtotal_readers: number;
  total: number;
  currency: string;
}

interface Invoice {
  _id: string;
  period_start: string;
  period_end: string;
  active_users_count: number;
  active_readers_count: number;
  total_amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  createdAt: string;
}

const orgTypesTranslations: Record<string, string> = {
  company: "Empresa",
  school: "Escuela",
  membership_venue: "Local con Membresía (Gimnasios, Academias, Coworkings)",
  university: "Universidad",
  hospital: "Hospital / Clínica",
  factory: "Fábrica / Industria",
  coworking: "Espacio de Coworking (Legacy)",
  residential: "Conjunto Residencial",
  club: "Club Deportivo",
  event: "Evento / Conferencia",
  government: "Entidad Institucional / Gob",
  ngo: "ONG / Fundación",
  library: "Biblioteca",
  gym: "Gimnasio (Legacy)",
  other: "Otro"
};

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isOpen: isZoomOpen, onOpen: onZoomOpen, onOpenChange: onZoomOpenChange } = useDisclosure();
  const [zoom, setZoom] = useState(1);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState("company");
  const [taxId, setTaxId] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [billingPlan, setBillingPlan] = useState("none");
  const [costPerUser, setCostPerUser] = useState("");
  const [costPerReader, setCostPerReader] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [subscriptionTier, setSubscriptionTier] = useState("1");
  const [maxUsersLimit, setMaxUsersLimit] = useState("50");

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch org details
      const orgRes = await fetch(`/api/organizations/${id}`);
      if (!orgRes.ok) {
        if (orgRes.status === 404) {
          alert("Organización no encontrada");
          router.push("/admin/organizations");
          return;
        }
        throw new Error("Failed to fetch organization");
      }
      const orgData = await orgRes.json();
      setOrg(orgData);

      // Populate form
      setName(orgData.name);
      setType(orgData.type);
      setTaxId(orgData.tax_id ? orgData.tax_id.replace(/^J-/, '') : "");
      setLogoUrl(orgData.logo_url || "");
      setBillingPlan(orgData.billing_plan || "none");
      setCostPerUser(orgData.billing_rates?.cost_per_active_user?.toString() || "");
      setCostPerReader(orgData.billing_rates?.cost_per_active_reader?.toString() || "");
      setCurrency(orgData.billing_rates?.currency || "USD");
      setSubscriptionTier(orgData.subscription_tier?.toString() || "1");
      setMaxUsersLimit(orgData.max_users_limit?.toString() || "50");

      // Fetch usage preview
      const previewRes = await fetch(`/api/billing/preview/${id}`);
      if (previewRes.ok) {
        const previewData = await previewRes.json();
        setPreview(previewData);
      }

      // Fetch invoices
      const invoicesRes = await fetch(`/api/billing/invoices?orgId=${id}`);
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.invoices || []);
      }
    } catch (err) {
      console.error("Error loading organization data", err);
    } finally {
      setLoading(false);
    }
  };

// Utilidad para comprimir logotipos en el cliente
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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMB = file.size / (1024 * 1024);

    // 1. Validar límite duro de 5MB
    if (sizeInMB > 5) {
      alert(`El archivo excede el tamaño máximo permitido de 5MB (${sizeInMB.toFixed(2)} MB). Por favor, selecciona un archivo más ligero.`);
      return;
    }

    setUploadingLogo(true);
    
    let fileToUpload: File | Blob = file;

    // 2. Si pesa más de 3MB y menos de 5MB, comprimir
    if (sizeInMB > 3) {
      try {
        console.log("Comprimiendo logotipo en el cliente...");
        fileToUpload = await compressImage(file);
        console.log(`Logotipo comprimido. Nuevo tamaño estimado: ${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB`);
      } catch (err) {
        console.error("Error al comprimir logotipo:", err);
      }
    }

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload, file.name);
      formData.append("type", "logo");
      formData.append("id", id);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok) {
        setLogoUrl(result.url);
        alert("Logotipo actualizado correctamente");
      } else {
        alert(`Error al subir el logotipo: ${result.error}`);
      }
    } catch (err) {
      console.error("Error al subir logotipo:", err);
      alert("Error de conexión al subir el logotipo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("¿Seguro que deseas eliminar el logotipo de esta organización?")) return;
    setUploadingLogo(true);
    try {
      const res = await fetch(`/api/organizations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: "" }),
      });
      if (res.ok) {
        setLogoUrl("");
        alert("Logotipo eliminado correctamente");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Error al eliminar el logotipo");
      }
    } catch (err) {
      console.error("Error al eliminar logotipo:", err);
      alert("Error de red");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/organizations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          tax_id: taxId ? `J-${taxId}` : undefined,
          logo_url: logoUrl || undefined,
          billing_plan: billingPlan,
          billing_rates: billingPlan === "custom" ? {
            cost_per_active_user: parseFloat(costPerUser) || 0,
            cost_per_active_reader: parseFloat(costPerReader) || 0,
            currency: currency
          } : undefined,
          subscription_tier: parseInt(subscriptionTier) || 1,
          max_users_limit: parseInt(maxUsersLimit) || 50
        })
      });

      if (res.ok) {
        alert("Organización guardada con éxito");
        fetchData();
      } else {
        const errData = await res.json();
        alert(`Error al guardar: ${errData.error || "Desconocido"}`);
      }
    } catch (error) {
      console.error("Error saving organization", error);
      alert("Ocurrió un error al intentar guardar.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500 text-sm">Cargando detalles de organización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 dark:border-default-100 pb-6">
        <div>
          <Link 
            href="/admin/organizations" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-[var(--color-tropical-teal)] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Volver a Organizaciones
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-[var(--color-carbon-black)] dark:text-white">
              {org?.name}
            </h1>
            <span className="bg-[var(--color-lavender-mist)]/80 dark:bg-default-100 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-200/50 font-medium">
              ID: {id}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            color="primary" 
            startContent={<Save className="w-4 h-4" />} 
            onClick={handleSave} 
            isLoading={saving}
            className="bg-[var(--color-electric-sapphire)] hover:bg-[var(--color-tropical-teal)] text-white px-6 py-2.5 rounded-xl font-medium cursor-pointer transition-all"
          >
            Guardar Configuración
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Editor Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Data Card */}
          <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl p-6 border border-gray-100 dark:border-default-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 dark:border-default-50 pb-4">
              <Layers className="w-5 h-5 text-[var(--color-tropical-teal)]" />
              <h2 className="text-lg font-bold text-[var(--color-carbon-black)] dark:text-white">Datos Generales</h2>
            </div>
            
            {/* Carga del Logotipo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6 bg-gray-50 dark:bg-zinc-800/20 p-5 rounded-xl border border-gray-100 dark:border-zinc-800">
              <div className="relative group w-24 h-24 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                {uploadingLogo ? (
                  <Spinner size="md" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logotipo" className="w-full h-full object-contain p-2 cursor-pointer" onClick={() => { setZoom(1); onZoomOpen(); }} />
                ) : (
                  <Layers className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                )}
                {!uploadingLogo && (
                  <label className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-[10px] text-white font-semibold text-center px-1">Subir Nuevo</span>
                    <input type="file" accept="image/*" className="hidden cursor-pointer" onChange={handleLogoChange} />
                  </label>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-base text-[var(--color-carbon-black)] dark:text-white">Logotipo de la Organización</h3>
                <p className="text-xs text-gray-400 max-w-md">
                  Se recomienda usar una imagen en formato PNG, JPEG o SVG con fondo transparente. Límite máximo de 5MB.
                </p>
                {logoUrl && !uploadingLogo && (
                  <div className="flex gap-2 pt-1">
                    <Button 
                      size="sm" 
                      variant="flat" 
                      color="primary"
                      startContent={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => { setZoom(1); onZoomOpen(); }}
                      className="text-xs font-semibold"
                    >
                      Pantalla completa
                    </Button>
                    <Button 
                      size="sm" 
                      variant="flat" 
                      color="danger"
                      startContent={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={handleRemoveLogo}
                      className="text-xs font-semibold"
                    >
                      Eliminar logotipo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <Input 
                label="Nombre de la Organización" 
                placeholder="Ej. Gimnasio FitZone" 
                variant="bordered"
                value={name}
                onValueChange={setName}
                className="w-full"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Select 
                  label="Tipo de Organización" 
                  variant="bordered" 
                  selectedKeys={[type]}
                  onChange={(e) => setType(e.target.value)}
                >
                  <SelectItem key="company">Empresa / Oficina</SelectItem>
                  <SelectItem key="school">Escuela</SelectItem>
                  <SelectItem key="membership_venue">Local con Membresía (Gimnasio, Danza, Coworking)</SelectItem>
                  <SelectItem key="university">Universidad</SelectItem>
                  <SelectItem key="hospital">Hospital / Clínica</SelectItem>
                  <SelectItem key="factory">Fábrica / Industria</SelectItem>
                  <SelectItem key="club">Club Deportivo</SelectItem>
                  <SelectItem key="government">Entidad Gubernamental</SelectItem>
                  <SelectItem key="ngo">ONG / Fundación</SelectItem>
                  <SelectItem key="other">Otro</SelectItem>
                </Select>

                <div className="flex gap-2 items-end">
                  <span className="text-base font-bold text-gray-400 pb-3 flex-shrink-0">J-</span>
                  <Input 
                    label="RIF (Número Fiscal)" 
                    placeholder="Ej. 123456789" 
                    variant="bordered"
                    value={taxId}
                    onValueChange={(v) => setTaxId(v.replace(/\D/g, ''))}
                    description="Prefijo 'J-' asignado automáticamente"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Billing Configuration Card */}
          <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl p-6 border border-gray-100 dark:border-default-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 dark:border-default-50 pb-4">
              <DollarSign className="w-5 h-5 text-[var(--color-maya-blue)]" />
              <h2 className="text-lg font-bold text-[var(--color-carbon-black)] dark:text-white">Esquema de Facturación</h2>
            </div>

            <div className="space-y-5">
              <Select 
                label="Plan de Facturación" 
                variant="bordered" 
                selectedKeys={[billingPlan]}
                onChange={(e) => setBillingPlan(e.target.value)}
                className="w-full"
              >
                <SelectItem key="none">Ninguno (No generar cargos/mensualidad)</SelectItem>
                <SelectItem key="default">Tarifa por Defecto (Planes segmentados del sistema)</SelectItem>
                <SelectItem key="custom">Tarifa Personalizada (Precios por unidad manuales)</SelectItem>
              </Select>

              {billingPlan === "default" && (
                <div className="bg-[var(--color-lavender-mist)]/30 border border-[var(--color-lavender-mist)]/80 dark:bg-default-50/50 p-4 rounded-xl text-sm text-gray-600 dark:text-gray-300">
                  <p className="font-semibold text-gray-700 dark:text-white mb-2">Tarifas del Plan por Defecto aplicables:</p>
                  <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                    {type === "membership_venue" || type === "gym" ? (
                      <>
                        <li>SaaS Local con Membresía (Gimnasios / Academias)</li>
                        <li>Nivel 1 (Bronce): Hasta 50 usuarios = <strong>$25/mes</strong></li>
                        <li>Nivel 2 (Plata): Hasta 150 usuarios = <strong>$50/mes</strong></li>
                        <li>Nivel 3 (Oro): Hasta 300 usuarios = <strong>$100/mes</strong></li>
                        <li>Nivel 4 (Platino): Hasta 500 usuarios = <strong>$150/mes</strong></li>
                        <li>Alquiler por Lector NFC Activo: <strong>$10/mes</strong></li>
                      </>
                    ) : type === "school" || type === "university" ? (
                      <>
                        <li>SaaS Educativo (Colegios / Universidades)</li>
                        <li>Nivel 1 (Básico): Hasta 100 usuarios = <strong>$99/mes</strong></li>
                        <li>Nivel 2 (Medio): Hasta 250 usuarios = <strong>$149/mes</strong></li>
                        <li>Nivel 3 (Avanzado): Hasta 500 usuarios = <strong>$249/mes</strong></li>
                        <li>Nivel 4 (Institucional): Hasta 1000 usuarios = <strong>$349/mes</strong></li>
                        <li>Alquiler por Lector NFC Activo: <strong>$10/mes</strong></li>
                      </>
                    ) : (
                      <>
                        <li>SaaS Corporativo / Empresa</li>
                        <li>Nivel 1 (Startup): Hasta 30 usuarios = <strong>$49/mes</strong></li>
                        <li>Nivel 2 (Pyme): Hasta 100 usuarios = <strong>$99/mes</strong></li>
                        <li>Nivel 3 (Corporativo): Hasta 250 usuarios = <strong>$149/mes</strong></li>
                        <li>Nivel 4 (Enterprise): Hasta 500 usuarios = <strong>$249/mes</strong></li>
                        <li>Alquiler por Lector NFC Activo: <strong>$10/mes</strong></li>
                      </>
                    )}
                  </ul>
                </div>
              )}

              {billingPlan === "custom" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Costo mensual por Usuario Activo" 
                      type="number"
                      step="0.01"
                      variant="bordered"
                      value={costPerUser}
                      onValueChange={setCostPerUser}
                      startContent={<span className="text-gray-400 text-sm">$</span>}
                    />
                    <Input 
                      label="Costo mensual por Lector Activo (Alquiler)" 
                      type="number"
                      step="0.01"
                      variant="bordered"
                      value={costPerReader}
                      onValueChange={setCostPerReader}
                      startContent={<span className="text-gray-400 text-sm">$</span>}
                    />
                  </div>
                  <Select 
                    label="Moneda de Facturación" 
                    variant="bordered" 
                    selectedKeys={[currency]}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full"
                  >
                    <SelectItem key="USD">USD (Dólares)</SelectItem>
                    <SelectItem key="VES">VES (Bolívares)</SelectItem>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Limits Card */}
          <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl p-6 border border-gray-100 dark:border-default-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 dark:border-default-50 pb-4">
              <Users className="w-5 h-5 text-[var(--color-tropical-teal)]" />
              <h2 className="text-lg font-bold text-[var(--color-carbon-black)] dark:text-white">Límites y Suscripción (SaaS)</h2>
            </div>

            <div className="space-y-5">
              <Select 
                label="Nivel de Suscripción" 
                variant="bordered" 
                selectedKeys={[subscriptionTier]}
                onChange={(e) => {
                  const val = e.target.value;
                  setSubscriptionTier(val);
                  // Autocalcular el límite de usuarios
                  const t = parseInt(val) || 1;
                  const limit = getClientLimitForTier(type, t);
                  setMaxUsersLimit(limit.toString());
                }}
                className="w-full"
              >
                <SelectItem key="1">Nivel 1 (Bronce / Básico / Startup)</SelectItem>
                <SelectItem key="2">Nivel 2 (Plata / Medio / Pyme)</SelectItem>
                <SelectItem key="3">Nivel 3 (Oro / Avanzado / Corp)</SelectItem>
                <SelectItem key="4">Nivel 4 (Platino / Inst / Enterprise)</SelectItem>
              </Select>

              <Input 
                label="Límite Máximo de Usuarios Activos" 
                type="number"
                variant="bordered"
                value={maxUsersLimit}
                onValueChange={setMaxUsersLimit}
                description="Capacidad máxima permitida de miembros activos. Se recalcula al cambiar de nivel, pero se puede personalizar manualmente."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Invoices */}
        <div className="space-y-8">
          {/* Usage Metrics Card */}
          <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl p-6 border border-gray-100 dark:border-default-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 dark:border-default-50 pb-4">
              <Cpu className="w-5 h-5 text-[var(--color-tropical-teal)]" />
              <h2 className="text-lg font-bold text-[var(--color-carbon-black)] dark:text-white">Métricas y Estimación</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-default-50 p-4 rounded-xl flex items-center gap-3">
                <Users className="w-6 h-6 text-[var(--color-tropical-teal)] flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Socios/Pers.</p>
                  <p className="text-xl font-extrabold text-gray-700 dark:text-white">{preview?.active_users_count || 0}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-default-50 p-4 rounded-xl flex items-center gap-3">
                <Cpu className="w-6 h-6 text-[var(--color-maya-blue)] flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Lectores NFC</p>
                  <p className="text-xl font-extrabold text-gray-700 dark:text-white">{preview?.active_readers_count || 0}</p>
                </div>
              </div>
            </div>

            {billingPlan !== "none" && preview ? (
              <div className="space-y-3 border-t border-dashed border-gray-100 dark:border-default-100 pt-4 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Licencia SaaS (Usuarios):</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {preview.subtotal_users} {preview.currency}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Alquiler Lectores ({preview.active_readers_count} ud):</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {preview.subtotal_readers} {preview.currency}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold border-t border-gray-100 dark:border-default-100 pt-3 text-[var(--color-carbon-black)] dark:text-white">
                  <span>Estimado del Mes:</span>
                  <span className="text-[var(--color-tropical-teal)]">
                    {preview.total} {preview.currency}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">La facturación para esta organización está deshabilitada.</p>
            )}
          </div>

          {/* Invoice History Card */}
          <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl p-6 border border-gray-100 dark:border-default-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 dark:border-default-50 pb-4">
              <FileText className="w-5 h-5 text-[var(--color-electric-sapphire)]" />
              <h2 className="text-lg font-bold text-[var(--color-carbon-black)] dark:text-white">Historial de Facturas</h2>
            </div>

            {invoices.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No se encontraron facturas registradas.</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {invoices.map((inv) => (
                  <div key={inv._id} className="border border-gray-100 dark:border-default-100 rounded-xl p-3.5 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-default-50/20 transition-all">
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-white">
                        {inv.total_amount.toFixed(2)} {inv.currency}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Periodo: {new Date(inv.period_start).toLocaleDateString()} al {new Date(inv.period_end).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      {inv.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-200/50 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Pagado
                        </span>
                      ) : inv.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full border border-amber-200/50 font-bold">
                          <AlertTriangle className="w-3 h-3" /> Pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] px-2 py-0.5 rounded-full border border-rose-200/50 font-bold">
                          <ShieldAlert className="w-3 h-3" /> Vencido
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Logotipo en Pantalla Completa */}
      <Modal 
        isOpen={isZoomOpen} 
        onOpenChange={onZoomOpenChange}
        size="4xl"
        backdrop="blur"
        classNames={{
          base: "bg-transparent shadow-none",
          closeButton: "bg-white/10 hover:bg-white/20 text-white p-2 text-xl z-50 fixed",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <ModalBody className="p-0 flex flex-col items-center justify-center overflow-hidden h-[85vh] relative">
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
                  {logoUrl && (
                    <img 
                      src={logoUrl} 
                      alt="Logotipo Ampliado" 
                      style={{ 
                        transform: `scale(${zoom})`, 
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transformOrigin: 'center center'
                      }}
                      className="max-w-full max-h-[75vh] object-contain shadow-2xl rounded-2xl bg-white p-4 border border-white/5"
                    />
                  )}
                </div>
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
