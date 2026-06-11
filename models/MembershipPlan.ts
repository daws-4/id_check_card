import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMembershipPlan extends Document {
  organization_id: mongoose.Types.ObjectId;
  name: string;
  billing_cycle: 'weekly' | 'monthly' | 'yearly' | 'sessions';
  price: number;
  currency: 'USD' | 'VES';
  sessions_limit?: number;
  discounts: {
    user_type: 'student' | 'worker' | 'guest';
    percentage: number;
  }[];
  active: boolean;
}

const MembershipPlanSchema: Schema = new Schema({
  organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  billing_cycle: { type: String, enum: ['weekly', 'monthly', 'yearly', 'sessions'], required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['USD', 'VES'], default: 'USD' },
  sessions_limit: { type: Number },
  discounts: [{
    user_type: { type: String, enum: ['student', 'worker', 'guest'] },
    percentage: { type: Number, min: 0, max: 100 }
  }],
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Indexing for performance
MembershipPlanSchema.index({ organization_id: 1, active: 1 });

export const MembershipPlan: Model<IMembershipPlan> = mongoose.models.MembershipPlan || mongoose.model<IMembershipPlan>('MembershipPlan', MembershipPlanSchema);
