const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required for subscription'] 
  },
  plan: { 
    type: String, 
    enum: {
      values: ['monthly', 'semiannual', 'annual'],
      message: 'Plan must be monthly, semiannual, or annual'
    },
    required: [true, 'Subscription plan is required']
  },
  amount: { 
    type: Number, 
    required: [true, 'Payment amount is required'],
    min: [1, 'Amount must be greater than 0']
  },
  status: { 
    type: String, 
    enum: {
      values: ['active', 'cancelled', 'expired', 'pending', 'payment_failed', 'payment_cancelled'],
      message: 'Invalid subscription status'
    },
    default: 'pending' 
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'succeeded', 'canceled', 'failed', 'requires_payment_method', 'requires_action'],
      message: 'Invalid payment status'
    },
    default: 'pending'
  },
  failureReason: {
    type: String,
    enum: {
      values: ['card_declined', 'expired_card', 'insufficient_funds', 'authentication_required', 'network_error', 'user_canceled', 'unknown', null],
      message: 'Invalid failure reason'
    },
    default: null
  },
  startDate: { 
    type: Date, 
    default: Date.now,
    validate: {
      validator: function(date) {
        return date instanceof Date && !isNaN(date);
      },
      message: 'Start date must be a valid date'
    }
  },
  endDate: { 
    type: Date, 
    required: [true, 'End date is required'],
    validate: {
      validator: function(date) {
        return date instanceof Date && !isNaN(date) && date > this.startDate;
      },
      message: 'End date must be a valid date after the start date'
    }
  },
  trialEnd: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || (date instanceof Date && !isNaN(date));
      },
      message: 'Trial end date must be a valid date'
    }
  },
  paymentMethodId: { 
    type: String 
  },
  chargeId: { 
    type: String 
  },
  lastPaymentDate: { 
    type: Date,
    validate: {
      validator: function(date) {
        return !date || (date instanceof Date && !isNaN(date));
      },
      message: 'Last payment date must be a valid date'
    }
  },
  nextPaymentDate: { 
    type: Date,
    validate: {
      validator: function(date) {
        return !date || (date instanceof Date && !isNaN(date));
      },
      message: 'Next payment date must be a valid date'
    }
  },
  paymentAttempts: {
    type: Number,
    default: 0,
    min: [0, 'Payment attempts cannot be negative']
  },
  lastPaymentAttempt: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || (date instanceof Date && !isNaN(date));
      },
      message: 'Last payment attempt date must be a valid date'
    }
  },
  paymentHistory: [{
    date: { 
      type: Date, 
      default: Date.now,
      required: [true, 'Payment history date is required']
    },
    status: { 
      type: String,
      required: [true, 'Payment status is required']
    },
    sessionId: { type: String },
    amount: { 
      type: Number,
      min: [0, 'Amount cannot be negative']
    },
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

// Pre-save middleware for additional validation
subscriptionSchema.pre('save', function(next) {
  // Validate that endDate is after startDate
  if (this.endDate && this.startDate && this.endDate <= this.startDate) {
    const err = new Error('Subscription end date must be after start date');
    err.name = 'ValidationError';
    return next(err);
  }
  
  // Validate trialEnd if present
  if (this.trialEnd && this.startDate && this.trialEnd < this.startDate) {
    const err = new Error('Trial end date must be after subscription start date');
    err.name = 'ValidationError';
    return next(err);
  }
  
  next();
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 