import { Schema, model } from 'mongoose';

const subscriptionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true }
});

export default model('Subscription', subscriptionSchema);
