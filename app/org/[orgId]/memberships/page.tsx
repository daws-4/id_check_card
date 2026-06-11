"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { 
  CreditCard, CheckCircle2, XCircle, AlertTriangle, Users, Calendar, Plus, Save, Clock, ClipboardCheck, ArrowUpRight
} from "lucide-react";

interface Plan {
  _id: string;
  name: string;
  billing_cycle: "weekly" | "monthly" | "yearly" | "sessions";
  price: number;
  currency: string;
  sessions_limit?: number;
  discounts: { user_type: string; percentage: number }[];
  active: boolean;
}

interface Payment {
  _id: string;
  user_id: { _id: string; name: string; last_name: string; email: string; document_id: string; user_type: string };
  membership_id: { plan_name: string; plan_status: string; expiration_date: string };
  amount: number;
  discount_applied: number;
  final_amount: number;
  payment_date: string;
  status: "pending" | "paid" | "rejected";
  payment_method: string;
  reference?: string;
  notes?: string;
}

interface OrgMember {
  _id: string;
  user_id: { _id: string; name: string; last_name: string; document_id: string; user_type: string };
  plan_name?: string;
  plan_status?: string;
  expiration_date?: string;
}

export default function OrgMembershipsPage() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [activeTab, setActiveTab] = useState<"dashboard" | "approvals" | "members" | "plans" | "settings">("dashboard");
  const [loading, setLoading] = useState(true);

  // Data
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [gracePeriod, setGracePeriod] = useState<number>(0);
  const [isValidationEnabled, setIsValidationEnabled] = useState<boolean>(false);
  const [bankDetails, setBankDetails] = useState<string>("");

  // Modals
  const planModal = useDisclosure();
  const paymentModal = useDisclosure();
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);

  // Form states (Plan creation)
  const [planName, setPlanName] = useState("");
  const [planCycle, setPlanCycle] = useState<"weekly" | "monthly" | "yearly" | "sessions">("monthly");
  const [planPrice, setPlanPrice] = useState("");
  const [planCurrency, setPlanCurrency] = useState("USD");
  const [planSessionsLimit, setPlanSessionsLimit] = useState("");
  const [studentDiscount, setStudentDiscount] = useState("0");

  // Form states (Admin manual payment registration)
  const [payPlanId, setPayPlanId] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "bank_transfer" | "mobile_payment">("cash");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");

  useEffect(() => {
    if (!orgId) return;
    fetchInitialData();
  }, [orgId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Org config
      const orgRes = await fetch(`/api/organizations/${orgId}`);
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setGracePeriod(orgData.settings?.grace_period_days || 0);
        setIsValidationEnabled(orgData.settings?.is_membership_validation_enabled || false);
        setBankDetails(orgData.settings?.bank_details || "");
      }

      // 2. Fetch Plans
      const plansRes = await fetch(`/api/organizations/${orgId}/plans`);
      if (plansRes.ok) {
        setPlans(await plansRes.json());
      }

      // 3. Fetch Payments
      const payRes = await fetch(`/api/organizations/${orgId}/members/payments`);
      if (payRes.ok) {
        setPayments(await payRes.json());
      }

      // 4. Fetch Members
      const memRes = await fetch(`/api/memberships?organization_id=${orgId}&limit=100`);
      if (memRes.ok) {
        const data = await memRes.json();
        setMembers(data.memberships || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            is_membership_validation_enabled: isValidationEnabled,
            grace_period_days: gracePeriod,
            bank_details: bankDetails
          }
        })
      });
      if (res.ok) alert("Configuración guardada correctamente");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePlan = async (onClose: () => void) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName,
          billing_cycle: planCycle,
          price: parseFloat(planPrice) || 0,
          currency: planCurrency,
          sessions_limit: planCycle === "sessions" ? parseInt(planSessionsLimit) || undefined : undefined,
          discounts: [
            { user_type: "student", percentage: parseInt(studentDiscount) || 0 }
          ]
        })
      });
      if (res.ok) {
        fetchInitialData();
        onClose();
        // Reset
        setPlanName("");
        setPlanPrice("");
        setPlanSessionsLimit("");
        setStudentDiscount("0");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAuditPayment = async (paymentId: string, status: "paid" | "rejected") => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/members/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchInitialData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenPaymentModal = (member: OrgMember) => {
    setSelectedMember(member);
    if (plans.length > 0) setPayPlanId(plans[0]._id);
    paymentModal.onOpen();
  };

  const handleRegisterManualPayment = async (onClose: () => void) => {
    if (!selectedMember) return;
    try {
      const res = await fetch(`/api/organizations/${orgId}/members/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedMember.user_id._id,
          plan_id: payPlanId,
          payment_method: payMethod,
          reference: payReference,
          notes: payNotes,
          force_paid: payMethod === "cash" // Direct activation for cash
        })
      });
      if (res.ok) {
        fetchInitialData();
        onClose();
        setPayReference("");
        setPayNotes("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Al Día</span>;
      case "expired":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-500 border border-red-500/20">Vencido</span>;
      case "suspended":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">Suspendido</span>;
      case "pending_payment":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">Por Conciliar</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20">—</span>;
    }
  };

  // Stats
  const activeCount = members.filter(m => m.plan_status === "active").length;
  const expiredCount = members.filter(m => m.plan_status === "expired").length;
  const pendingCount = payments.filter(p => p.status === "pending").length;
  const totalIncome = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.final_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" label="Cargando facturación y membresías..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-divider gap-4">
        <button onClick={() => setActiveTab("dashboard")} className={`pb-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "dashboard" ? "border-[var(--color-tropical-teal)] text-[var(--color-tropical-teal)]" : "border-transparent text-gray-500"}`}>Resumen</button>
        <button onClick={() => setActiveTab("approvals")} className={`pb-3 font-semibold text-sm border-b-2 transition-all cursor-pointer relative ${activeTab === "approvals" ? "border-[var(--color-tropical-teal)] text-[var(--color-tropical-teal)]" : "border-transparent text-gray-500"}`}>
          Aprobaciones
          {pendingCount > 0 && <span className="absolute -top-1.5 -right-3.5 bg-blue-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold animate-pulse">{pendingCount}</span>}
        </button>
        <button onClick={() => setActiveTab("members")} className={`pb-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "members" ? "border-[var(--color-tropical-teal)] text-[var(--color-tropical-teal)]" : "border-transparent text-gray-500"}`}>Socios</button>
        <button onClick={() => setActiveTab("plans")} className={`pb-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "plans" ? "border-[var(--color-tropical-teal)] text-[var(--color-tropical-teal)]" : "border-transparent text-gray-500"}`}>Planes</button>
        <button onClick={() => setActiveTab("settings")} className={`pb-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "settings" ? "border-[var(--color-tropical-teal)] text-[var(--color-tropical-teal)]" : "border-transparent text-gray-500"}`}>Configuración</button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div className="bg-content1 rounded-2xl p-5 border border-divider">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-xs font-semibold uppercase">Socios Activos</p>
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold">{activeCount}</p>
            </div>
            <div className="bg-content1 rounded-2xl p-5 border border-divider">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-xs font-semibold uppercase">Socios Vencidos</p>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold">{expiredCount}</p>
            </div>
            <div className="bg-content1 rounded-2xl p-5 border border-divider">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-xs font-semibold uppercase">Pagos Pendientes</p>
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold">{pendingCount}</p>
            </div>
            <div className="bg-content1 rounded-2xl p-5 border border-divider">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-xs font-semibold uppercase">Recaudado (Efectivo/Aprobado)</p>
                <CreditCard className="w-5 h-5 text-[var(--color-tropical-teal)]" />
              </div>
              <p className="text-3xl font-bold">${totalIncome.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-content1 rounded-2xl p-6 border border-divider">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[var(--color-tropical-teal)]" />
              Últimos Pagos Registrados
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-divider text-gray-500 text-xs uppercase">
                    <th className="py-3">Socio</th>
                    <th className="py-3">Plan</th>
                    <th className="py-3">Monto</th>
                    <th className="py-3">Método</th>
                    <th className="py-3">Fecha</th>
                    <th className="py-3">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider text-sm">
                  {payments.slice(0, 5).map(pay => (
                    <tr key={pay._id} className="hover:bg-content2/40">
                      <td className="py-3 font-semibold">{pay.user_id.name} {pay.user_id.last_name}</td>
                      <td className="py-3">{pay.membership_id?.plan_name || "—"}</td>
                      <td className="py-3 font-bold">${pay.final_amount.toFixed(2)}</td>
                      <td className="py-3 capitalize">{pay.payment_method.replace('_', ' ')}</td>
                      <td className="py-3 text-gray-400">{new Date(pay.payment_date).toLocaleDateString()}</td>
                      <td className="py-3">
                        {pay.status === 'paid' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Aprobado</span>}
                        {pay.status === 'pending' && <span className="text-blue-500 flex items-center gap-1"><Clock className="w-4 h-4" /> Pendiente</span>}
                        {pay.status === 'rejected' && <span className="text-red-500 flex items-center gap-1"><XCircle className="w-4 h-4" /> Rechazado</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* APPROVALS TAB */}
      {activeTab === "approvals" && (
        <div className="bg-content1 rounded-2xl border border-divider p-6">
          <h4 className="text-lg font-bold mb-4">Bandeja de Conciliación de Pagos</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-divider text-gray-500 text-xs uppercase">
                  <th className="py-3">Socio</th>
                  <th className="py-3">C.I.</th>
                  <th className="py-3">Plan</th>
                  <th className="py-3">Neto a Pagar</th>
                  <th className="py-3">Método</th>
                  <th className="py-3">Referencia</th>
                  <th className="py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider text-sm">
                {payments.filter(p => p.status === "pending").length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">No hay reportes de pago pendientes por auditar.</td>
                  </tr>
                ) : (
                  payments.filter(p => p.status === "pending").map(pay => (
                    <tr key={pay._id} className="hover:bg-content2/40">
                      <td className="py-3 font-semibold">{pay.user_id.name} {pay.user_id.last_name}</td>
                      <td className="py-3 font-mono">{pay.user_id.document_id || "—"}</td>
                      <td className="py-3">{pay.membership_id?.plan_name || "—"}</td>
                      <td className="py-3 font-bold text-emerald-500">${pay.final_amount.toFixed(2)}</td>
                      <td className="py-3 capitalize">{pay.payment_method.replace('_', ' ')}</td>
                      <td className="py-3 font-mono text-blue-500">{pay.reference || "—"}</td>
                      <td className="py-3 flex gap-2">
                        <Button color="success" size="sm" className="font-semibold text-white cursor-pointer" onPress={() => handleAuditPayment(pay._id, "paid")}>Aprobar</Button>
                        <Button color="danger" size="sm" className="font-semibold cursor-pointer" onPress={() => handleAuditPayment(pay._id, "rejected")}>Rechazar</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === "members" && (
        <div className="bg-content1 rounded-2xl border border-divider p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold">Listado General de Control</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-divider text-gray-500 text-xs uppercase">
                  <th className="py-3">Socio</th>
                  <th className="py-3">C.I.</th>
                  <th className="py-3">Plan Activo</th>
                  <th className="py-3">Expiración</th>
                  <th className="py-3">Estado</th>
                  <th className="py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider text-sm">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">No hay socios vinculados a la organización.</td>
                  </tr>
                ) : (
                  members.map(member => (
                    <tr key={member._id} className="hover:bg-content2/40">
                      <td className="py-3 font-semibold">{member.user_id.name} {member.user_id.last_name}</td>
                      <td className="py-3 font-mono">{member.user_id.document_id || "—"}</td>
                      <td className="py-3">{member.plan_name || "Sin Plan"}</td>
                      <td className="py-3 text-gray-400">{member.expiration_date ? new Date(member.expiration_date).toLocaleDateString() : "N/A"}</td>
                      <td className="py-3">{getStatusBadge(member.plan_status)}</td>
                      <td className="py-3 text-right">
                        <Button 
                          color="primary" 
                          size="sm" 
                          className="cursor-pointer"
                          onPress={() => handleOpenPaymentModal(member)}
                        >
                          <Plus className="w-3.5 h-3.5" /> Registrar Pago
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLANS TAB */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-bold">Catálogo de Planes</h4>
            <Button color="success" className="text-white cursor-pointer" onPress={planModal.onOpen}>
              <Plus className="w-4 h-4" /> Agregar Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-gray-500 bg-content1 rounded-2xl border border-divider">No hay planes de membresía creados aún.</div>
            ) : (
              plans.map(plan => (
                <div key={plan._id} className="bg-content1 rounded-2xl border border-divider p-6 flex flex-col justify-between">
                  <div>
                    <h5 className="text-lg font-bold">{plan.name}</h5>
                    <p className="text-2xl font-extrabold text-[var(--color-tropical-teal)] mt-2">
                      ${plan.price.toFixed(2)} <span className="text-xs font-normal text-gray-500 capitalize">/ {plan.billing_cycle}</span>
                    </p>
                    {plan.billing_cycle === 'sessions' && (
                      <p className="text-xs text-gray-400 mt-1">Límite de visitas: {plan.sessions_limit} sesiones</p>
                    )}
                  </div>
                  <div className="border-t border-divider pt-3 mt-4">
                    <p className="text-xs text-gray-400">Descuentos Aplicados:</p>
                    {plan.discounts.map((d, i) => (
                      <div key={i} className="flex justify-between text-xs mt-1">
                        <span className="capitalize">{d.user_type === 'student' ? 'Estudiantes' : d.user_type}:</span>
                        <span className="font-semibold text-emerald-500">{d.percentage}% Off</span>
                      </div>
                    ))}
                    {plan.discounts.length === 0 && <p className="text-xs italic text-gray-500 mt-1">Sin descuentos.</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <div className="bg-content1 rounded-2xl border border-divider p-6 space-y-6 max-w-xl">
          <h4 className="text-lg font-bold">Configuración Administrativa del Local</h4>
          
          <div className="flex items-center gap-3 bg-content2/50 p-4 rounded-xl border border-divider">
            <input 
              type="checkbox" 
              id="validation_toggle" 
              checked={isValidationEnabled} 
              onChange={(e) => setIsValidationEnabled(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <div>
              <label htmlFor="validation_toggle" className="font-semibold text-sm cursor-pointer">Activar Validación de Membresía</label>
              <p className="text-xs text-gray-400">Requerir control de pago para dar acceso a los lectores de tarjetas y escaneo QR.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-sm">Periodo de Gracia (Días de Tolerancia)</label>
            <Input 
              type="number" 
              value={gracePeriod.toString()} 
              onValueChange={(val) => setGracePeriod(parseInt(val) || 0)} 
              variant="bordered"
              description="Días de acceso que puede tener el socio tras expirar su membresía."
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-sm">Datos de Cuenta Bancaria / Pago Móvil</label>
            <textarea 
              value={bankDetails} 
              onChange={(e) => setBankDetails(e.target.value)} 
              rows={4}
              placeholder="Ingresa los datos bancarios, RIF, teléfono de pago móvil, etc. para que los socios los vean al reportar pagos."
              className="w-full bg-transparent border border-divider rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-tropical-teal)]"
            />
          </div>

          <Button color="success" className="text-white cursor-pointer" onPress={handleSaveSettings}>
            <Save className="w-4 h-4" /> Guardar Configuración
          </Button>
        </div>
      )}

      {/* ADD PLAN MODAL */}
      <Modal isOpen={planModal.isOpen} onOpenChange={planModal.onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Crear Plan de Membresía</ModalHeader>
              <ModalBody className="space-y-4">
                <Input label="Nombre del Plan" variant="bordered" placeholder="Ej. Plan Mensual VIP" value={planName} onValueChange={setPlanName} />
                <Select label="Ciclo de Cobro" variant="bordered" selectedKeys={[planCycle]} onChange={(e) => setPlanCycle(e.target.value as any)}>
                  <SelectItem key="weekly">Semanal</SelectItem>
                  <SelectItem key="monthly">Mensual</SelectItem>
                  <SelectItem key="yearly">Anual</SelectItem>
                  <SelectItem key="sessions">Tickera (Por Sesiones)</SelectItem>
                </Select>
                <Input label="Precio" variant="bordered" type="number" startContent="$" value={planPrice} onValueChange={planPrice => setPlanPrice(planPrice)} />
                {planCycle === 'sessions' && (
                  <Input label="Número de Visitas (Sesiones)" variant="bordered" type="number" value={planSessionsLimit} onValueChange={planSessionsLimit => setPlanSessionsLimit(planSessionsLimit)} />
                )}
                <Input label="Descuento Estudiantes (%)" variant="bordered" type="number" value={studentDiscount} onValueChange={studentDiscount => setStudentDiscount(studentDiscount)} />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" color="danger" onPress={onClose}>Cancelar</Button>
                <Button color="success" className="text-white cursor-pointer" onPress={() => handleCreatePlan(onClose)}>Crear</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* REGISTER MANUAL PAYMENT MODAL */}
      <Modal isOpen={paymentModal.isOpen} onOpenChange={paymentModal.onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Registrar Pago Manual</ModalHeader>
              <ModalBody className="space-y-4">
                {selectedMember && (
                  <p className="text-sm text-gray-500">Socio: <strong className="text-white">{selectedMember.user_id.name} {selectedMember.user_id.last_name}</strong> (Perfil: {selectedMember.user_id.user_type === 'student' ? 'Estudiante' : 'Trabajador'})</p>
                )}
                <Select label="Plan a Pagar" variant="bordered" selectedKeys={[payPlanId]} onChange={(e) => setPayPlanId(e.target.value)}>
                  {plans.map(p => {
                    const isStudent = selectedMember?.user_id.user_type === 'student';
                    const discount = p.discounts.find(d => d.user_type === 'student');
                    const price = isStudent && discount ? p.price * (1 - discount.percentage/100) : p.price;
                    const val = `${p.name} - $${price.toFixed(2)}`;
                    return (
                      <SelectItem key={p._id} textValue={val}>
                        {p.name} - ${price.toFixed(2)} {isStudent && discount ? '(Estudiante - Con desc.)' : ''}
                      </SelectItem>
                    );
                  })}
                </Select>
                <Select label="Método de Pago" variant="bordered" selectedKeys={[payMethod]} onChange={(e) => setPayMethod(e.target.value as any)}>
                  <SelectItem key="cash">Efectivo (Activa inmediatamente)</SelectItem>
                  <SelectItem key="bank_transfer">Transferencia Bancaria (Manual)</SelectItem>
                  <SelectItem key="mobile_payment">Pago Móvil (Manual)</SelectItem>
                </Select>
                {payMethod !== "cash" && (
                  <Input label="Número de Referencia" variant="bordered" placeholder="Ej. 18247923" value={payReference} onValueChange={setPayReference} />
                )}
                <Input label="Notas" variant="bordered" placeholder="Notas administrativas..." value={payNotes} onValueChange={setPayNotes} />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" color="danger" onPress={onClose}>Cancelar</Button>
                <Button color="primary" className="cursor-pointer" onPress={() => handleRegisterManualPayment(onClose)}>Registrar y Activar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
