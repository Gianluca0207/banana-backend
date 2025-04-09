const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const path = require('path');

// 📍 Percorso del file Excel Cono Sur
const filePath = path.join(__dirname, '../data/ESTADISTICAS COM 2025 CONO SUR.xlsx');

router.get('/all', (req, res) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['BASE'];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    // Trova la chiave corretta per 'DESTINO'
    const headerKeys = Object.keys(rawData[0] || {});
    const destinoKey = headerKeys.find(k => k.toLowerCase().trim() === 'destino') || 'DESTINO';

    const { exporter } = req.query;

    const fullExporters = rawData.map(row => ({
      week: row.WK,
      exporter: row.EXPORTADORES,
      consignee: row.CONSIGNATARIO,
      country: row.PAIS,
      boxes: row["TOTAL GENERAL"],
      destino: row[destinoKey] || 'Unknown Port'
    })).filter(item =>
      item.week && item.exporter && item.consignee && item.country && item.boxes &&
      (exporter ? item.exporter.toLowerCase().includes(exporter.toLowerCase()) : true)
    );

    res.json(fullExporters);
  } catch (error) {
    console.error('❌ Errore nel caricamento dati Cono Sur:', error);
    res.status(500).json({ error: 'Errore nel caricamento dati Cono Sur.' });
  }
});

module.exports = router;
