const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { uploadFile } = require('../utils/driveUtils');

// Funzione per calcolare l'hash del file
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Funzione per attendere un certo numero di millisecondi
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
      if (!fs.existsSync(file.filePath)) {
        throw new Error(`File non trovato: ${file.filePath}`);
      }
      
      // Calcola e mostra l'hash del file per debug
      const fileHash = calculateFileHash(file.filePath);
      const fileSize = fs.statSync(file.filePath).size;
      console.log(`⏳ Aggiornamento di ${file.fileName} in corso...`);
      console.log(`   Hash: ${fileHash}, Dimensione: ${fileSize} bytes`);
      
      // Carica il file
      const result = await uploadFile(file.filePath, file.mimeType, file.fileName, file.fileId);
      console.log(`✅ File aggiornato: ${file.fileName} (ID: ${result.id})`);
      successCount++;
      
      // Attendi 5 secondi tra un caricamento e l'altro per dare tempo a Google Drive
      console.log(`   Attendi 5 secondi prima del prossimo file...`);
      await sleep(5000);
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
    console.log('🔍 Se i file non appaiono aggiornati su Google Drive:');
    console.log('   1. Svuota la cache del browser (CTRL+F5 o CMD+SHIFT+R)');
    console.log('   2. Controlla che i file abbiano permessi di visualizzazione corretti');
    console.log('   3. Attendi qualche minuto per la propagazione delle modifiche');
  }
};

updateAllFiles();
