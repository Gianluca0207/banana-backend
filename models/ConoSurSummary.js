// models/ConoSurSummary.js
const mongoose = require('mongoose');

const ConoSurSummarySchema = new mongoose.Schema({
  week: Number,
  exporter: String,
  consignee: String,
  country: String,
  boxes: Number,
  destino: String,
  buque: String,
  tipo22XU: Number,
  tipo208: Number,
}, { timestamps: true });

module.exports = mongoose.model('ConoSurSummary', ConoSurSummarySchema);
