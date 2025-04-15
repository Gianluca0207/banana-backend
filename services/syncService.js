const { getLatestExcelFileFromFolder } = require('./googleDriveService');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configurazione delle cartelle e percorsi
const CONFIG = {
  exporters: {
    folderId: '1M7aq8pWKVmW28URMlp1PwQ87-ar05_iN',
    filePath: path.join(__dirname, '../data/exporters.xlsx'),
    importScript: path.join(__dirname, '../scripts/importSummary.js')
  },
  forecast: {
    folderId: '1bpXUyk1MlB3Zsx4Z6SBXZzr3efJfeDcy',
    filePath: path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx'),
    importScript: path.join(__dirname, '../scripts/importSummary.js')
  },
  conoSur: {
    folderId: '1YY1eN8TYDDINZ-rFOFbjFUZ9urfv2Nxj',
    filePath: path.join(__dirname, '../data/ESTADISTICAS COM 2025 CONO SUR.xlsx'),
    importScript: path.join(__dirname, '../scripts/importSummaryConoSur.js')
  },
  basicExporters: {
    folderId: '1M7aq8pWKVmW28URMlp1PwQ87-ar05_iN',
    filePath: path.join(__dirname, '../data/exporters.xlsx'),
    importScript: path.join(__dirname, '../scripts/importExporters.js')
  }
};

// Funzione per scaricare e salvare un file
async function downloadAndSaveFile(folderId, destinationPath) {
  try {
    const workbook = await getLatestExcelFileFromFolder(folderId);
    const buffer = Buffer.from(
      require('xlsx').write(workbook, { type: 'buffer', bookType: 'xlsx' })
    );
    fs.writeFileSync(destinationPath, buffer);
    console.log(`✅ File scaricato e salvato: ${destinationPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Errore nel download del file: ${error.message}`);
    return false;
  }
}

// Funzione per eseguire uno script di importazione
function runImportScript(scriptPath) {
  return new Promise((resolve, reject) => {
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Errore nell'esecuzione dello script ${scriptPath}:`, error);
        reject(error);
        return;
      }
      console.log(`✅ Script eseguito con successo: ${scriptPath}`);
      console.log(stdout);
      resolve();
    });
  });
}

// Funzione principale di sincronizzazione
async function syncAll() {
  console.log('🚀 Inizio sincronizzazione completa...');
  
  for (const [key, config] of Object.entries(CONFIG)) {
    console.log(`\n📥 Sincronizzazione ${key}...`);
    
    // 1. Download del file
    const downloadSuccess = await downloadAndSaveFile(config.folderId, config.filePath);
    if (!downloadSuccess) {
      console.error(`❌ Download fallito per ${key}, salto l'importazione`);
      continue;
    }
    
    // 2. Importazione in MongoDB
    try {
      await runImportScript(config.importScript);
      console.log(`✅ Importazione completata per ${key}`);
    } catch (error) {
      console.error(`❌ Importazione fallita per ${key}:`, error);
    }
  }
  
  console.log('\n✅ Sincronizzazione completata!');
}

module.exports = {
  syncAll
}; 