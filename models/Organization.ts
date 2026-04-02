import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  type: string;
  tax_id?: string;
  settings: Record<string, any>; // basic configs
  billing_plan?: 'default' | 'custom' | 'none';
  billing_rates?: {
    cost_per_active_user: number;
    cost_per_active_reader: number;
    currency: string;
  };
}

const OrganizationSchema: Schema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  tax_id: { 
    type: String, 
    unique: true, 
    sparse: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        return /^J-\d+$/.test(v);
      },
      message: 'El RIF debe comenzar con J- seguido de números'
    }
  },
  settings: { type: Schema.Types.Mixed, default: {} },
  billing_plan: { type: String, enum: ['default', 'custom', 'none'], default: 'none' },
  billing_rates: {
    cost_per_active_user: { type: Number },
    cost_per_active_reader: { type: Number },
    currency: { type: String }
  },
}, { timestamps: true });

export const Organization: Model<IOrganization> = mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);
