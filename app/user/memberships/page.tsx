"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@heroui/spinner";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { 
  CreditCard, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Landmark, Send
} from "lucide-react";

interface EnrichedMembership {
  _id: string;
  organization: {
    _id: string;
    name: string;
    type: string;
    bank_details: string;
    grace_period_days: number;
    is_membership_validation_enabled: boolean;
  };
  plan_id: string | null;
  plan_name: string;
  plan_status: "active" | "expired" | "suspended" | "pending_payment";
  expiration_date: string | null;
  remaining_sessions?: number;
  last_payment_date: string | null;
  next_billing_date: string | null;
  available_plans: {
    _id: string;
    name: string;
    billing_cycle: string;
    price: number;
    currency: string;
    sessions_limit?: number;
    discounts: { user_type: string; percentage: number }[];
  }[];
}

interface PaymentReport {
  _id: string;
  organization_id: { name: string };
  amount: number;
  discount_applied: number;
  final_amount: number;
  payment_date: string;
  status: "pending" | "paid" | "rejected";
  payment_method: string;
  reference?: string;
  notes?: string;
}

export default function UserMembershipsPage() {
  const [memberships, setMemberships] = useState<EnrichedMembership[]>([]);
  const [payments, setPayments] = useState<PaymentReport[]>([]);
  const [userType, setUserType] = useState<string>("worker");
  const [loading, setLoading] = useState(true);

  // Report Payment states
  const reportModal = useDisclosure();
  const [selectedMembership, setSelectedMembership] = useState<EnrichedMembership | null>(null);
  const [payPlanId, setPayPlanId] = useState("");
  const [payMethod, setPayMethod] = useState<"bank_transfer" | "mobile_payment">("mobile_payment");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user memberships data
      const res = await fetch("/api/user/memberships");
      if (res.ok) {
        const data = await res.json();
        setMemberships(data.memberships || []);
        setPayments(data.payments || []);
      }

      // 2. Fetch user profile to know user_type (e.g. student discount eligibility)
      const profRes = await fetch("/api/user/profile");
      if (profRes.ok) {
        const profData = await profRes.json();
        setUserType(profData.user?.user_type || "worker");
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleOpenReportModal = (mem: EnrichedMembership) => {
    setSelectedMembership(mem);
    if (mem.available_plans.length > 0) {
      setPayPlanId(mem.available_plans[0]._id);
    } else {
      setPayPlanId("");
    }
    reportModal.onOpen();
  };

  const handleSendPaymentReport = async (onClose: () => void) => {
    if (!selectedMembership || !payPlanId) return;
    setSubmitting(true);
    try {
      const orgId = selectedMembership.organization._id;
      const res = await fetch(`/api/organizations/${orgId}/members/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedMembership._id, // Will be overridden or extracted server-side by auth session
          plan_id: payPlanId,
          payment_method: payMethod,
          reference: payReference,
          notes: payNotes,
          force_paid: false // Needs manual audit
        })
      });
      if (res.ok) {
        alert("Pago reportado con éxito. Está en cola para revisión del administrador.");
        fetchData();
        onClose();
        setPayReference("");
        setPayNotes("");
      } else {
        const err = await res.json();
        alert(`Error al reportar pago: ${err.error || "Desconocido"}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBanner = (mem: EnrichedMembership) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = mem.expiration_date ? new Date(mem.expiration_date) : null;
    const graceDays = mem.organization.grace_period_days || 0;
    
    let isExpired = false;
    let inGrace = false;

    if (expDate) {
      const graceLimit = new Date(expDate);
      graceLimit.setDate(graceLimit.getDate() + graceDays);
      isExpired = graceLimit < today;
      inGrace = expDate < today && graceLimit >= today;
    }

    if (mem.plan_status === "suspended") {
      return (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-3 flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Acceso Restringido: Tu membresía está suspendida administrativamente.</span>
        </div>
      );
    }

    if (mem.plan_status === "pending_payment") {
      return (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl p-3 flex items-center gap-2 text-xs">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>Conciliación Pendiente: Tu reporte de pago está siendo revisado por el local.</span>
        </div>
      );
    }

    if (isExpired || mem.plan_status === "expired") {
      return (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 flex items-center gap-2 text-xs">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>Acceso Denegado: Membresía vencida. Por favor, reporta un pago para renovar el ingreso.</span>
        </div>
      );
    }

    if (inGrace) {
      const graceLimit = new Date(expDate!);
      graceLimit.setDate(graceLimit.getDate() + graceDays);
      return (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-3 flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Periodo de Tolerancia Activo: Tu membresía venció el {expDate?.toLocaleDateString()}. Tienes tolerancia de ingreso hasta el {graceLimit.toLocaleDateString()}.</span>
        </div>
      );
    }

    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl p-3 flex items-center gap-2 text-xs">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <span>Socio al Día: Acceso autorizado. Próximo vencimiento el {expDate?.toLocaleDateString()}.</span>
      </div>
    );
  };

  const getPriceConfig = (plan: any) => {
    const isStudent = userType === "student";
    const discount = plan.discounts.find((d: any) => d.user_type === "student");
    const finalPrice = isStudent && discount ? plan.price * (1 - discount.percentage / 100) : plan.price;
    return {
      price: finalPrice,
      isDiscounted: isStudent && discount
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" label="Cargando tu estado de membresía..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-carbon-black)] dark:text-white flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-[var(--color-tropical-teal)]" />
          Mis Membresías y Pagos
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Revisa el estado de tus cuotas e ingresos y reporta transferencias manuales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Membership Cards */}
        <div className="lg:col-span-2 space-y-6">
          {memberships.length === 0 ? (
            <div className="bg-content1 border border-divider rounded-2xl p-8 text-center text-gray-500">
              No estás inscrito en ninguna organización que requiera membresía.
            </div>
          ) : (
            memberships.map(mem => (
              <div key={mem._id} className="bg-content1 border border-divider rounded-2xl p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{mem.organization.name}</h3>
                    <p className="text-xs text-gray-400 capitalize">{mem.organization.type.replace('_', ' ')}</p>
                  </div>
                  {mem.plan_status === 'active' && <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-500">Activa</span>}
                  {mem.plan_status === 'pending_payment' && <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500">Verificando Pago</span>}
                  {mem.plan_status === 'expired' && <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-500">Vencida</span>}
                  {mem.plan_status === 'suspended' && <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500">Suspendida</span>}
                </div>

                {/* Status Alert Banner */}
                {getStatusBanner(mem)}

                <div className="grid grid-cols-2 gap-4 text-sm bg-content2/30 p-4 rounded-xl border border-divider">
                  <div>
                    <p className="text-gray-400 text-xs">Plan Contratado</p>
                    <p className="font-semibold">{mem.plan_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Próximo Vencimiento</p>
                    <p className="font-semibold">{mem.expiration_date ? new Date(mem.expiration_date).toLocaleDateString() : "—"}</p>
                  </div>
                  {mem.remaining_sessions !== undefined && (
                    <div className="col-span-2 pt-2 border-t border-divider flex justify-between items-center">
                      <span className="text-gray-400 text-xs">Sesiones Restantes:</span>
                      <strong className="text-emerald-500">{mem.remaining_sessions} visitas</strong>
                    </div>
                  )}
                </div>

                {mem.organization.is_membership_validation_enabled && (
                  <Button 
                    color="success" 
                    className="w-full text-white font-semibold cursor-pointer"
                    onPress={() => handleOpenReportModal(mem)}
                  >
                    <RefreshCw className="w-4 h-4" /> Reportar Pago / Renovación
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Side: Payment history log */}
        <div className="space-y-6">
          <div className="bg-content1 border border-divider rounded-2xl p-6">
            <h4 className="font-bold text-base mb-4">Reportes Recientes</h4>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {payments.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No has reportado ningún pago manual todavía.</p>
              ) : (
                payments.map(pay => (
                  <div key={pay._id} className="border border-divider rounded-xl p-3 text-xs bg-content2/10 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2">
                      <strong className="text-sm font-bold text-emerald-500">${pay.final_amount.toFixed(2)}</strong>
                      {pay.status === 'paid' && <span className="text-emerald-500 font-semibold flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobado</span>}
                      {pay.status === 'pending' && <span className="text-blue-500 font-semibold flex items-center gap-0.5"><Clock className="w-3.5 h-3.5 animate-pulse" /> Pendiente</span>}
                      {pay.status === 'rejected' && <span className="text-red-500 font-semibold flex items-center gap-0.5"><XCircle className="w-3.5 h-3.5" /> Rechazado</span>}
                    </div>
                    <p className="text-gray-400">Local: {pay.organization_id.name}</p>
                    <p className="text-gray-400 capitalize">Método: {pay.payment_method.replace('_', ' ')}</p>
                    <p className="text-gray-400 font-mono">Ref: {pay.reference || "N/A"}</p>
                    <p className="text-gray-500 text-[10px] mt-1">{new Date(pay.payment_date).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* REPORT PAYMENT MODAL */}
      <Modal isOpen={reportModal.isOpen} onOpenChange={reportModal.onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Reportar Pago Manual</ModalHeader>
              <ModalBody className="space-y-4">
                {selectedMembership && (
                  <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl p-4 space-y-2 text-xs">
                    <h5 className="font-bold flex items-center gap-1.5"><Landmark className="w-4 h-4" /> Datos de Pago del Local</h5>
                    <p className="whitespace-pre-line leading-relaxed">{selectedMembership.organization.bank_details || "No hay instrucciones de pago disponibles. Por favor, acércate a recepción."}</p>
                  </div>
                )}

                <Select label="Plan a Cancelar" variant="bordered" selectedKeys={[payPlanId]} onChange={(e) => setPayPlanId(e.target.value)}>
                  {(selectedMembership?.available_plans || []).map(p => {
                    const priceInfo = getPriceConfig(p);
                    return (
                      <SelectItem key={p._id} textValue={`${p.name} - $${priceInfo.price.toFixed(2)}`}>
                        {p.name} - ${priceInfo.price.toFixed(2)} {priceInfo.isDiscounted ? '(Desc. Estudiante aplicado)' : ''}
                      </SelectItem>
                    );
                  })}
                </Select>

                <Select label="Método de Pago" variant="bordered" selectedKeys={[payMethod]} onChange={(e) => setPayMethod(e.target.value as any)}>
                  <SelectItem key="mobile_payment">Pago Móvil</SelectItem>
                  <SelectItem key="bank_transfer">Transferencia Bancaria</SelectItem>
                </Select>

                <Input label="Código de Referencia" placeholder="Ingresa el número de referencia bancaria o pago móvil" variant="bordered" value={payReference} onValueChange={setPayReference} />
                <Input label="Comentario / Notas" placeholder="Opcional. Ej: Pagado desde el banco Provincial" variant="bordered" value={payNotes} onValueChange={setPayNotes} />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" color="danger" onPress={onClose} disabled={submitting}>Cancelar</Button>
                <Button color="success" className="text-white font-semibold cursor-pointer" onPress={() => handleSendPaymentReport(onClose)} isLoading={submitting}>
                  <Send className="w-4 h-4" /> Enviar Reporte
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
