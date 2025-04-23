const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Rotta per ottenere tutti i dati della dashboard
router.get('/data', dashboardController.getDashboardData);

module.exports = router; 