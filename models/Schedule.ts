import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISchedule extends Document {
  group_id: mongoose.Types.ObjectId;
  title: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
}

const ScheduleSchema: Schema = new Schema({
  group_id: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  title: { type: String, required: true }, // Materia, Actividad, Turno
  start_time: { type: String, required: true }, // e.g. "08:00"
  end_time: { type: String, required: true }, // e.g. "17:00"
  days_of_week: [{ type: Number, required: true }], // 0 (Sun) to 6 (Sat)
}, { timestamps: true });

export const Schedule: Model<ISchedule> = mongoose.models.Schedule || mongoose.model<ISchedule>('Schedule', ScheduleSchema);
