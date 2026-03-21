import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGroup extends Document {
  organization_id: mongoose.Types.ObjectId;
  name: string;
  type: 'study' | 'work';
}

const GroupSchema: Schema = new Schema({
  organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['study', 'work'], required: true, default: 'work' },
}, { timestamps: true });

export const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
