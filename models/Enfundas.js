const mongoose = require('mongoose');

const EnfundasSchema = new mongoose.Schema({
  label: String,      // Formato "1/13"
  average: Number,    // AVERAGE 2015-2024
  year2024: Number,   // Dati 2024
  year2025: Number,   // Dati 2025
  prevision: Number   // PREVISION
});

module.exports = mongoose.model('Enfundas', EnfundasSchema); 