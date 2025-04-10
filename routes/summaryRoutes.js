const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const path = require('path');

// 📁 Percorso del file Excel
const filePath = path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx');

// 📌 Funzione per generare il riassunto per un determinato WK
const generateSummary = (wk) => {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets['BASE'];
  const data = xlsx.utils.sheet_to_json(sheet);

  // Filtra i dati per la settimana selezionata (WK)
  const filteredData = data.filter(item => item.WK === wk);

  const vessels = {};
  const exporters = {};
  let total22XU = 0;
  let total208 = 0;
  const countries = new Set();
  const ships = new Set();
  const consignees = new Set();

  filteredData.forEach(item => {
    if (item['22XU']) total22XU += item['22XU'];
    if (item['208']) total208 += item['208'];
    if (item.PAIS) countries.add(item.PAIS);
    if (item.BUQUES) ships.add(item.BUQUES);
    if (item.CONSIGNATARIO) consignees.add(item.CONSIGNATARIO);

    if (item.BUQUES) {
      if (!vessels[item.BUQUES]) vessels[item.BUQUES] = 0;
      vessels[item.BUQUES] += item['22XU'] || 0;
    }

    if (item.EXPORTADORES) {
      if (!exporters[item.EXPORTADORES]) exporters[item.EXPORTADORES] = 0;
      exporters[item.EXPORTADORES] += item['TOTAL GENERAL'] || 0;
    }
  });

  const topVessels = Object.entries(vessels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([vessel, quantity]) => ({ vessel, quantity }));

  const topExporters = Object.entries(exporters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([exporter, quantity]) => ({ exporter, quantity }));

  const summary = {
    week: wk,
    topVessels,
    topExporters,
    generalStats: {
      total22XU,
      total208,
      totalConsignees: consignees.size,
      totalCountries: countries.size,
      totalShips: ships.size
    }
  };

  return summary;
};

// ✅ GET /api/summary/:wk – Riassunto di una settimana specifica
router.get('/:wk', (req, res) => {
  const wk = parseInt(req.params.wk);
  if (isNaN(wk)) {
    return res.status(400).json({ error: 'Invalid WK provided' });
  }

  try {
    const summary = generateSummary(wk);
    res.json(summary);
  } catch (error) {
    console.error('❌ Errore nel generare il riassunto:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ✅ GET /api/summary/filters/available – Tutte le settimane e i paesi disponibili
router.get('/filters/available', (req, res) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['BASE'];
    const data = xlsx.utils.sheet_to_json(sheet);

    const weeks = [...new Set(data.map(item => item.WK))].sort((a, b) => a - b);
    const countries = [...new Set(data.map(item => item.PAIS))].sort();

    res.json({ weeks, countries });
  } catch (error) {
    console.error('❌ Errore caricamento filtri:', error);
    res.status(500).json({ error: 'Errore nel caricamento dei filtri' });
  }
});

const fs = require('fs');

// 📁 Percorso del file Excel (riutilizzo della dichiarazione esistente)

// ✅ GET /api/summary/download/estadisticas – Scarica il file Excel
router.get('/download/estadisticas', (req, res) => {
  // Verifica se il file esiste
  if (!fs.existsSync(filePath)) {
    console.error('❌ File non trovato:', filePath);
    return res.status(404).json({ error: 'File non trovato' });
  }

  // Se il file esiste, eseguiamo il download
  res.download(filePath, 'ESTADISTICAS_COM_2025.xlsx', (err) => {
    if (err) {
      console.error('❌ Errore durante il download del file:', err);
      return res.status(500).json({ error: 'Errore durante il download del file' });
    }
    console.log('✅ File scaricato correttamente');
  });
});

module.exports = router;

