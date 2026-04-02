"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import {
  Receipt, Settings, FilePlus, DollarSign, Clock, CheckCircle2, AlertTriangle,
  ChevronDown, Eye, CreditCard, XCircle, Trash2, Building2, Users, Router,
} from "lucide-react";

/* ── Tipos ── */
interface BillingConfig {
  _id: string;
  default_cost_per_active_user: number;
  default_cost_per_active_reader: number;
  rate_overrides: { org_type: string; cost_per_active_user: number; cost_per_active_reader: number }[];
  currency: string;
  billing_cycle: string;
  notes?: string;
}

interface Invoice {
  _id: string;
  organization_id: { _id: string; name: string; type: string; tax_id?: string } | string;
  period_start: string;
  period_end: string;
  active_users_count: number;
  active_readers_count: number;
  cost_per_user_at_billing: number;
  cost_per_reader_at_billing: number;
  subtotal_users: number;
  subtotal_readers: number;
  total_amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  payment_method?: string;
  paid_at?: string;
  paid_by?: string;
  payment_reference?: string;
  notes?: string;
}

interface Summary {
  global: {
    total_invoices: number;
    total_amount: number;
    total_pending: number;
    total_paid: number;
    total_overdue: number;
    count_pending: number;
    count_paid: number;
    count_overdue: number;
  };
  by_organization: any[];
}

interface Organization {
  _id: string;
  name: string;
  type: string;
}

interface PreviewData {
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

const orgTypesTranslations: Record<string, string> = {
  company: "Empresa", school: "Escuela", university: "Universidad",
  hospital: "Hospital / Clínica", factory: "Fábrica / Industria",
  coworking: "Coworking", residential: "Residencial", club: "Club Deportivo",
  event: "Evento", government: "Entidad Gob.", ngo: "ONG / Fundación",
  library: "Biblioteca", gym: "Gimnasio", other: "Otro",
};

const statusLabels: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:   { label: "Pendiente",  color: "text-amber-600",  bg: "bg-amber-50 border-amber-200",  icon: Clock },
  paid:      { label: "Pagada",     color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  overdue:   { label: "Vencida",    color: "text-red-600",     bg: "bg-red-50 border-red-200",     icon: AlertTriangle },
  cancelled: { label: "Cancelada",  color: "text-gray-500",    bg: "bg-gray-50 border-gray-200",   icon: XCircle },
};

const cycleLabels: Record<string, string> = {
  monthly: "Mensual", quarterly: "Trimestral", yearly: "Anual",
};

function formatCurrency(amount: number, currency: string) {
  const sym = currency === "VES" ? "Bs." : "$";
  return `${sym}${amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-VE", { year: "numeric", month: "short", day: "numeric" });
}

function getOrgName(inv: Invoice) {
  if (typeof inv.organization_id === "object") return inv.organization_id.name;
  return inv.organization_id;
}

/* ══════════════════════════════════════════════════ */
export default function BillingPage() {
  /* ── State ── */
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modales
  const configModal = useDisclosure();
  const generateModal = useDisclosure();
  const payModal = useDisclosure();
  const detailModal = useDisclosure();

  // Form: Configuración
  const [cfgUserCost, setCfgUserCost] = useState("");
  const [cfgReaderCost, setCfgReaderCost] = useState("");
  const [cfgCurrency, setCfgCurrency] = useState("USD");
  const [cfgCycle, setCfgCycle] = useState("monthly");
  const [cfgNotes, setCfgNotes] = useState("");
  const [cfgOverrides, setCfgOverrides] = useState<{ org_type: string; cost_per_active_user: string; cost_per_active_reader: string }[]>([]);

  // Form: Generar factura
  const [genOrgId, setGenOrgId] = useState("");
  const [genPeriodStart, setGenPeriodStart] = useState("");
  const [genPeriodEnd, setGenPeriodEnd] = useState("");
  const [genPreview, setGenPreview] = useState<PreviewData | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  // Form: Registrar pago
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState("manual");
  const [payBy, setPayBy] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Detalle de factura
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  const [submitting, setSubmitting] = useState(false);

  /* ── Data Fetching ── */
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [cfgRes, invRes, sumRes, orgRes] = await Promise.all([
        fetch("/api/billing/config"),
        fetch("/api/billing/invoices?limit=100"),
        fetch("/api/billing/summary"),
        fetch("/api/organizations"),
      ]);
      if (cfgRes.ok) setConfig(await cfgRes.json());
      if (invRes.ok) { const d = await invRes.json(); setInvoices(d.invoices || []); }
      if (sumRes.ok) setSummary(await sumRes.json());
      if (orgRes.ok) setOrganizations(await orgRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  /* ── Filtrado ── */
  const filteredInvoices = useMemo(() => {
    if (statusFilter === "all") return invoices;
    return invoices.filter(i => i.status === statusFilter);
  }, [invoices, statusFilter]);

  /* ── Handlers: Configuración ── */
  function openConfigModal() {
    if (config) {
      setCfgUserCost(config.default_cost_per_active_user.toString());
      setCfgReaderCost(config.default_cost_per_active_reader.toString());
      setCfgCurrency(config.currency);
      setCfgCycle(config.billing_cycle);
      setCfgNotes(config.notes || "");
      setCfgOverrides(
        config.rate_overrides.map(r => ({
          org_type: r.org_type,
          cost_per_active_user: r.cost_per_active_user.toString(),
          cost_per_active_reader: r.cost_per_active_reader.toString(),
        }))
      );
    }
    configModal.onOpen();
  }

  async function saveConfig(onClose: () => void) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_cost_per_active_user: parseFloat(cfgUserCost) || 0,
          default_cost_per_active_reader: parseFloat(cfgReaderCost) || 0,
          rate_overrides: cfgOverrides
            .filter(o => o.org_type)
            .map(o => ({
              org_type: o.org_type,
              cost_per_active_user: parseFloat(o.cost_per_active_user) || 0,
              cost_per_active_reader: parseFloat(o.cost_per_active_reader) || 0,
            })),
          currency: cfgCurrency,
          billing_cycle: cfgCycle,
          notes: cfgNotes,
        }),
      });
      if (res.ok) { await loadAll(); onClose(); }
    } catch (e) { console.error(e); }
    setSubmitting(false);
  }

  function addOverride() {
    setCfgOverrides([...cfgOverrides, { org_type: "", cost_per_active_user: cfgUserCost, cost_per_active_reader: cfgReaderCost }]);
  }

  function removeOverride(idx: number) {
    setCfgOverrides(cfgOverrides.filter((_, i) => i !== idx));
  }

  function updateOverride(idx: number, field: string, value: string) {
    const updated = [...cfgOverrides];
    (updated[idx] as any)[field] = value;
    setCfgOverrides(updated);
  }

  /* ── Handlers: Generar Factura ── */
  function openGenerateModal() {
    setGenOrgId("");
    setGenPreview(null);
    // Defaults: mes actual
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setGenPeriodStart(start.toISOString().split("T")[0]);
    setGenPeriodEnd(end.toISOString().split("T")[0]);
    generateModal.onOpen();
  }

  async function loadPreview() {
    if (!genOrgId) { setGenPreview(null); return; }
    setGenLoading(true);
    try {
      const res = await fetch(`/api/billing/preview/${genOrgId}`);
      if (res.ok) setGenPreview(await res.json());
    } catch (e) { console.error(e); }
    setGenLoading(false);
  }

  useEffect(() => { if (genOrgId) loadPreview(); else setGenPreview(null); }, [genOrgId]);

  async function generateInvoices(onClose: () => void) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: genOrgId || undefined,
          period_start: genPeriodStart,
          period_end: genPeriodEnd,
        }),
      });
      if (res.ok) { await loadAll(); onClose(); }
    } catch (e) { console.error(e); }
    setSubmitting(false);
  }

  /* ── Handlers: Registrar pago ── */
  function openPayModal(inv: Invoice) {
    setPayInvoice(inv);
    setPayMethod("manual");
    setPayBy("");
    setPayRef("");
    setPayNotes("");
    payModal.onOpen();
  }

  async function savePay(onClose: () => void) {
    if (!payInvoice) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/billing/invoices/${payInvoice._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          payment_method: payMethod,
          paid_by: payBy,
          payment_reference: payRef,
          notes: payNotes,
        }),
      });
      if (res.ok) { await loadAll(); onClose(); }
    } catch (e) { console.error(e); }
    setSubmitting(false);
  }

  /* ── Handlers: Cambiar estado ── */
  async function updateInvoiceStatus(id: string, status: string) {
    try {
      await fetch(`/api/billing/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (e) { console.error(e); }
  }

  async function deleteInvoice(id: string) {
    if (!confirm("¿Eliminar esta factura cancelada?")) return;
    try {
      await fetch(`/api/billing/invoices/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) { console.error(e); }
  }

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const g = summary?.global || { total_invoices: 0, total_amount: 0, total_pending: 0, total_paid: 0, total_overdue: 0, count_pending: 0, count_paid: 0, count_overdue: 0 };
  const cur = config?.currency || "USD";

  return (
    <section>
      {/* ── Título y acciones ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-[var(--color-carbon-black)] dark:text-white text-2xl font-bold flex items-center gap-2 mb-6">
          <Receipt className="w-7 h-7 text-[var(--color-tropical-teal)]" />
          Facturación
        </h3>
        <div className="flex gap-3">
          <button
            onClick={openConfigModal}
            className="bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-[var(--color-carbon-black)] dark:text-white font-medium px-4 py-2.5 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Tarifas
          </button>
          <button
            onClick={openGenerateModal}
            className="bg-[var(--color-maya-blue)] hover:bg-[var(--color-tropical-teal)] text-white font-medium px-5 py-2.5 rounded-xl shadow-md shadow-[var(--color-maya-blue)]/30 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            Generar Facturas
          </button>
        </div>
      </div>

      {/* ── Tarjetas resumen ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/10 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--color-electric-sapphire)]/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs">Total Facturado</p>
            <div className="p-2 bg-[var(--color-electric-sapphire)]/10 text-[var(--color-electric-sapphire)] rounded-lg"><DollarSign className="w-4 h-4" /></div>
          </div>
          <p className="text-3xl font-bold text-[var(--color-carbon-black)] dark:text-white">{formatCurrency(g.total_amount, cur)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{g.total_invoices} facturas</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/10 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs">Pendiente</p>
            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 rounded-lg"><Clock className="w-4 h-4" /></div>
          </div>
          <p className="text-3xl font-bold text-[var(--color-carbon-black)] dark:text-white">{formatCurrency(g.total_pending, cur)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{g.count_pending} facturas</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/10 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs">Cobrado</p>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <p className="text-3xl font-bold text-[var(--color-carbon-black)] dark:text-white">{formatCurrency(g.total_paid, cur)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{g.count_paid} facturas</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/10 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs">Vencido</p>
            <div className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <p className="text-3xl font-bold text-[var(--color-carbon-black)] dark:text-white">{formatCurrency(g.total_overdue, cur)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{g.count_overdue} facturas</p>
        </div>
      </div>

      {/* Configuración Actual */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/10 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Settings className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tarifas Actuales</span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--color-maya-blue)]/10 text-[var(--color-maya-blue)] text-xs font-medium">{config?.billing_cycle} · {config?.currency}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">Por usuario activo: <strong className="text-[var(--color-carbon-black)] dark:text-white">{formatCurrency(config?.default_cost_per_active_user || 0, config?.currency || "USD")}</strong></span>
              <span className="flex items-center gap-1.5">Por lector activo: <strong className="text-[var(--color-carbon-black)] dark:text-white">{formatCurrency(config?.default_cost_per_active_reader || 0, config?.currency || "USD")}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Filtrar:</span>
        {["all", "pending", "paid", "overdue", "cancelled"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              statusFilter === s
                ? "bg-[var(--color-tropical-teal)] text-white shadow-sm"
                : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-700"
            }`}
          >
            {s === "all" ? "Todas" : statusLabels[s].label}
          </button>
        ))}
      </div>

      {/* ── Tabla de facturas ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-lavender-mist)]/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Organización</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Periodo</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Usuarios</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Lectores</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Total</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Estado</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No hay facturas{statusFilter !== "all" ? ` con estado "${statusLabels[statusFilter]?.label}"` : ""}.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const st = statusLabels[inv.status];
                  const StIcon = st.icon;
                  return (
                    <tr key={inv._id} className="hover:bg-[var(--color-lavender-mist)]/30 dark:hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-5">
                        <div className="font-semibold text-[var(--color-carbon-black)] dark:text-white text-sm">{getOrgName(inv)}</div>
                        {typeof inv.organization_id === "object" && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">{orgTypesTranslations[inv.organization_id.type] || inv.organization_id.type}</div>
                        )}
                      </td>
                      <td className="py-4 px-5 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(inv.period_start)} — {formatDate(inv.period_end)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-sm dark:text-gray-300">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium">{inv.active_users_count}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-sm dark:text-gray-300">
                          <Router className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium">{inv.active_readers_count}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right font-bold text-sm text-[var(--color-carbon-black)] dark:text-white">
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${st.bg} ${st.color}`}>
                          <StIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setDetailInvoice(inv); detailModal.onOpen(); }} className="p-1.5 text-gray-400 hover:text-[var(--color-maya-blue)] rounded-lg hover:bg-[var(--color-maya-blue)]/10 cursor-pointer" title="Ver detalle">
                            <Eye className="w-4 h-4" />
                          </button>
                          {inv.status === "pending" && (
                            <button onClick={() => openPayModal(inv)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 cursor-pointer" title="Registrar pago">
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          {(inv.status === "pending" || inv.status === "overdue") && (
                            <button onClick={() => updateInvoiceStatus(inv._id, inv.status === "pending" ? "overdue" : "pending")} className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 cursor-pointer" title={inv.status === "pending" ? "Marcar vencida" : "Revertir a pendiente"}>
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          {inv.status !== "cancelled" && inv.status !== "paid" && (
                            <button onClick={() => updateInvoiceStatus(inv._id, "cancelled")} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 cursor-pointer" title="Cancelar factura">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {inv.status === "cancelled" && (
                            <button onClick={() => deleteInvoice(inv._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 cursor-pointer" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* MODAL: Configurar Tarifas                */}
      {/* ══════════════════════════════════════════ */}
      <Modal isOpen={configModal.isOpen} onOpenChange={configModal.onOpenChange} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="flex items-center gap-2"><Settings className="w-5 h-5 text-[var(--color-tropical-teal)]" /> Configurar Tarifas</span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-5">
                  {/* Defaults */}
                  <div className="p-4 bg-[var(--color-lavender-mist)]/50 rounded-xl space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Tarifas por Defecto</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Costo por usuario activo" type="number" step="0.01" min="0" variant="bordered" value={cfgUserCost} onValueChange={setCfgUserCost} startContent={<DollarSign className="w-4 h-4 text-gray-400" />} />
                      <Input label="Costo por lector activo" type="number" step="0.01" min="0" variant="bordered" value={cfgReaderCost} onValueChange={setCfgReaderCost} startContent={<DollarSign className="w-4 h-4 text-gray-400" />} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Select label="Moneda" variant="bordered" selectedKeys={[cfgCurrency]} onChange={e => setCfgCurrency(e.target.value)}>
                        <SelectItem key="USD">USD (Dólares)</SelectItem>
                        <SelectItem key="VES">VES (Bolívares)</SelectItem>
                      </Select>
                      <Select label="Ciclo de facturación" variant="bordered" selectedKeys={[cfgCycle]} onChange={e => setCfgCycle(e.target.value)}>
                        <SelectItem key="monthly">Mensual</SelectItem>
                        <SelectItem key="quarterly">Trimestral</SelectItem>
                        <SelectItem key="yearly">Anual</SelectItem>
                      </Select>
                    </div>
                  </div>

                  {/* Overrides */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700">Tarifas Especiales por Tipo de Organización</p>
                      <button onClick={addOverride} className="text-xs text-[var(--color-maya-blue)] hover:underline cursor-pointer">+ Agregar</button>
                    </div>
                    {cfgOverrides.length === 0 && (
                      <p className="text-xs text-gray-400 italic">Todas las organizaciones usan la tarifa por defecto.</p>
                    )}
                    {cfgOverrides.map((ov, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-3 bg-gray-50 rounded-lg">
                        <Select label="Tipo" variant="bordered" size="sm" selectedKeys={ov.org_type ? [ov.org_type] : []} onChange={e => updateOverride(idx, "org_type", e.target.value)}>
                          {Object.entries(orgTypesTranslations).map(([key, label]) => (
                            <SelectItem key={key}>{label}</SelectItem>
                          ))}
                        </Select>
                        <Input label="$/usuario" type="number" step="0.01" min="0" size="sm" variant="bordered" value={ov.cost_per_active_user} onValueChange={v => updateOverride(idx, "cost_per_active_user", v)} />
                        <Input label="$/lector" type="number" step="0.01" min="0" size="sm" variant="bordered" value={ov.cost_per_active_reader} onValueChange={v => updateOverride(idx, "cost_per_active_reader", v)} />
                        <button onClick={() => removeOverride(idx)} className="p-2 text-red-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>

                  {/* Notas */}
                  <Input label="Notas internas" variant="bordered" value={cfgNotes} onValueChange={setCfgNotes} placeholder="Ej: Tarifas ajustadas Q2 2026" />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>Cancelar</Button>
                <Button color="primary" onPress={() => saveConfig(onClose)} isLoading={submitting}>Guardar Tarifas</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ══════════════════════════════════════════ */}
      {/* MODAL: Generar Facturas                   */}
      {/* ══════════════════════════════════════════ */}
      <Modal isOpen={generateModal.isOpen} onOpenChange={generateModal.onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="flex items-center gap-2"><FilePlus className="w-5 h-5 text-[var(--color-maya-blue)]" /> Generar Facturas</span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Select
                    label="Organización"
                    placeholder="Todas las organizaciones"
                    variant="bordered"
                    selectedKeys={genOrgId ? [genOrgId] : []}
                    onChange={e => setGenOrgId(e.target.value)}
                  >
                    {organizations.map(org => (
                      <SelectItem key={org._id}>{org.name}</SelectItem>
                    ))}
                  </Select>

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Inicio del periodo" type="date" variant="bordered" value={genPeriodStart} onValueChange={setGenPeriodStart} />
                    <Input label="Fin del periodo" type="date" variant="bordered" value={genPeriodEnd} onValueChange={setGenPeriodEnd} />
                  </div>

                  {/* Preview */}
                  {genOrgId && (
                    <div className="p-4 bg-[var(--color-lavender-mist)]/50 rounded-xl">
                      {genLoading ? (
                        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                      ) : genPreview ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-700">Vista previa: {genPreview.organization_name}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /> <span>{genPreview.active_users_count} usuarios × {formatCurrency(genPreview.cost_per_user, genPreview.currency)}</span></div>
                            <div className="text-right font-medium">{formatCurrency(genPreview.subtotal_users, genPreview.currency)}</div>
                            <div className="flex items-center gap-2"><Router className="w-4 h-4 text-gray-400" /> <span>{genPreview.active_readers_count} lectores × {formatCurrency(genPreview.cost_per_reader, genPreview.currency)}</span></div>
                            <div className="text-right font-medium">{formatCurrency(genPreview.subtotal_readers, genPreview.currency)}</div>
                          </div>
                          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                            <span>Total estimado</span>
                            <span className="text-[var(--color-tropical-teal)]">{formatCurrency(genPreview.total, genPreview.currency)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No se pudo cargar el preview.</p>
                      )}
                    </div>
                  )}

                  {!genOrgId && (
                    <p className="text-xs text-gray-400 italic p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      ⚡ Si no seleccionas una organización, se generarán facturas para <strong>todas</strong> las organizaciones con usuarios o lectores activos.
                    </p>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>Cancelar</Button>
                <Button color="primary" onPress={() => generateInvoices(onClose)} isLoading={submitting}>
                  Generar {genOrgId ? "Factura" : "Todas las Facturas"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ══════════════════════════════════════════ */}
      {/* MODAL: Registrar Pago                     */}
      {/* ══════════════════════════════════════════ */}
      <Modal isOpen={payModal.isOpen} onOpenChange={payModal.onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-500" /> Registrar Pago</span>
              </ModalHeader>
              <ModalBody>
                {payInvoice && (
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
                      <p className="font-semibold">{getOrgName(payInvoice)}</p>
                      <p className="text-gray-600">{formatDate(payInvoice.period_start)} — {formatDate(payInvoice.period_end)}</p>
                      <p className="font-bold text-lg mt-1 text-emerald-700">{formatCurrency(payInvoice.total_amount, payInvoice.currency)}</p>
                    </div>
                    <Select label="Método de pago" variant="bordered" selectedKeys={[payMethod]} onChange={e => setPayMethod(e.target.value)}>
                      <SelectItem key="manual">Efectivo / Manual</SelectItem>
                      <SelectItem key="bank_transfer">Transferencia Bancaria</SelectItem>
                    </Select>
                    <Input label="Pagado por" placeholder="Nombre o referencia" variant="bordered" value={payBy} onValueChange={setPayBy} />
                    <Input label="Referencia de pago" placeholder="Nro. de transferencia, recibo, etc." variant="bordered" value={payRef} onValueChange={setPayRef} />
                    <Input label="Notas" placeholder="Notas adicionales (opcional)" variant="bordered" value={payNotes} onValueChange={setPayNotes} />
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>Cancelar</Button>
                <Button color="success" onPress={() => savePay(onClose)} isLoading={submitting}>Confirmar Pago</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ══════════════════════════════════════════ */}
      {/* MODAL: Detalle Factura                    */}
      {/* ══════════════════════════════════════════ */}
      <Modal isOpen={detailModal.isOpen} onOpenChange={detailModal.onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <span className="flex items-center gap-2"><Eye className="w-5 h-5 text-[var(--color-maya-blue)]" /> Detalle de Factura</span>
              </ModalHeader>
              <ModalBody>
                {detailInvoice && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailRow label="Organización" value={getOrgName(detailInvoice)} />
                      <DetailRow label="Estado" value={statusLabels[detailInvoice.status].label} />
                      <DetailRow label="Periodo" value={`${formatDate(detailInvoice.period_start)} — ${formatDate(detailInvoice.period_end)}`} />
                      <DetailRow label="Moneda" value={detailInvoice.currency} />
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Desglose</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">{detailInvoice.active_users_count} usuarios × {formatCurrency(detailInvoice.cost_per_user_at_billing, detailInvoice.currency)}</span>
                          <span className="font-medium">{formatCurrency(detailInvoice.subtotal_users, detailInvoice.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{detailInvoice.active_readers_count} lectores × {formatCurrency(detailInvoice.cost_per_reader_at_billing, detailInvoice.currency)}</span>
                          <span className="font-medium">{formatCurrency(detailInvoice.subtotal_readers, detailInvoice.currency)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-base">
                          <span>Total</span>
                          <span className="text-[var(--color-tropical-teal)]">{formatCurrency(detailInvoice.total_amount, detailInvoice.currency)}</span>
                        </div>
                      </div>
                    </div>
                    {(detailInvoice.paid_at || detailInvoice.payment_method) && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Información de Pago</p>
                        <div className="grid grid-cols-2 gap-3">
                          {detailInvoice.payment_method && <DetailRow label="Método" value={detailInvoice.payment_method === "manual" ? "Efectivo" : detailInvoice.payment_method === "bank_transfer" ? "Transferencia" : detailInvoice.payment_method} />}
                          {detailInvoice.paid_at && <DetailRow label="Fecha de pago" value={formatDate(detailInvoice.paid_at)} />}
                          {detailInvoice.paid_by && <DetailRow label="Pagado por" value={detailInvoice.paid_by} />}
                          {detailInvoice.payment_reference && <DetailRow label="Referencia" value={detailInvoice.payment_reference} />}
                        </div>
                      </div>
                    )}
                    {detailInvoice.notes && (
                      <div className="border-t border-gray-100 pt-3">
                        <DetailRow label="Notas" value={detailInvoice.notes} />
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" variant="flat" onPress={onClose}>Cerrar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </section>
  );
}

/* ── Componentes auxiliares ── */
function SummaryCard({ label, value, count, color, icon: Icon }: { label: string; value: string; count: string; color: string; icon: any }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl" style={{ backgroundColor: `${color}15` }} />
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-500 font-medium text-xs">{label}</p>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--color-carbon-black)]">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{count}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-[var(--color-carbon-black)]">{value}</p>
    </div>
  );
}
