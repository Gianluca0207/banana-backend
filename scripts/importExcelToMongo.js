const xlsx = require('xlsx');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../config/mongodb');

// Schema per i dati degli exporter
const exporterSchema = new mongoose.Schema({
    sheetName: String,
    data: [{
        Week: String,
        'Week Number': String,
        // Altri campi verranno salvati come sono
    }]
}, { strict: false }); // strict: false permette di salvare campi non definiti nello schema

const Exporter = mongoose.model('Exporter', exporterSchema);

// Funzione per convertire numeri Excel in formato Data
const excelDateToJSDate = (serial) => {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

async function importExcelToMongo() {
    try {
        // Usa la connessione condivisa
        await connectDB();
        console.log('✅ Connected to MongoDB');

        const filePath = path.join(__dirname, '../data/exporters.xlsx');
        const workbook = xlsx.readFile(filePath);

        // Per ogni foglio nel workbook
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            let jsonData = xlsx.utils.sheet_to_json(worksheet);

            // Converti le date come fa il controller originale
            jsonData = jsonData.map(item => {
                if (item['Week'] && typeof item['Week'] === 'number') {
                    const date = excelDateToJSDate(item['Week']);
                    item['Week'] = date.toISOString().split('T')[0];
                }
                return item;
            });

            // Salva i dati in MongoDB
            await Exporter.findOneAndUpdate(
                { sheetName },
                { 
                    sheetName,
                    data: jsonData
                },
                { upsert: true, new: true }
            );

            console.log(`✅ Imported sheet ${sheetName} to MongoDB`);
        }

        console.log('✅ Import completed successfully');
    } catch (error) {
        console.error('❌ Error during import:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

importExcelToMongo(); 