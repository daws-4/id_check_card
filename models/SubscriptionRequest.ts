import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionRequest extends Document {
  organization_id: mongoose.Types.ObjectId;
  requested_tier: number;
  status: 'pending' | 'approved' | 'rejected';
  payment_method: 'stripe' | 'bank_transfer' | 'mobile_payment';
  payment_reference: string;
  receipt_url?: string;
  requested_by: mongoose.Types.ObjectId;
  notes?: string;
  resolution_notes?: string;
}

const SubscriptionRequestSchema: Schema = new Schema({
  organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  requested_tier: { type: Number, enum: [1, 2, 3, 4], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  payment_method: { type: String, enum: ['stripe', 'bank_transfer', 'mobile_payment'], required: true },
  payment_reference: { type: String, required: true },
  receipt_url: { type: String },
  requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String },
  resolution_notes: { type: String }
}, { timestamps: true });

export const SubscriptionRequest: Model<ISubscriptionRequest> = mongoose.models.SubscriptionRequest || mongoose.model<ISubscriptionRequest>('SubscriptionRequest', SubscriptionRequestSchema);
