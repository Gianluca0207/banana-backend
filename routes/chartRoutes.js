// backend/routes/chartRoutes.js
const express = require('express');
const router = express.Router();
const exporterController = require('../controllers/exporterController'); //✅ corretto riferimento al tuo exporterController
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Rotta per recuperare le settimane
router.get('/weeks', exporterController.getWeeks);

// Rotta per recuperare i dati del foglio Excel
router.get('/sheet-data', exporterController.getSheetData);

// Rotta per invalidare la cache (protetta, solo per admin)
router.post('/invalidate-cache', protect, isAdmin, exporterController.invalidateCache);

module.exports = router;
