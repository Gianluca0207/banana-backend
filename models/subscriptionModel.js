const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  plan: { 
    type: String, 
    enum: ['monthly', 'semiannual', 'annual'], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'cancelled', 'expired', 'pending', 'payment_failed', 'payment_cancelled'], 
    default: 'pending' 
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'succeeded', 'canceled', 'failed', 'requires_payment_method', 'requires_action'],
    default: 'pending'
  },
  failureReason: {
    type: String,
    enum: ['card_declined', 'expired_card', 'insufficient_funds', 'authentication_required', 'network_error', 'user_canceled', 'unknown'],
    default: null
  },
  startDate: { 
    type: Date, 
    default: Date.now 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  trialEnd: {
    type: Date
  },
  paymentMethodId: { 
    type: String 
  },
  chargeId: { 
    type: String 
  },
  lastPaymentDate: { 
    type: Date 
  },
  nextPaymentDate: { 
    type: Date 
  },
  paymentAttempts: {
    type: Number,
    default: 0
  },
  lastPaymentAttempt: {
    type: Date
  },
  paymentHistory: [{
    date: { type: Date, default: Date.now },
    status: { type: String },
    sessionId: { type: String },
    amount: { type: Number },
    failureReason: { type: String },
    idempotencyKey: { type: String }
  }],
  idempotencyKey: {
    type: String,
    index: true
  }
}, { timestamps: true });

// Add indexes for better performance
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ paymentStatus: 1 });
subscriptionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 