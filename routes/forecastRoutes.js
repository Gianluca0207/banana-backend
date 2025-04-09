const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx');

router.get('/all', (req, res) => {
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '❌ File Excel non trovato.' });
    }

    const workbook = xlsx.readFile(filePath);

    const sheetName = Object.keys(workbook.Sheets).find(name => name.trim().toLowerCase() === 'base');
    if (!sheetName) {
      return res.status(500).json({ error: '❌ Foglio BASE non trovato nel file Excel.' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const headerKeys = Object.keys(rawData[0] || {});
    const destinoKey = headerKeys.find(k => k.toLowerCase().trim() === 'destino') || 'DESTINO';

    const { exporter } = req.query;

    const fullExporters = rawData
      .map(row => ({
        week: row.WK,
        exporter: (row.EXPORTADORES || '').trim(),
        consignee: (row.CONSIGNATARIO || '').trim(),
        country: (row.PAIS || '').trim(),
        boxes: row["TOTAL GENERAL"],
        destino: (row[destinoKey] || 'Unknown Port').trim()
      }))
      .filter(item =>
        item.week != null &&
        item.exporter &&
        item.consignee &&
        item.country &&
        item.boxes != null &&
        (exporter ? item.exporter.toLowerCase().includes(exporter.toLowerCase()) : true)
      );

    res.json(fullExporters);
  } catch (error) {
    console.error('❌ Errore nel caricamento dei dati completi:', error);
    res.status(500).json({ error: 'Errore nel caricamento dei dati completi.' });
  }
});

module.exports = router;
