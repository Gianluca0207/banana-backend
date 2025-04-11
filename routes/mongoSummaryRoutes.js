const express = require('express');
const router = express.Router();
const SummaryExporter = require('../models/SummaryExporter');

// ✅ GET /api/mongo-summary → restituisce le ultime 100 righe
// ✅ GET /api/mongo-summary?week=14&country=Ecuador&exporter=FRUTIBAN&port=ROTTERDAM
router.get('/', async (req, res) => {
  try {
    const { week, country, exporter, port } = req.query;

    const query = {};
    if (week) query.week = parseInt(week);
    if (country) query.country = country;
    if (exporter) query.exporter = exporter;
    if (port) query.destino = port;

    const results = await SummaryExporter.find(query).sort({ week: -1 });
    res.json(results);
  } catch (error) {
    console.error('❌ Errore nella rotta /api/mongo-summary:', error);
    res.status(500).json({ error: 'Errore interno nel recupero dati da MongoDB' });
  }
});

module.exports = router;
