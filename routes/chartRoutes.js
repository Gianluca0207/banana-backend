// backend/routes/chartRoutes.js
const express = require('express');
const router = express.Router();
const exporterController = require('../controllers/exporterController'); //✅ corretto riferimento al tuo exporterController

// Rotta per recuperare le settimane
router.get('/weeks', exporterController.getWeeks);

// Rotta per recuperare i dati del foglio Excel
router.get('/sheet-data', exporterController.getSheetData);

module.exports = router;
