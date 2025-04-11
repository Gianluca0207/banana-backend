const express = require('express');
const router = express.Router();
const SummaryExporter = require('../models/SummaryExporter');

router.get('/', async (req, res) => {
  try {
    const { week, country, destino, exporter, limit } = req.query;
    const query = {};
    
    // Filtri
    if (week) query.week = Number(week);
    if (country && country !== 'All') query.country = country;
    if (destino && destino !== 'All') query.destino = destino;
    if (exporter && exporter !== 'All') query.exporter = exporter;
    
    // Log the query for debugging
    console.log('MongoDB query:', JSON.stringify(query));
    console.log('Requested limit:', limit);
    
    // Build the query with sort
    const queryBuilder = SummaryExporter.find(query).sort({ week: -1, boxes: -1 });
    
    // Apply limit if specified, otherwise NO LIMIT to get ALL records
    if (limit && !isNaN(parseInt(limit))) {
      queryBuilder.limit(parseInt(limit));
    }
    // No default limit - get all records if limit not specified
    
    const data = await queryBuilder.exec();
    console.log(`Fetched ${data.length} records from MongoDB`);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching summary data:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router;
