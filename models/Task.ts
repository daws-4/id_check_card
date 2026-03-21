import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  group_id: mongoose.Types.ObjectId;
  due_date?: Date;
  is_recurring: boolean;
  recurrence?: 'weekly' | 'monthly' | 'yearly';
}

const TaskSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  group_id: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  due_date: { type: Date },
  is_recurring: { type: Boolean, default: false },
  recurrence: { type: String, enum: ['weekly', 'monthly', 'yearly'] },
}, { timestamps: true });

export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
