const express = require('express');
const fs = require('fs');
const path = require('path');
const { getLatestExcelFileFromFolder } = require('../services/googleDriveService');
const router = express.Router();

const syncFile = async (folderId, destinationPath, resLabel, res) => {
  try {
    const fileName = path.basename(destinationPath);
    const workbook = await getLatestExcelFileFromFolder(folderId, fileName);

    const buffer = Buffer.from(
      require('xlsx').write(workbook, { type: 'buffer', bookType: 'xlsx' })
    );

    fs.writeFileSync(destinationPath, buffer);

    console.log(`✅ ${resLabel} aggiornato:`, destinationPath);
    res.json({ success: true, message: `${resLabel} aggiornato con successo!` });
  } catch (error) {
    console.error(`❌ Errore aggiornamento ${resLabel}:`, error);
    res.status(500).json({ success: false, message: `Errore aggiornamento ${resLabel}`, error: error.message });
  }
};

// 🔁 Exporters
router.get('/sync/exporters', (req, res) => {
  const folderId = '1M7aq8pWKVmW28URMlp1PwQ87-ar05_iN';
  const filePath = path.join(__dirname, '../data/exporters.xlsx');
  syncFile(folderId, filePath, 'Exporters', res);
});

// 🔁 Estadisticas
router.get('/sync/forecst', (req, res) => {
  const folderId = '1bpXUyk1MlB3Zsx4Z6SBXZzr3efJfeDcy';
  const filePath = path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx');
  syncFile(folderId, filePath, 'Forecast', res);
});

// 🔁 Estadisticas CONO SUR
router.get('/sync/estadisticas', (req, res) => {
  const folderId = '1YY1eN8TYDDINZ-rFOFbjFUZ9urfv2Nxj';
  const filePath = path.join(__dirname, '../data/ESTADISTICAS COM 2025 CONO SUR.xlsx');
  syncFile(folderId, filePath, 'Estadísticas', res);
});

// ➕ Aggiungi altri come ti servono...

module.exports = router;
