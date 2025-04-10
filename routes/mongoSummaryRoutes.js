const express = require('express');
const router = express.Router();
const SummaryExporter = require('../models/SummaryExporter');

// ✅ Rotta GET /api/mongo-summary?week=14&country=Ecuador
router.get('/', async (req, res) => {
  try {
    const { week, country, exporter, port } = req.query;
    const query = {};

    if (week) query.week = parseInt(week);
    if (country) query.country = country;
    if (exporter) query.exporter = exporter;
    if (port) query.destino = port;

    const results = await SummaryExporter.find(query).limit(1000); // limit per sicurezza

    res.json(results);
  } catch (error) {
    console.error('❌ Errore nel recupero dei dati MongoDB:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dati summary da MongoDB' });
  }
});

module.exports = router;
