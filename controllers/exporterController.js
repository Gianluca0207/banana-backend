const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Cache per i dati degli exporters
const exportersCache = new Map();
let lastCacheUpdate = null;
let workbookCache = null;

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

exports.getSheetData = (req, res) => {
    try {
        updateCache();

        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specificare il nome del foglio (BoxType)." });
        }

        // Verifica se i dati sono già in cache
        if (exportersCache.has(sheetName)) {
            console.log(`📦 Dati del foglio ${sheetName} serviti dalla cache`);
            return res.json(exportersCache.get(sheetName));
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
        exportersCache.set(sheetName, jsonData);
        
        console.log(`✅ Dati convertiti e inviati al frontend per il foglio ${sheetName}:`, jsonData.length, 'righe');
        res.json(jsonData);
    } catch (error) {
        console.error('❌ Errore nel recupero dei dati del foglio:', error);
        res.status(500).json({ message: "Errore nel recupero dei dati del foglio." });
    }
};

exports.getWeeks = (req, res) => {
    try {
        updateCache();

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
