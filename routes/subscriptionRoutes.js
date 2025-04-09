const express = require('express');
const router = express.Router();
const { createSubscription, getSubscriptionStatus, renewSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { checkTrialOrSubscription, allowRenewal } = require('../middleware/checkTrialOrSubscription');

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Subscription routes are working' });
});

// 📌 Questa rotta è accessibile solo se l'utente è loggato e nel trial o abbonato
router.post('/subscribe', protect, allowRenewal, createSubscription);

// 📌 Get subscription status for the current user
router.get('/subscription-status', protect, getSubscriptionStatus);

// 📌 Renew existing subscription - allows renewal even if trial has expired
router.post('/renew', protect, allowRenewal, renewSubscription);

module.exports = router;
