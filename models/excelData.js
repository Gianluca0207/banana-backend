const mongoose = require('mongoose');

// Definiamo il modello per i dati Excel
const excelDataSchema = new mongoose.Schema({
    data: { type: Array, required: true },  // Memorizziamo i dati come un array
}, { timestamps: true });

const ExcelData = mongoose.model('ExcelData', excelDataSchema);

module.exports = ExcelData;
