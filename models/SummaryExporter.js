const mongoose = require('mongoose');

const SummaryExporterSchema = new mongoose.Schema({
  week: Number,
  exporter: String,
  consignee: String,
  country: String,
  boxes: Number,
  destino: String,
  buque: String,
  tipo22XU: Number,
  tipo208: Number
});

// Forza la collection a chiamarsi "exporters"
module.exports = mongoose.model('SummaryExporter', SummaryExporterSchema, 'summaryexporters');

