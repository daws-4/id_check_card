import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendanceLog extends Document {
  user_id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  reader_id: mongoose.Types.ObjectId;
  timestamp: Date;
  type: 'entrada' | 'salida';
  status?: 'on_time' | 'late' | 'early_leave' | 'overtime';
  time_variance_minutes?: number;
}

const AttendanceLogSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  reader_id: { type: Schema.Types.ObjectId, ref: 'Reader', required: true },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['entrada', 'salida'], required: true },
  status: { type: String, enum: ['on_time', 'late', 'early_leave', 'overtime'] },
  time_variance_minutes: { type: Number },
}, { timestamps: true });

export const AttendanceLog: Model<IAttendanceLog> = mongoose.models.AttendanceLog || mongoose.model<IAttendanceLog>('AttendanceLog', AttendanceLogSchema);
