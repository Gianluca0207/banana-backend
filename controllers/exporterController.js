const xlsx = require('xlsx');
const path = require('path');
const NodeCache = require('node-cache');

// Implementazione di un cache con TTL di 1 ora per i dati Excel
const excelDataCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Funzione per convertire numeri Excel in formato Data
const excelDateToJSDate = (serial) => {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

exports.getSheetData = (req, res) => {
    try {
        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specifies the name of the sheet (BoxType)." });
        }

        // Parametri di paginazione
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 0; // 0 = tutti i dati
        
        // Verifica se i dati sono già in cache
        const cacheKey = `excel_data_${sheetName}`;
        let jsonData = excelDataCache.get(cacheKey);
        
        if (!jsonData) {
            console.log(`🔄 Cache miss per ${cacheKey}, caricamento da file...`);
            const filePath = path.join(__dirname, '../data/exporters.xlsx');
            const workbook = xlsx.readFile(filePath);

            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                return res.status(404).json({ message: "Sheet not found." });
            }

            // Ottimizzazione: Converti una sola volta e memorizza in cache
            jsonData = xlsx.utils.sheet_to_json(worksheet);

            jsonData = jsonData.map(item => {
                if (item['Week'] && typeof item['Week'] === 'number') {
                    const date = excelDateToJSDate(item['Week']);
                    item['Week'] = date.toISOString().split('T')[0];
                }
                return item;
            });
            
            // Memorizza i dati in cache
            excelDataCache.set(cacheKey, jsonData);
        } else {
            console.log(`✅ Cache hit per ${cacheKey}`);
        }

        // Implementa la paginazione
        let paginatedData = jsonData;
        const total = jsonData.length;
        
        if (limit > 0) {
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            paginatedData = jsonData.slice(startIndex, endIndex);
        }
        
        // Invia i dati paginati con i metadata di paginazione
        res.json({
            data: paginatedData,
            pagination: {
                total,
                page,
                limit: limit > 0 ? limit : total,
                pages: limit > 0 ? Math.ceil(total / limit) : 1
            }
        });
    } catch (error) {
        console.error('❌ Error retrieving sheet data:', error);
        res.status(500).json({ message: "Error retrieving sheet data." });
    }
};

exports.getWeeks = (req, res) => {
    try {
        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specifies the name of the sheet (BoxType)." });
        }

        // Verifica se i dati sono già in cache
        const cacheKey = `excel_weeks_${sheetName}`;
        let weeks = excelDataCache.get(cacheKey);
        
        if (!weeks) {
            console.log(`🔄 Cache miss per ${cacheKey}, calcolo settimane...`);
            
            // Recupera tutti i dati (preferibilmente dalla cache)
            const dataKey = `excel_data_${sheetName}`;
            let jsonData = excelDataCache.get(dataKey);
            
            if (!jsonData) {
                // Se i dati non sono in cache, li carica
                const filePath = path.join(__dirname, '../data/exporters.xlsx');
                const workbook = xlsx.readFile(filePath);
                
                const worksheet = workbook.Sheets[sheetName];
                if (!worksheet) {
                    return res.status(404).json({ message: "Sheet not found." });
                }
                
                jsonData = xlsx.utils.sheet_to_json(worksheet);
                excelDataCache.set(dataKey, jsonData);
            }
            
            // Estrae le settimane uniche
            weeks = Array.from(new Set(
                jsonData.filter(item => item['Week Number'] !== undefined)
                        .map(item => item['Week Number'].toString())
            ));
            
            // Memorizza le settimane in cache
            excelDataCache.set(cacheKey, weeks);
        } else {
            console.log(`✅ Cache hit per ${cacheKey}`);
        }

        res.json(weeks);
    } catch (error) {
        console.error('❌ Errore nel recupero delle settimane:', error);
        res.status(500).json({ message: "Errore nel recupero delle settimane." });
    }
};

// Metodo per invalidare manualmente la cache
exports.invalidateCache = (req, res) => {
    try {
        const key = req.query.key;
        
        if (key) {
            // Invalida una chiave specifica
            excelDataCache.del(key);
            console.log(`🔄 Cache invalidata per ${key}`);
        } else {
            // Invalida tutta la cache
            excelDataCache.flushAll();
            console.log(`🔄 Cache completamente invalidata`);
        }
        
        res.json({ message: "Cache invalidata con successo" });
    } catch (error) {
        console.error('❌ Errore nell\'invalidazione della cache:', error);
        res.status(500).json({ message: "Errore nell'invalidazione della cache." });
    }
};
