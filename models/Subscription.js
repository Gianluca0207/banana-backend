const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, required: true, enum: ['monthly', 'semiannual', 'annual'] },
    status: { type: String, required: true, enum: ['active', 'inactive', 'cancelled', 'expired'], default: 'inactive' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    trialEndsAt: { type: Date },
    paymentMethodId: { type: String },
    lastPaymentDate: { type: Date },
    nextPaymentDate: { type: Date },
}, {
    timestamps: true
});

// Index per query più veloci
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
