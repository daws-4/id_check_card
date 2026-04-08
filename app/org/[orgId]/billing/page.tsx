"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import {
  Receipt, Clock, CheckCircle2, AlertTriangle, XCircle, DollarSign, Users, Router, Eye,
} from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Button } from "@heroui/button";

interface Invoice {
  _id: string;
  organization_id: any;
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

const statusLabels: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:   { label: "Pendiente",  color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",    icon: Clock },
  paid:      { label: "Pagada",     color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  overdue:   { label: "Vencida",    color: "text-red-600",     bg: "bg-red-50 border-red-200",         icon: AlertTriangle },
  cancelled: { label: "Cancelada",  color: "text-gray-500",    bg: "bg-gray-50 border-gray-200",       icon: XCircle },
};

function formatCurrency(amount: number, currency: string) {
  const sym = currency === "VES" ? "Bs." : "$";
  return `${sym}${amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-VE", { year: "numeric", month: "short", day: "numeric" });
}

export default function OrgBillingPage() {
  const params = useParams();
  const orgId = params?.orgId as string;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const detailModal = useDisclosure();

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/billing/invoices?orgId=${orgId}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setInvoices(data.invoices || []);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [orgId]);

  const totalPending = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total_amount, 0);
  const cur = invoices[0]?.currency || "USD";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <section>
      <h3 className="text-[var(--color-carbon-black)] dark:text-white text-2xl font-bold flex items-center gap-2 mb-6">
        <Receipt className="w-7 h-7 text-[var(--color-tropical-teal)]" />
        Mis Facturas
      </h3>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-content1 rounded-2xl p-5 shadow-sm border border-divider relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs">Pendiente de Pago</p>
            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 rounded-lg"><Clock className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-carbon-black)] dark:text-white">{formatCurrency(totalPending, cur)}</p>
        </div>
        <div className="bg-content1 rounded-2xl p-5 shadow-sm border border-divider relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs">Total Pagado</p>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-carbon-black)] dark:text-white">{formatCurrency(totalPaid, cur)}</p>
        </div>
        <div className="bg-content1 rounded-2xl p-5 shadow-sm border border-divider relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--color-electric-sapphire)]/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs">Total Facturas</p>
            <div className="p-2 bg-[var(--color-electric-sapphire)]/10 text-[var(--color-electric-sapphire)] rounded-lg"><DollarSign className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-carbon-black)] dark:text-white">{invoices.length}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-content1 rounded-2xl shadow-sm border border-divider overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-lavender-mist)]/50 dark:bg-white/5 border-b border-divider">
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Periodo</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Usuarios</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Lectores</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Total</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Estado</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No hay facturas registradas aún.</p>
                  </td>
                </tr>
              ) : (
                invoices.map(inv => {
                  const st = statusLabels[inv.status];
                  const StIcon = st.icon;
                  return (
                    <tr key={inv._id} className="hover:bg-[var(--color-lavender-mist)]/30 dark:hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-5 text-sm text-gray-600 dark:text-gray-300">{formatDate(inv.period_start)} — {formatDate(inv.period_end)}</td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 text-sm dark:text-gray-300"><Users className="w-3.5 h-3.5 text-gray-400" /> {inv.active_users_count}</span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 text-sm dark:text-gray-300"><Router className="w-3.5 h-3.5 text-gray-400" /> {inv.active_readers_count}</span>
                      </td>
                      <td className="py-4 px-5 text-right font-bold text-sm dark:text-white">{formatCurrency(inv.total_amount, inv.currency)}</td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${st.bg} ${st.color}`}>
                          <StIcon className="w-3 h-3" /> {st.label}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => { setDetail(inv); detailModal.onOpen(); }}
                          className="p-1.5 text-gray-400 hover:text-[var(--color-maya-blue)] rounded-lg hover:bg-[var(--color-maya-blue)]/10 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle */}
      <Modal isOpen={detailModal.isOpen} onOpenChange={detailModal.onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <span className="flex items-center gap-2"><Eye className="w-5 h-5 text-[var(--color-maya-blue)]" /> Detalle de Factura</span>
              </ModalHeader>
              <ModalBody>
                {detail && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailRow label="Periodo" value={`${formatDate(detail.period_start)} — ${formatDate(detail.period_end)}`} />
                      <DetailRow label="Estado" value={statusLabels[detail.status].label} />
                      <DetailRow label="Moneda" value={detail.currency} />
                    </div>
                    <div className="border-t border-divider pt-3">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Desglose</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{detail.active_users_count} usuarios × {formatCurrency(detail.cost_per_user_at_billing, detail.currency)}</span>
                          <span className="font-medium">{formatCurrency(detail.subtotal_users, detail.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{detail.active_readers_count} lectores × {formatCurrency(detail.cost_per_reader_at_billing, detail.currency)}</span>
                          <span className="font-medium">{formatCurrency(detail.subtotal_readers, detail.currency)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-2 font-bold text-base">
                          <span className="dark:text-white">Total</span>
                          <span className="text-[var(--color-tropical-teal)]">{formatCurrency(detail.total_amount, detail.currency)}</span>
                        </div>
                      </div>
                    </div>
                    {(detail.paid_at || detail.payment_method) && (
                      <div className="border-t border-divider pt-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Información de Pago</p>
                        <div className="grid grid-cols-2 gap-3">
                          {detail.payment_method && <DetailRow label="Método" value={detail.payment_method === "manual" ? "Efectivo" : detail.payment_method === "bank_transfer" ? "Transferencia" : detail.payment_method} />}
                          {detail.paid_at && <DetailRow label="Fecha" value={formatDate(detail.paid_at)} />}
                          {detail.paid_by && <DetailRow label="Pagado por" value={detail.paid_by} />}
                          {detail.payment_reference && <DetailRow label="Referencia" value={detail.payment_reference} />}
                        </div>
                      </div>
                    )}
                    {detail.notes && <DetailRow label="Notas" value={detail.notes} />}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-[var(--color-carbon-black)] dark:text-white">{value}</p>
    </div>
  );
}
