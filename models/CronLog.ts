import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICronLog extends Document {
  taskName: string;
  year: number;
  month: number;
  status: 'running' | 'success' | 'failed';
  executedAt: Date;
  details?: any;
}

const CronLogSchema: Schema = new Schema({
  taskName: { type: String, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  status: { type: String, enum: ['running', 'success', 'failed'], required: true },
  executedAt: { type: Date, default: Date.now },
  details: { type: Schema.Types.Mixed },
}, { timestamps: true });

// Índice único compuesto para evitar condiciones de carrera a nivel de BD
CronLogSchema.index({ taskName: 1, year: 1, month: 1 }, { unique: true });

export const CronLog: Model<ICronLog> = mongoose.models.CronLog || mongoose.model<ICronLog>('CronLog', CronLogSchema);
