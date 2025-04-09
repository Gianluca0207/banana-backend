const mongoose = require('mongoose');

const exporterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    country: { type: String, required: true },
    pricePerKg: { type: Number, required: true },
    pricePerLb: { type: Number, required: true }
});

module.exports = mongoose.model('Exporter', exporterSchema);
