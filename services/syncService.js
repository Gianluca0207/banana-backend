const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const SummaryExporter = require('../models/SummaryExporter');
const SummaryConoSur = require('../models/SummaryConoSur');

const drive = google.drive('v3');

// Configurazione delle cartelle e file da sincronizzare
const FILES_TO_SYNC = [
  {
    folderId: '1M7aq8pWKVmW28URMlp1PwQ87-ar05_iN',
    fileName: 'exporters.xlsx',
    localPath: path.join(__dirname, '../data/exporters.xlsx'),
    importFunction: async (filePath) => {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets['BoxType'];
      const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

      const formatted = data.map(row => ({
        week: row.Week,
        exporter: row.Exporter,
        consignee: row.Consignee,
        country: row.Country,
        boxes: row.Boxes || 0,
        destino: row.Destino || 'Unknown Port'
      })).filter(item =>
        item.week != null &&
        item.exporter?.toString().trim() !== '' &&
        item.country?.toString().trim() !== '' &&
        item.boxes != null
      );

      await SummaryExporter.deleteMany({});
      await SummaryExporter.insertMany(formatted);
      console.log(`✅ Importati ${formatted.length} righe da exporters.xlsx in MongoDB`);
    }
  },
  {
    folderId: '1bpXUyk1MlB3Zsx4Z6SBXZzr3efJfeDcy',
    fileName: 'ESTADISTICAS_COM_2025.xlsx',
    localPath: path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx'),
    importFunction: async (filePath) => {
      const workbook = xlsx.readFile(filePath);
      const sheetName = Object.keys(workbook.Sheets).find(name => name.trim().toLowerCase() === 'base');
      if (!sheetName) throw new Error("❌ Foglio 'BASE' non trovato nel file Excel.");

      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

      const headerKeys = Object.keys(data[0] || {});
      const destinoKey = headerKeys.find(k => k.toLowerCase().trim() === 'destino') || 'DESTINO';

      const formatted = data.map(row => ({
        week: row.WK,
        exporter: row.EXPORTADORES,
        consignee: row.CONSIGNATARIO,
        country: row.PAIS,
        boxes: row["TOTAL GENERAL"],
        destino: row[destinoKey] || 'Unknown Port',
        buque: row.BUQUES || '',
        tipo22XU: row['22XU'] || 0,
        tipo208: row['208'] || 0,
      })).filter(item =>
        item.week != null &&
        item.exporter?.toString().trim() !== '' &&
        item.country?.toString().trim() !== '' &&
        item.boxes != null
      );

      await SummaryExporter.deleteMany({});
      await SummaryExporter.insertMany(formatted);
      console.log(`✅ Importati ${formatted.length} righe da ESTADISTICAS_COM_2025.xlsx in MongoDB`);
    }
  },
  {
    folderId: '1YY1eN8TYDDINZ-rFOFbjFUZ9urfv2Nxj',
    fileName: 'ESTADISTICAS COM 2025 CONO SUR.xlsx',
    localPath: path.join(__dirname, '../data/ESTADISTICAS COM 2025 CONO SUR.xlsx'),
    importFunction: async (filePath) => {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets['BASE'];
      const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

      const headerKeys = Object.keys(data[0] || {});
      const destinoKey = headerKeys.find(k => k.toLowerCase().trim() === 'destino') || 'DESTINO';

      const formatted = data.map(row => ({
        week: row.WK,
        exporter: row.EXPORTADORES,
        consignee: row.CONSIGNATARIO,
        country: row.PAIS,
        boxes: row["TOTAL GENERAL"],
        destino: row[destinoKey] || 'Unknown Port',
        buque: row.BUQUES || '',
        tipo22XU: row['22XU'] || 0,
        tipo208: row['208'] || 0,
      })).filter(item =>
        item.week != null &&
        item.exporter?.toString().trim() !== '' &&
        item.country?.toString().trim() !== '' &&
        item.boxes != null
      );

      await SummaryConoSur.deleteMany({});
      await SummaryConoSur.insertMany(formatted);
      console.log(`✅ Importati ${formatted.length} righe da CONO SUR in MongoDB`);
    }
  }
];

// Cache per tenere traccia dell'ultima modifica
const lastModifiedCache = new Map();

// Funzione per ottenere l'ultima modifica di un file su Google Drive
async function getLastModifiedTime(folderId, fileName) {
  const authClient = await auth.getClient();
  
  const response = await drive.files.list({
    auth: authClient,
    q: `'${folderId}' in parents and name='${fileName}'`,
    fields: 'files(modifiedTime)',
    pageSize: 1
  });

  const files = response.data.files;
  if (!files || files.length === 0) {
    throw new Error(`File ${fileName} non trovato nella cartella`);
  }

  return new Date(files[0].modifiedTime);
}

// Funzione per scaricare un file da Google Drive
async function downloadFile(folderId, fileName, localPath) {
  const authClient = await auth.getClient();
  
  const response = await drive.files.list({
    auth: authClient,
    q: `'${folderId}' in parents and name='${fileName}'`,
    fields: 'files(id)',
    pageSize: 1
  });

  const files = response.data.files;
  if (!files || files.length === 0) {
    throw new Error(`File ${fileName} non trovato nella cartella`);
  }

  const fileId = files[0].id;
  const res = await drive.files.get({
    auth: authClient,
    fileId: fileId,
    alt: 'media'
  }, { responseType: 'stream' });

  const chunks = [];
  await new Promise((resolve, reject) => {
    res.data.on('data', chunk => chunks.push(chunk));
    res.data.on('end', resolve);
    res.data.on('error', reject);
  });

  const buffer = Buffer.concat(chunks);
  fs.writeFileSync(localPath, buffer);
  console.log(`✅ File ${fileName} scaricato con successo`);
}

// Funzione principale di sincronizzazione
async function syncFiles() {
  console.log('🔄 Inizio sincronizzazione automatica...');
  
  for (const file of FILES_TO_SYNC) {
    try {
      // Ottieni l'ultima modifica del file su Google Drive
      const lastModified = await getLastModifiedTime(file.folderId, file.fileName);
      
      // Se il file non è in cache o è stato modificato
      if (!lastModifiedCache.has(file.fileName) || 
          lastModified > lastModifiedCache.get(file.fileName)) {
        
        console.log(`📥 File ${file.fileName} modificato, scaricamento in corso...`);
        await downloadFile(file.folderId, file.fileName, file.localPath);
        
        // Importa i dati in MongoDB
        console.log(`📊 Importazione dati di ${file.fileName} in MongoDB...`);
        await file.importFunction(file.localPath);
        
        lastModifiedCache.set(file.fileName, lastModified);
      } else {
        console.log(`⏭️ File ${file.fileName} non modificato, skip`);
      }
    } catch (error) {
      console.error(`❌ Errore durante la sincronizzazione di ${file.fileName}:`, error);
    }
  }
  
  console.log('✅ Sincronizzazione completata');
}

// Inizializza l'autenticazione
let auth;
try {
  const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
} catch (error) {
  console.error('❌ Errore nell\'inizializzazione dell\'autenticazione:', error);
}

module.exports = {
  syncFiles
}; 