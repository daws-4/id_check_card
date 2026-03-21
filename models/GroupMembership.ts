import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGroupMembership extends Document {
  user_id: mongoose.Types.ObjectId;
  group_id: mongoose.Types.ObjectId;
  role: 'leader' | 'member';
}

const GroupMembershipSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  group_id: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  role: { type: String, enum: ['leader', 'member'], default: 'member' },
}, { timestamps: true });

GroupMembershipSchema.index({ user_id: 1, group_id: 1 }, { unique: true });

export const GroupMembership: Model<IGroupMembership> = mongoose.models.GroupMembership || mongoose.model<IGroupMembership>('GroupMembership', GroupMembershipSchema);
