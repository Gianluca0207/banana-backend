const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const ExporterPrice = require('../models/ExporterPrice');

// Connessione a MongoDB
mongoose.connect('mongodb+srv://bananatracker:Gp02072001@cluster0.qvz8ays.mongodb.net/bananadatabase?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const filePath = path.join(__dirname, '../data/exporters.xlsx');

// Funzione per convertire numeri Excel in formato Data
const excelDateToJSDate = (serial) => {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

async function importExportersData() {
  try {
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

      // Elimina i dati esistenti per questo tipo di scatola
      await ExporterPrice.deleteMany({ boxType });
      
      // Inserisci i nuovi dati
      await ExporterPrice.insertMany(formatted);

      console.log(`✅ Importati ${formatted.length} prezzi per ${boxType}`);
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Errore durante l\'importazione prezzi exporters:', error);
    mongoose.disconnect();
  }
}

importExportersData(); 