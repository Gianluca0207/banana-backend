// backend/routes/wordRoutes.js
const express = require('express');
const router = express.Router();
const { getWordAsPdf } = require('../controllers/wordController');

// Rotta per ottenere il PDF a partire da un file DOCX presente nella cartella data
// Esempio di URL: http://localhost:5002/api/word-to-pdf/informazioni.docx
router.get('/word-to-pdf/:fileName', getWordAsPdf);

module.exports = router;
