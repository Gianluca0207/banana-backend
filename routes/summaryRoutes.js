const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx');

// Cache settimanale
const summaryCache = new Map();
let lastCacheUpdate = null;

// 📌 Funzione per generare il riassunto per un determinato WK
const generateSummary = (wk) => {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets['BASE'];
  const data = xlsx.utils.sheet_to_json(sheet);

  const filteredData = data.filter(item => item.WK === wk);

  const vessels = {};
  const exporters = {};
  let total22XU = 0;
  let total208 = 0;
  const countries = new Set();
  const ships = new Set();
  const consignees = new Set();

  filteredData.forEach(item => {
    if (item['22XU']) total22XU += item['22XU'];
    if (item['208']) total208 += item['208'];
    if (item.PAIS) countries.add(item.PAIS);
    if (item.BUQUES) ships.add(item.BUQUES);
    if (item.CONSIGNATARIO) consignees.add(item.CONSIGNATARIO);

    if (item.BUQUES) {
      vessels[item.BUQUES] = (vessels[item.BUQUES] || 0) + (item['22XU'] || 0);
    }

    if (item.EXPORTADORES) {
      exporters[item.EXPORTADORES] = (exporters[item.EXPORTADORES] || 0) + (item['TOTAL GENERAL'] || 0);
    }
  });

  const topVessels = Object.entries(vessels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([vessel, quantity]) => ({ vessel, quantity }));

  const topExporters = Object.entries(exporters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([exporter, quantity]) => ({ exporter, quantity }));

  return {
    week: wk,
    topVessels,
    topExporters,
    generalStats: {
      total22XU,
      total208,
      totalConsignees: consignees.size,
      totalCountries: countries.size,
      totalShips: ships.size
    }
  };
};

// ✅ GET /api/summary/:wk – Summary for a specific week
router.get('/:wk', (req, res) => {
  const wk = parseInt(req.params.wk);
  if (isNaN(wk)) {
    return res.status(400).json({ error: 'Invalid WK provided' });
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (summaryCache.has(wk) && lastCacheUpdate && lastCacheUpdate > oneWeekAgo) {
    console.log(`📦 Summary WK${wk} served from cache`);
    return res.json(summaryCache.get(wk));
  }

  try {
    const summary = generateSummary(wk);
    summaryCache.set(wk, summary);
    lastCacheUpdate = new Date();
    console.log(`📄 Cache updated for WK${wk}`);
    res.json(summary);
  } catch (error) {
    console.error('❌ Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ✅ GET /api/summary/filters/available – All available weeks and countries
router.get('/filters/available', (req, res) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['BASE'];
    const data = xlsx.utils.sheet_to_json(sheet);

    const weeks = [...new Set(data.map(item => item.WK))].sort((a, b) => a - b);
    const countries = [...new Set(data.map(item => item.PAIS))].sort();

    res.json({ weeks, countries });
  } catch (error) {
    console.error('❌ Error loading filters:', error);
    res.status(500).json({ error: 'Error loading filters' });
  }
});

// ✅ GET /api/summary/download/estadisticas – Scarica il file Excel
router.get('/download/estadisticas', (req, res) => {
  if (!fs.existsSync(filePath)) {
    console.error('❌ File non trovato:', filePath);
    return res.status(404).json({ error: 'File non trovato' });
  }

  res.download(filePath, 'ESTADISTICAS_COM_2025.xlsx', (err) => {
    if (err) {
      console.error('❌ Errore durante il download del file:', err);
      return res.status(500).json({ error: 'Errore durante il download del file' });
    }
    console.log('✅ File scaricato correttamente');
  });
});

module.exports = router;
