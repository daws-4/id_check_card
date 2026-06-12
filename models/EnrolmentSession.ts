import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEnrolmentSession extends Document {
  user_id: mongoose.Types.ObjectId;
  superadmin_id: mongoose.Types.ObjectId;
  status: 'pending' | 'writing' | 'completed' | 'failed';
  card_uid?: string;
  createdAt: Date;
}

const EnrolmentSessionSchema: Schema = new Schema({
  user_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  superadmin_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'writing', 'completed', 'failed'], 
    default: 'pending' 
  },
  card_uid: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// TTL index of 120 seconds to release concurrency lock automatically
EnrolmentSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 120 });

export const EnrolmentSession: Model<IEnrolmentSession> = 
  mongoose.models.EnrolmentSession || 
  mongoose.model<IEnrolmentSession>('EnrolmentSession', EnrolmentSessionSchema);
