EXCELROUTES: 
// backend/routes/excelRoutes.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

/**
 * GET /api/excel-sheets
 * Restituisce la lista di tutti i file .xlsx presenti nella cartella "data"
 */
router.get('/excel-sheets', (req, res) => {
  const dataDir = path.join(__dirname, '..', 'data');
  fs.readdir(dataDir, (err, files) => {
    if (err) {
      console.error('Errore nella lettura della cartella data:', err);
      return res.status(500).json({ message: 'Errore nel leggere la cartella data' });
    }
    // Filtra solo i file con estensione .xlsx
    const excelFiles = files.filter(file => file.endsWith('.xlsx'));
    res.json(excelFiles);
  });
});



module.exports = router;