const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const LRU = require('lru-cache');

// Cache per i dati degli exporters
const exportersCache = new Map();
let lastCacheUpdate = null;
let workbookCache = null;

// Cache per i dati dei fogli
const sheetDataCache = new LRU({
  max: 100,        // Massimo 100 items in cache
  maxAge: 3600000  // 1 ora di validità
});

// Cache per il workbook
let lastWorkbookUpdate = null;

// Funzione per convertire numeri Excel in formato Data
const excelDateToJSDate = (serial) => {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

// Funzione per aggiornare la cache
const updateCache = () => {
    try {
        const filePath = path.join(__dirname, '../data/exporters.xlsx');
        const stats = fs.statSync(filePath);
        const lastModified = stats.mtime;

        // Aggiorna la cache solo se il file è stato modificato
        if (!lastCacheUpdate || lastModified > lastCacheUpdate) {
            workbookCache = xlsx.readFile(filePath);
            lastCacheUpdate = new Date();
            exportersCache.clear();
            console.log('🔄 Cache degli exporters aggiornata');
        }
    } catch (error) {
        console.error('❌ Errore nell\'aggiornamento della cache:', error);
    }
};

// Funzione per aggiornare la cache del workbook
const updateWorkbookCache = () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);

  if (workbookCache && lastWorkbookUpdate && lastWorkbookUpdate > oneHourAgo) {
    return;
  }

  try {
    const filePath = path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx');
    workbookCache = xlsx.readFile(filePath);
    lastWorkbookUpdate = new Date();
    console.log('📦 Workbook cache aggiornata');
  } catch (error) {
    console.error('❌ Errore nell\'aggiornamento della cache del workbook:', error);
  }
};

exports.getSheetData = (req, res) => {
    try {
        updateCache();

        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specificare il nome del foglio (BoxType)." });
        }

        // Verifica se i dati sono già in cache
        const cacheKey = `sheet-data-${sheetName}`;
        const cachedData = sheetDataCache.get(cacheKey);
        if (cachedData) {
            console.log(`📦 Dati del foglio ${sheetName} serviti dalla cache`);
            return res.json(cachedData);
        }

        const worksheet = workbookCache.Sheets[sheetName];
        if (!worksheet) {
            return res.status(404).json({ message: "Foglio non trovato." });
        }

        let jsonData = xlsx.utils.sheet_to_json(worksheet);

        jsonData = jsonData.map(item => {
            if (item['Week'] && typeof item['Week'] === 'number') {
                const date = excelDateToJSDate(item['Week']);
                item['Week'] = date.toISOString().split('T')[0];
            }
            return item;
        });

        // Salva i dati in cache
        sheetDataCache.set(cacheKey, jsonData);
        
        console.log(`✅ Dati convertiti e inviati al frontend per il foglio ${sheetName}:`, jsonData.length, 'righe');
        res.json(jsonData);
    } catch (error) {
        console.error('❌ Errore nel recupero dei dati del foglio:', error);
        res.status(500).json({ message: "Errore nel recupero dei dati del foglio." });
    }
};

exports.getWeeks = (req, res) => {
    try {
        updateWorkbookCache();

        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specificare il nome del foglio (BoxType)." });
        }

        // Verifica se le settimane sono già in cache
        const cacheKey = `${sheetName}_weeks`;
        if (exportersCache.has(cacheKey)) {
            console.log(`📦 Settimane del foglio ${sheetName} servite dalla cache`);
            return res.json(exportersCache.get(cacheKey));
        }

        const worksheet = workbookCache.Sheets[sheetName];
        if (!worksheet) {
            return res.status(404).json({ message: "Foglio non trovato." });
        }

        let jsonData = xlsx.utils.sheet_to_json(worksheet);
        const weeks = Array.from(new Set(
            jsonData.filter(item => item['Week Number'] !== undefined)
                    .map(item => item['Week Number'].toString())
        ));

        // Salva le settimane in cache
        exportersCache.set(cacheKey, weeks);

        console.log("✅ Settimane estratte:", weeks.length);
        res.json(weeks);
    } catch (error) {
        console.error('❌ Errore nel recupero delle settimane:', error);
        res.status(500).json({ message: "Errore nel recupero delle settimane." });
    }
};

// Aggiungiamo una route per pulire la cache se necessario
exports.clearCache = (req, res) => {
  sheetDataCache.reset();
  workbookCache = null;
  lastWorkbookUpdate = null;
  console.log('🧹 Cache pulita');
  res.json({ message: 'Cache cleared successfully' });
};
