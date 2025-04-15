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
    enum: ['active', 'cancelled', 'expired'], 
    default: 'active' 
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
  }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 