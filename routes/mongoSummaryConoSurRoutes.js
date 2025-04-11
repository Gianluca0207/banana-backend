const express = require('express');
const router = express.Router();
const SummaryConoSur = require('../models/SummaryConoSur');

router.get('/', async (req, res) => {
  try {
    const { week, country, exporter, port } = req.query;
    const query = {};
    if (week) query.week = parseInt(week);
    if (country) query.country = country;
    if (exporter) query.exporter = exporter;
    if (port) query.destino = port;

    const results = await SummaryConoSur.find(query).sort({ week: -1 }).limit(100);
    res.json(results);
  } catch (error) {
    console.error('❌ Errore nella rotta /api/mongo-summary-conosur:', error);
    res.status(500).json({ error: 'Errore nel caricamento dati da MongoDB' });
  }
});

module.exports = router;
