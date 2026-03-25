import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  last_name?: string;
  email: string;
  password_hash: string;
  has_nfc_card: boolean;
  birth_date?: Date;
  document_id?: string;
  blood_type?: string;
  role: 'superadmin' | 'org_admin' | 'user';
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  last_name: { type: String },
  email: { type: String, required: true },
  password_hash: { type: String, required: true },
  has_nfc_card: { type: Boolean, default: false },
  birth_date: { type: Date },
  document_id: { type: String, unique: true, sparse: true },
  blood_type: { type: String },
  role: { type: String, enum: ['superadmin', 'org_admin', 'user'], default: 'user' },
}, { timestamps: true });

UserSchema.index({ email: 1, role: 1 }, { unique: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
