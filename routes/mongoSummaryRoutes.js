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
    // Ottieni i valori unici per ogni campo con gestione degli errori
    const [weeks, countries, ports, exporters] = await Promise.all([
      SummaryExporter.distinct('week').catch(() => []),
      SummaryExporter.distinct('country').catch(() => []),
      SummaryExporter.distinct('destino').catch(() => []),
      SummaryExporter.distinct('exporter').catch(() => [])
    ]);

    // Filtra valori null/undefined e ordina
    const cleanWeeks = [...new Set(weeks.filter(w => w != null))].sort((a, b) => a - b);
    const cleanCountries = [...new Set(countries.filter(c => c != null))].sort();
    const cleanPorts = [...new Set(ports.filter(p => p != null))].sort();
    const cleanExporters = [...new Set(exporters.filter(e => e != null))].sort();

    res.json({
      weeks: cleanWeeks,
      countries: ['All', ...cleanCountries],
      ports: ['All', ...cleanPorts],
      exporters: ['All', ...cleanExporters]
    });
  } catch (error) {
    console.error('❌ Errore fetch filters:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: error.message,
      details: 'Error fetching filters from database'
    });
  }
});

module.exports = router;
