import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITaskCompletion extends Document {
  task_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  completed_at: Date;
}

const TaskCompletionSchema: Schema = new Schema({
  task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  completed_at: { type: Date, default: Date.now },
}, { timestamps: true });

export const TaskCompletion: Model<ITaskCompletion> = mongoose.models.TaskCompletion || mongoose.model<ITaskCompletion>('TaskCompletion', TaskCompletionSchema);
