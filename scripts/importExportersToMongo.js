const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const ExporterPrice = require('../models/ExporterPrice');

// Funzione per convertire numeri Excel in formato Data
const excelDateToJSDate = (serial) => {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

async function connectToMongo() {
    try {
        await mongoose.connect('mongodb+srv://bananatracker:Gp02072001@cluster0.qvz8ays.mongodb.net/bananadatabase?retryWrites=true&w=majority&appName=Cluster0', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connesso a MongoDB');
    } catch (error) {
        console.error('❌ Errore connessione MongoDB:', error);
        throw error;
    }
}

async function importExportersData() {
    let mongoConnected = false;
    try {
        // Connessione a MongoDB
        await connectToMongo();
        mongoConnected = true;

        const filePath = path.join(__dirname, '../data/exporters.xlsx');
        const workbook = xlsx.readFile(filePath);
        console.log('📄 Nomi dei fogli presenti:', workbook.SheetNames);

        // Importa ogni foglio
        for (const boxType of workbook.SheetNames) {
            const sheet = workbook.Sheets[boxType];
            const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

            console.log(`📊 Righe lette da Excel (${boxType}):`, data.length);

            const formatted = data.map(row => ({
                weekNumber: row['Week Number'],
                week: excelDateToJSDate(row['Week']),
                price: row['Price'],
                change: row['Change'],
                boxType: boxType
            })).filter(item =>
                item.weekNumber != null &&
                item.price != null &&
                item.change != null
            );

            if (formatted.length === 0) {
                console.warn(`⚠️ Nessun dato valido trovato per ${boxType}`);
                continue;
            }

            // Elimina i dati esistenti per questo tipo di scatola
            await ExporterPrice.deleteMany({ boxType });
            
            // Inserisci i nuovi dati
            await ExporterPrice.insertMany(formatted);

            console.log(`✅ Importati ${formatted.length} prezzi per ${boxType}`);
        }
    } catch (error) {
        console.error('❌ Errore durante l\'importazione prezzi exporters:', error);
        throw error; // Propaga l'errore al chiamante
    } finally {
        if (mongoConnected) {
            try {
                await mongoose.disconnect();
                console.log('✅ Disconnesso da MongoDB');
            } catch (disconnectError) {
                console.error('❌ Errore durante la disconnessione da MongoDB:', disconnectError);
            }
        }
    }
}

// Esegui l'importazione solo se lo script viene chiamato direttamente
if (require.main === module) {
    importExportersData()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Importazione fallita:', error);
            process.exit(1);
        });
}

module.exports = importExportersData; 