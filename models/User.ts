import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  last_name?: string;
  email: string;
  password_hash?: string;
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
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  last_name: { type: String },
  email: { type: String, required: true },
  password_hash: { type: String },
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
}, { timestamps: true });

UserSchema.index({ email: 1, role: 1 }, { unique: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
