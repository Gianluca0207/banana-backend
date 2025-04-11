const express = require('express');
const router = express.Router();
const SummaryExporter = require('../models/SummaryExporter');

router.get('/', async (req, res) => {
  try {
    const { week, country, exporter, port } = req.query;

    const query = {};
    if (week && week !== 'All') query.week = parseInt(week);
    if (country && country !== 'All') query.country = country;
    if (exporter && exporter !== 'All') query.exporter = exporter;
    if (port && port !== 'All') query.destino = port;

    const isGenericQuery =
      week && week !== 'All' &&
      (!country || country === 'All') &&
      (!port || port === 'All') &&
      (!exporter || exporter === 'All');

    const queryBuilder = SummaryExporter.find(query).sort({ week: -1 });
    if (isGenericQuery) queryBuilder.limit(100);

    const results = await queryBuilder;
    res.json(results);
  } catch (error) {
    console.error('❌ Errore nella rotta /api/mongo-summary:', error);
    res.status(500).json({ error: 'Errore interno nel recupero dati da MongoDB' });
  }
});

module.exports = router;
