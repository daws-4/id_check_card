import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvoice extends Document {
  organization_id: mongoose.Types.ObjectId;
  // ── Snapshot del cálculo al momento de emisión ──
  period_start: Date;
  period_end: Date;
  active_users_count: number;
  active_readers_count: number;
  cost_per_user_at_billing: number;
  cost_per_reader_at_billing: number;
  subtotal_users: number;
  subtotal_readers: number;
  total_amount: number;
  currency: string;
  // ── Estado del pago ──
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: 'manual' | 'stripe' | 'bank_transfer';
  paid_at?: Date;
  paid_by?: string;
  payment_reference?: string;
  notes?: string;
  // ── Preparación Stripe (futuro) ──
  stripe_invoice_id?: string;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
}

const InvoiceSchema: Schema = new Schema({
  organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  active_users_count: { type: Number, required: true },
  active_readers_count: { type: Number, required: true },
  cost_per_user_at_billing: { type: Number, required: true },
  cost_per_reader_at_billing: { type: Number, required: true },
  subtotal_users: { type: Number, required: true },
  subtotal_readers: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending', 'paid', 'overdue', 'cancelled'], default: 'pending' },
  payment_method: { type: String, enum: ['manual', 'stripe', 'bank_transfer'] },
  paid_at: { type: Date },
  paid_by: { type: String },
  payment_reference: { type: String },
  notes: { type: String },
  stripe_invoice_id: { type: String },
  stripe_payment_intent_id: { type: String },
  stripe_checkout_session_id: { type: String },
}, { timestamps: true });

InvoiceSchema.index({ organization_id: 1, period_start: 1 });
InvoiceSchema.index({ status: 1 });

export const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
