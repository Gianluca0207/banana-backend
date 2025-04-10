const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../data/ESTADISTICAS COM 2025 CONO SUR.xlsx');

let cachedData = null;
let lastUpdated = null;

router.get('/all', (req, res) => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (cachedData && lastUpdated && lastUpdated > oneWeekAgo) {
    console.log('📦 Dati Cono Sur serviti da cache ✅');
    return res.json(cachedData);
  }

  try {
    console.log('📄 Rilettura file Cono Sur da Excel...');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['BASE'];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const headerKeys = Object.keys(rawData[0] || {});
    const destinoKey = headerKeys.find(k => k.toLowerCase().trim() === 'destino') || 'DESTINO';

    const fullExporters = rawData.map(row => ({
      week: row.WK,
      exporter: row.EXPORTADORES,
      consignee: row.CONSIGNATARIO,
      country: row.PAIS,
      boxes: row["TOTAL GENERAL"],
      destino: row[destinoKey] || 'Unknown Port'
    })).filter(item =>
      item.week && item.exporter && item.consignee && item.country && item.boxes
    );

    cachedData = fullExporters;
    lastUpdated = new Date();

    console.log('✅ Cache aggiornata!');
    res.json(fullExporters);

  } catch (error) {
    console.error('❌ Errore nel caricamento dati Cono Sur:', error);
    res.status(500).json({ error: 'Errore nel caricamento dati Cono Sur.' });
  }
});

module.exports = router;
