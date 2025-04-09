const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { checkTrialOrSubscription } = require('../middleware/checkTrialOrSubscription');

// Importa i controller necessari
const authController = require('../controllers/authController');
const subscriptionController = require('../controllers/subscriptionController');

// Rotte protette che richiedono una subscription attiva
router.get('/profile', protect, checkTrialOrSubscription, authController.getCurrentUser);
router.put('/profile', protect, checkTrialOrSubscription, authController.updateUserProfile);
router.get('/subscription', protect, checkTrialOrSubscription, subscriptionController.getSubscriptionStatus);
router.post('/subscription', protect, checkTrialOrSubscription, subscriptionController.createSubscription);

module.exports = router; 