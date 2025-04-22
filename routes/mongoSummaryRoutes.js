const express = require('express');
const router = express.Router();
const SummaryExporter = require('../models/SummaryExporter');

// Route per ottenere i dati con paginazione
router.get('/', async (req, res) => {
  try {
    const { 
      week, 
      country, 
      destino, 
      exporter,
      page = 1,
      limit = 500
    } = req.query;

    const query = {};

    // Costruisci la query di filtro
    if (week) query.week = Number(week);
    if (country && country !== 'All') query.country = country;
    if (destino && destino !== 'All') query.destino = destino;
    if (exporter && exporter !== 'All') query.exporter = exporter;

    console.log('📥 Query:', query);

    // Calcola skip per la paginazione
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Ottieni il conteggio totale dei record
    const total = await SummaryExporter.countDocuments(query);

    // Ottieni i dati con paginazione
    const data = await SummaryExporter.find(query)
      .sort({ week: -1, boxes: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    if (!data || data.length === 0) {
      console.log('⚠️ Nessun dato trovato per la query:', query);
    }

    // Invia la risposta con i dati e le informazioni di paginazione
    res.json({
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Errore fetch mongo-summary:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Route per ottenere i filtri disponibili
router.get('/filters', async (req, res) => {
  try {
    const { week, country, destino, exporter } = req.query;
    const query = {};

    // Applica i filtri esistenti
    if (week) query.week = Number(week);
    if (country && country !== 'All') query.country = country;
    if (destino && destino !== 'All') query.destino = destino;
    if (exporter && exporter !== 'All') query.exporter = exporter;

    // Ottieni i valori unici per ogni campo
    const [weeks, countries, ports, exporters] = await Promise.all([
      SummaryExporter.distinct('week', query).sort((a, b) => a - b),
      SummaryExporter.distinct('country', query).sort(),
      SummaryExporter.distinct('destino', query).sort(),
      SummaryExporter.distinct('exporter', query).sort()
    ]);

    res.json({
      weeks,
      countries: ['All', ...countries],
      ports: ['All', ...ports],
      exporters: ['All', ...exporters]
    });
  } catch (error) {
    console.error('❌ Errore fetch filters:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
