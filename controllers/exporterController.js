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
}, { strict: false });

const Exporter = mongoose.model('Exporter', exporterSchema);

exports.getSheetData = async (req, res) => {
    try {
        await connectDB();
        
        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specifies the name of the sheet (BoxType)." });
        }

        const exporter = await Exporter.findOne({ sheetName });
        if (!exporter) {
            return res.status(404).json({ message: "Sheet not found." });
        }

        console.log("✅ Data Retrieved from MongoDB and Sent to Frontend:", JSON.stringify(exporter.data, null, 2));
        res.json(exporter.data);
    } catch (error) {
        console.error('❌ Error retrieving sheet data:', error);
        res.status(500).json({ message: "Error retrieving sheet data." });
    }
};

exports.getWeeks = async (req, res) => {
    try {
        await connectDB();
        
        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specifies the name of the sheet (BoxType)." });
        }

        const exporter = await Exporter.findOne({ sheetName });
        if (!exporter) {
            return res.status(404).json({ message: "Sheet not found." });
        }

        const weeks = Array.from(new Set(
            exporter.data.filter(item => item['Week Number'] !== undefined)
                        .map(item => item['Week Number'].toString())
        ));

        console.log("✅ Settimane Estratte:", weeks);
        res.json(weeks);
    } catch (error) {
        console.error('❌ Errore nel recupero delle settimane:', error);
        res.status(500).json({ message: "Errore nel recupero delle settimane." });
    }
};
