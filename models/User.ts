import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface IResidenceInfo {
  address: string;
  city: string;
  state: string;
}

export interface IUser extends Document {
  name: string;
  last_name?: string;
  email: string;
  password_hash?: string;
  nfc_card_id?: string;
  has_nfc_card: boolean;
  birth_date?: Date;
  document_id?: string;
  blood_type?: string;
  user_type?: 'student' | 'worker';
  role: 'superadmin' | 'org_admin' | 'user';
  status: 'pending' | 'active';
  invite_token?: string;
  invite_token_expires?: Date;
  reset_token_expires?: Date;
  auth_providers?: string[];
  strict_schedule_enforcement: boolean;
  // Notification channels (multi-select, opt-in)
  // Students: can pick any combination of ['telegram', 'whatsapp', 'push', 'email']
  // Non-students (workers/admins): can ONLY pick ['push'] or leave empty
  notification_channels: string[];
  telegram_chat_id?: string;
  whatsapp_phone?: string;
  push_device_token?: string;
  // Emergency & public profile
  emergency_contacts?: IEmergencyContact[];
  photo_url?: string;
  insurance_info?: string;
  residence_info?: IResidenceInfo;
  theme_preference: 'system' | 'light' | 'dark';
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  last_name: { type: String },
  email: { type: String, required: true },
  password_hash: { type: String },
  nfc_card_id: { type: String, unique: true, sparse: true },
  has_nfc_card: { type: Boolean, default: false },
  birth_date: { type: Date },
  document_id: { 
    type: String, 
    unique: true, 
    sparse: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // optional field
        return /^[VE]-\d+$/.test(v);
      },
      message: 'La cédula debe comenzar con V- o E- seguido de números'
    }
  },
  blood_type: { type: String },
  user_type: { type: String, enum: ['student', 'worker'], default: 'worker' },
  role: { type: String, enum: ['superadmin', 'org_admin', 'user'], default: 'user' },
  status: { type: String, enum: ['pending', 'active'], default: 'pending' },
  invite_token: { type: String },
  invite_token_expires: { type: Date },
  reset_token: { type: String },
  reset_token_expires: { type: Date },
  auth_providers: { type: [String], default: [] },
  strict_schedule_enforcement: { type: Boolean, default: false },
  // Notification channels - array allows multi-select. Empty array = disabled (opt-in)
  notification_channels: {
    type: [{ type: String, enum: ['telegram', 'whatsapp', 'push', 'email'] }],
    default: [],
    validate: {
      validator: function(this: any, v: string[]) {
        // Non-students can only have 'push' or empty
        if (this.user_type !== 'student') {
          return v.every((ch: string) => ch === 'push');
        }
        return true;
      },
      message: 'Los no-estudiantes solo pueden tener notificaciones push o ninguna'
    }
  },
  telegram_chat_id: { type: String },
  whatsapp_phone: { type: String },
  push_device_token: { type: String },
  // Emergency & public profile
  emergency_contacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: { type: String, required: true },
  }],
  photo_url: { type: String },
  insurance_info: { type: String },
  residence_info: {
    address: { type: String },
    city: { type: String },
    state: { type: String }
  },
  theme_preference: { type: String, enum: ['system', 'light', 'dark'], default: 'system' }
}, { timestamps: true });

UserSchema.index({ email: 1, role: 1 }, { unique: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
