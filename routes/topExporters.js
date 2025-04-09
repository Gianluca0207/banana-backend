const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/top', (req, res) => {
  const filePath = path.join(__dirname, '../data/topExporters.json');
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Errore nel leggere topExporters.json:', err);
      return res.status(500).json({ error: 'Errore nel leggere i dati.' });
    }

    try {
      const topExporters = JSON.parse(data);
      res.json({ topExporters });
    } catch (parseError) {
      console.error('Errore nel parsing JSON:', parseError);
      res.status(500).json({ error: 'Errore nel parsing dei dati.' });
    }
  });
});

module.exports = router;
