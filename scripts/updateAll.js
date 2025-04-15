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
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of filesToUpload) {
    try {
      // Verifica se il file esiste prima di tentare l'upload
      if (!require('fs').existsSync(file.filePath)) {
        throw new Error(`File non trovato: ${file.filePath}`);
      }
      
      console.log(`⏳ Aggiornamento di ${file.fileName} in corso...`);
      const result = await uploadFile(file.filePath, file.mimeType, file.fileName, file.fileId);
      console.log(`✅ File aggiornato: ${file.fileName} (ID: ${result.id})`);
      successCount++;
    } catch (err) {
      console.error(`❌ Errore aggiornando ${file.fileName}:`);
      console.error(`   Dettagli: ${err.message}`);
      if (err.stack) {
        console.error(`   Stack: ${err.stack.split('\n')[1]}`);
      }
      errorCount++;
    }
  }
  
  console.log('\n📊 Riepilogo:');
  console.log(`   ✅ File aggiornati con successo: ${successCount}/${filesToUpload.length}`);
  if (errorCount > 0) {
    console.log(`   ❌ File non aggiornati: ${errorCount}`);
    console.log('\n⚠️ Alcuni file non sono stati aggiornati. Controlla gli errori sopra indicati.');
  } else {
    console.log('\n✅ Tutti i file sono stati aggiornati con successo!');
  }
};

updateAllFiles();
