import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password_hash: string;
  nfc_card_id: string;
  role: 'superadmin' | 'org_admin' | 'user';
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  nfc_card_id: { type: String, required: true, unique: true },
  role: { type: String, enum: ['superadmin', 'org_admin', 'user'], default: 'user' },
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
