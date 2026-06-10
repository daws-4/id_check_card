import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  type: string;
  tax_id?: string;
  logo_url?: string;
  settings: Record<string, any>; // basic configs
  billing_plan?: 'default' | 'custom' | 'none';
  billing_rates?: {
    cost_per_active_user: number;
    cost_per_active_reader: number;
    currency: string;
  };
  // Notification controls
  notifications_enabled: boolean;
  // Subscription details
  subscription_tier: number;
  max_users_limit: number;
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
  logo_url: { type: String },
  settings: { type: Schema.Types.Mixed, default: {} },
  billing_plan: { type: String, enum: ['default', 'custom', 'none'], default: 'none' },
  billing_rates: {
    cost_per_active_user: { type: Number },
    cost_per_active_reader: { type: Number },
    currency: { type: String }
  },
  // Notification controls (disabled by default)
  notifications_enabled: { type: Boolean, default: false },
  // Subscription management
  subscription_tier: { type: Number, enum: [1, 2, 3, 4], default: 1 },
  max_users_limit: { type: Number, default: 50 },
}, { timestamps: true });

export const Organization: Model<IOrganization> = mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);
