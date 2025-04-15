const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const SummaryExporter = require('../models/SummaryExporter');
const SummaryConoSur = require('../models/SummaryConoSur');

// Inizializza l'autenticazione
let auth;
try {
  console.log('🔄 Inizializzazione autenticazione Google Drive...');
  // Usa il percorso corretto per Render
  const credentialsPath = process.env.NODE_ENV === 'production' 
    ? '/opt/render/project/src/config/gdrive-creds.json'
    : path.join(__dirname, '../config/gdrive-creds.json');
  
  console.log('🔍 Percorso credenziali:', credentialsPath);
  const CREDENTIALS = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  
  auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  
  console.log('✅ Autenticazione Google Drive inizializzata con successo');
} catch (error) {
  console.error('❌ Errore nell\'inizializzazione dell\'autenticazione:', error);
  throw error;
}

const drive = google.drive('v3');

// ... rest of the existing code ... 