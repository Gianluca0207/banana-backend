const express = require('express');
const router = express.Router();
const SummaryExporter = require('../models/SummaryExporter');

router.get('/', async (req, res) => {
  try {
    const { week, country, destino, exporter, limit } = req.query;
    const query = {};

    if (week) query.week = Number(week);
    if (country && country !== 'All') query.country = country;
    if (destino && destino !== 'All') query.destino = destino;
    if (exporter && exporter !== 'All') query.exporter = exporter;

    const isGenericQuery = !week && (!country || country === 'All') && (!destino || destino === 'All') && (!exporter || exporter === 'All');
    
    const numericLimit = Number(limit);
    const hasValidLimit = !isNaN(numericLimit) && numericLimit > 0;
    const appliedLimit = hasValidLimit ? numericLimit : (isGenericQuery ? 100 : 0);

    console.log('📥 Query:', query, '| Limit:', appliedLimit);

    let queryBuilder = SummaryExporter.find(query).sort({ week: -1, boxes: -1 });
    if (appliedLimit > 0) queryBuilder = queryBuilder.limit(appliedLimit);

    const data = await queryBuilder.exec();

    res.json(data);
  } catch (error) {
    console.error('❌ Errore fetch mongo-summary:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
