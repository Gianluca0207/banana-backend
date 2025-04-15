const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const SummaryExporter = require('../models/SummaryExporter');

mongoose.connect('mongodb+srv://bananatracker:Gp02072001@cluster0.qvz8ays.mongodb.net/bananadatabase?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const filePath = path.join(__dirname, '../data/exporters.xlsx');

async function importExportersData() {
  try {
    const workbook = xlsx.readFile(filePath);
    console.log('📄 Nomi dei fogli presenti:', workbook.SheetNames);

    // Importa ogni foglio
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

      console.log(`📊 Righe lette da Excel (${sheetName}):`, data.length);

      const formatted = data.map(row => ({
        week: row['Week Number'],
        exporter: row['Exporter'],
        consignee: row['Consignee'],
        country: row['Country'],
        boxes: row['Boxes'],
        destino: row['Port'] || 'Unknown Port',
        tipo22XU: row['22XU'] || 0,
        tipo208: row['208'] || 0
      })).filter(item =>
        item.week != null &&
        item.exporter?.toString().trim() !== '' &&
        item.country?.toString().trim() !== '' &&
        item.boxes != null
      );

      // Elimina i dati esistenti per questo foglio
      await SummaryExporter.deleteMany({ sheet: sheetName });
      
      // Aggiungi il campo sheet ai dati
      const dataWithSheet = formatted.map(item => ({ ...item, sheet: sheetName }));
      
      // Inserisci i nuovi dati
      await SummaryExporter.insertMany(dataWithSheet);

      console.log(`✅ Importati ${formatted.length} righe da ${sheetName}`);
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Errore durante l\'importazione exporters:', error);
    mongoose.disconnect();
  }
}

importExportersData(); 