const express = require('express');
const router = express.Router();
const SummaryExporter = require('../models/SummaryExporter');

router.get('/', async (req, res) => {
  try {
    const { week, country, destino, exporter } = req.query;
    const query = {};

    if (week) query.week = Number(week);
    if (country && country !== 'All') query.country = country;
    if (destino && destino !== 'All') query.destino = destino;
    if (exporter && exporter !== 'All') query.exporter = exporter;

    console.log('📥 Query:', query);

    const data = await SummaryExporter.find(query)
      .sort({ week: -1, boxes: -1 })
      .exec();

    if (!data || data.length === 0) {
      console.log('⚠️ Nessun dato trovato per la query:', query);
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Errore fetch mongo-summary:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
