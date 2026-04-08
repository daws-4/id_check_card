import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProfileEditRequest extends Document {
  user_id: mongoose.Types.ObjectId;
  requested_changes: any;
  status: 'pending' | 'approved' | 'rejected';
  approvals: Map<string, boolean>; // org_id string -> boolean
}

const ProfileEditRequestSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requested_changes: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvals: { type: Map, of: Boolean, default: {} },
}, { timestamps: true });

export const ProfileEditRequest: Model<IProfileEditRequest> = mongoose.models.ProfileEditRequest || mongoose.model<IProfileEditRequest>('ProfileEditRequest', ProfileEditRequestSchema);
