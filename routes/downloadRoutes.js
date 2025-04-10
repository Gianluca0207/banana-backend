const express = require('express');
const path = require('path');
const router = express.Router();

// ✅ Route per scaricare il file ESTADISTICAS_COM_2025.xlsx
router.get('/forecast', (req, res) => {
  const filePath = path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx');  // Controlla questo percorso
  res.download(filePath, 'ESTADISTICAS_COM_2025.xlsx', (err) => {
    if (err) {
      console.error('❌ Errore nel download:', err);
      res.status(500).send('Errore durante il download');
    } else {
      console.log('✅ File scaricato con successo');
    }
  });
});

module.exports = router;
