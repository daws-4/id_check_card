import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  type: string;
  settings: Record<string, any>; // basic configs
}

const OrganizationSchema: Schema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  settings: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const Organization: Model<IOrganization> = mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);
