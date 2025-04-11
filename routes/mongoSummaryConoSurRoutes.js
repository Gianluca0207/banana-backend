const express = require('express');
const router = express.Router();
const SummaryConoSur = require('../models/SummaryConoSur');

router.get('/', async (req, res) => {
  try {
    const { week, country, destino, exporter } = req.query;
    const query = {};
    
    // Filtri
    if (week) query.week = Number(week);
    if (country && country !== 'All') query.country = country;
    if (destino && destino !== 'All') query.destino = destino;
    if (exporter && exporter !== 'All') query.exporter = exporter;
    
    // Controllo se la query è troppo generica
    const isGenericQuery = (!week) && 
      (!country || country === 'All') && 
      (!destino || destino === 'All') && 
      (!exporter || exporter === 'All');
    
    const queryBuilder = SummaryConoSur.find(query).sort({ week: -1 });
    if (isGenericQuery) queryBuilder.limit(100);
    
    const data = await queryBuilder.exec();
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching Cono Sur data:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router;
