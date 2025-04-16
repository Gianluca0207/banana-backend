const express = require('express');
const router = express.Router();
const Enfundas = require('../models/Enfundas');
const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../data/Enfundas.xlsx');

// GET /api/enfundas/all
router.get('/all', async (req, res) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Grafico'];
    const data = xlsx.utils.sheet_to_json(sheet);

    const formattedData = data.map(row => ({
      label: row.LABEL,
      average: row['AVERAGE 2015-2024'],
      year2024: row['2024'],
      year2025: row['2025'],
      prevision: row.PREVISION
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('❌ Errore nel caricamento dati Enfundas:', error);
    res.status(500).json({ error: 'Errore nel caricamento dei dati.' });
  }
});

module.exports = router; 