const express = require('express');
const router = express.Router();
const { renewSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

// Route per il rinnovo dell'abbonamento
router.post('/renew', protect, renewSubscription);

module.exports = router; 