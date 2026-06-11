import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMemberPayment extends Document {
  membership_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  amount: number;
  discount_applied: number;
  final_amount: number;
  payment_date: Date;
  period_start: Date;
  period_end: Date;
  status: 'pending' | 'paid' | 'rejected';
  payment_method: 'cash' | 'mobile_payment' | 'bank_transfer';
  reference?: string;
  notes?: string;
  audited_by?: string;
  audited_at?: Date;
}

const MemberPaymentSchema: Schema = new Schema({
  membership_id: { type: Schema.Types.ObjectId, ref: 'Membership', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  amount: { type: Number, required: true },
  discount_applied: { type: Number, default: 0 },
  final_amount: { type: Number, required: true },
  payment_date: { type: Date, default: Date.now },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending' },
  payment_method: { type: String, enum: ['cash', 'mobile_payment', 'bank_transfer'], required: true },
  reference: { type: String },
  notes: { type: String },
  audited_by: { type: String },
  audited_at: { type: Date }
}, { timestamps: true });

MemberPaymentSchema.index({ organization_id: 1, status: 1 });
MemberPaymentSchema.index({ user_id: 1 });

export const MemberPayment: Model<IMemberPayment> = mongoose.models.MemberPayment || mongoose.model<IMemberPayment>('MemberPayment', MemberPaymentSchema);
