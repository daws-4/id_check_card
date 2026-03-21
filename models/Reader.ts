import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReader extends Document {
  esp32_id: string;
  organization_id: mongoose.Types.ObjectId;
  group_id?: mongoose.Types.ObjectId;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
}

const ReaderSchema: Schema = new Schema({
  esp32_id: { type: String, required: true, unique: true },
  organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  group_id: { type: Schema.Types.ObjectId, ref: 'Group' },
  location: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
}, { timestamps: true });

export const Reader: Model<IReader> = mongoose.models.Reader || mongoose.model<IReader>('Reader', ReaderSchema);
