import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRateOverride {
  org_type: string;
  cost_per_active_user: number;
  cost_per_active_reader: number;
}

export interface IBillingConfig extends Document {
  default_cost_per_active_user: number;
  default_cost_per_active_reader: number;
  rate_overrides: IRateOverride[];
  currency: 'USD' | 'VES';
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  notes?: string;
  // ── Preparación Stripe (futuro) ──
  stripe_price_user_id?: string;
  stripe_price_reader_id?: string;
}

const RateOverrideSchema = new Schema({
  org_type: { type: String, required: true },
  cost_per_active_user: { type: Number, required: true, min: 0 },
  cost_per_active_reader: { type: Number, required: true, min: 0 },
}, { _id: false });

const BillingConfigSchema: Schema = new Schema({
  default_cost_per_active_user: { type: Number, required: true, default: 1.00 },
  default_cost_per_active_reader: { type: Number, required: true, default: 5.00 },
  rate_overrides: { type: [RateOverrideSchema], default: [] },
  currency: { type: String, enum: ['USD', 'VES'], default: 'USD' },
  billing_cycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  notes: { type: String },
  stripe_price_user_id: { type: String },
  stripe_price_reader_id: { type: String },
}, { timestamps: true });

export const BillingConfig: Model<IBillingConfig> = mongoose.models.BillingConfig || mongoose.model<IBillingConfig>('BillingConfig', BillingConfigSchema);
