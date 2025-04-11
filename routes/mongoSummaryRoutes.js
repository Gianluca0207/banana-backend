const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const NodeCache = require('node-cache');

// Implementa cache con TTL di 1 ora (3600 secondi)
const summaryCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Definisci il modello per i dati di riepilogo
const Summary = mongoose.model(
  'Summary',
  new mongoose.Schema({
    week: Number,
    exporter: String,
    country: String,
    destino: String,
    consignee: String,
    boxes: Number
  }),
  'summaryexporters' // Collezione effettiva nel database
);

// Rotta per ottenere tutti i dati di riepilogo con paginazione e filtri
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, week, country, destino, exporter } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Crea chiave di cache basata sui parametri
    const cacheKey = `summary_${pageNum}_${limitNum}_${week || 'all'}_${country || 'all'}_${destino || 'all'}_${exporter || 'all'}`;
    
    // Controlla se i dati sono in cache
    const cachedData = summaryCache.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache hit per ${cacheKey}`);
      return res.json(cachedData);
    }
    
    console.log(`🔄 Cache miss per ${cacheKey}, caricamento dal database...`);
    
    // Costruisci il filtro di query
    const filter = {};
    if (week) filter.week = parseInt(week);
    if (country && country !== 'All') filter.country = country;
    if (destino && destino !== 'All') filter.destino = destino;
    if (exporter && exporter !== 'All') filter.exporter = exporter;
    
    // Se richiesti solo metadati, restituisci solo conteggi e valori unici
    if (req.query.metadata === 'true') {
      // Esegui aggregate per ottenere valori unici e conteggi
      const [weeks, countries, destinos, exporters, total] = await Promise.all([
        Summary.distinct('week'),
        Summary.distinct('country'),
        Summary.distinct('destino'),
        Summary.distinct('exporter'),
        Summary.countDocuments(filter)
      ]);
      
      const metadata = {
        total,
        weeks: weeks.sort((a, b) => a - b),
        countries: countries.sort(),
        destinos: destinos.sort(),
        exporters: exporters.sort()
      };
      
      // Salva in cache e restituisci
      summaryCache.set(`summary_metadata`, metadata);
      return res.json(metadata);
    }
    
    // Calcola total count per la paginazione
    const total = await Summary.countDocuments(filter);
    
    // Esegui query paginata e ordinata
    const data = await Summary.find(filter)
      .sort({ boxes: -1 }) // Ordina per boxes discendente
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    
    // Costruisci risposta con metadati di paginazione
    const result = {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    };
    
    // Salva in cache
    summaryCache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching summary data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Nuova rotta per ottenere solo i metadati (week, country, port, exporter)
router.get('/metadata', async (req, res) => {
  try {
    // Controlla se i dati sono in cache
    const cachedData = summaryCache.get('summary_metadata');
    if (cachedData) {
      console.log(`✅ Cache hit per summary_metadata`);
      return res.json(cachedData);
    }
    
    console.log(`🔄 Cache miss per summary_metadata, caricamento dal database...`);
    
    // Esegui aggregate per ottenere valori unici
    const [weeks, countries, destinos, exporters, total] = await Promise.all([
      Summary.distinct('week'),
      Summary.distinct('country'),
      Summary.distinct('destino'),
      Summary.distinct('exporter'),
      Summary.estimatedDocumentCount()
    ]);
    
    const metadata = {
      total,
      weeks: weeks.sort((a, b) => a - b),
      countries: countries.sort(),
      destinos: destinos.sort(),
      exporters: exporters.sort()
    };
    
    // Salva in cache
    summaryCache.set('summary_metadata', metadata);
    
    res.json(metadata);
  } catch (error) {
    console.error('❌ Error fetching summary metadata:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Rotta per invalidare la cache
router.post('/invalidate-cache', async (req, res) => {
  try {
    summaryCache.flushAll();
    console.log('🔄 Summary cache invalidata');
    res.json({ message: 'Cache invalidated successfully' });
  } catch (error) {
    console.error('❌ Error invalidating cache:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
