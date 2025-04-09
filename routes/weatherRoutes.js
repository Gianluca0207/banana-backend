const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Add a simple test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Weather API is working!' });
});

router.get('/', (req, res) => {
  const filePath = path.join(__dirname, '../data/weatherData.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('❌ Errore nel leggere weatherData.json:', err);
      return res.status(500).json({ error: 'Errore nel leggere i dati meteo.' });
    }

    try {
      const weather = JSON.parse(data);
      res.json(weather);
    } catch (parseError) {
      console.error('❌ Errore nel parsing JSON:', parseError);
      res.status(500).json({ error: 'Errore nel parsing dei dati meteo.' });
    }
  });
});

module.exports = router;
