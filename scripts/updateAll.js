const path = require('path');
const { uploadFile } = require('../utils/driveUtils');

const filesToUpload = [
  {
    filePath: path.join(__dirname, '../data/exporters.xlsx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName: 'exporters.xlsx',
    fileId: '1jP2VdfJqJoOpjflQJn7YCWu8cl2cszrh',
  },
  {
    filePath: path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName: 'ESTADISTICAS_COM_2025.xlsx',
    fileId: '1WBuq57uyf2KU71vukPJnfN2O6KdtU0jP',
  },
  {
    filePath: path.join(__dirname, '../data/ESTADISTICAS COM 2025 CONO SUR.xlsx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName: 'ESTADISTICAS COM 2025 CONO SUR.xlsx',
    fileId: '11GHgaNnwV-FaS_fWs-4O1vB-yVwNv061',
  }
];

const updateAllFiles = async () => {
  console.log('🚀 Inizio aggiornamento file su Google Drive...\n');
  for (const file of filesToUpload) {
    try {
      await uploadFile(file.filePath, file.mimeType, fileName = file.fileName, file.fileId);
      console.log(`✅ File aggiornato: ${file.fileName}`);
    } catch (err) {
      console.error(`❌ Errore aggiornando ${file.fileName}:`, err.message);
    }
  }
  console.log('\n✅ Aggiornamento completato!');
};

updateAllFiles();
