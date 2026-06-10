import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMembership extends Document {
  user_id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  role: 'admin' | 'user';
  plan_name?: string;
  plan_status?: 'active' | 'expired' | 'suspended';
  expiration_date?: Date;
  remaining_sessions?: number;
  notes?: string;
}

const MembershipSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  plan_name: { type: String },
  plan_status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' },
  expiration_date: { type: Date },
  remaining_sessions: { type: Number },
  notes: { type: String },
}, { timestamps: true });

// Prevent duplicate memberships
MembershipSchema.index({ user_id: 1, organization_id: 1 }, { unique: true });

export const Membership: Model<IMembership> = mongoose.models.Membership || mongoose.model<IMembership>('Membership', MembershipSchema);
