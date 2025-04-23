const xlsx = require('xlsx');
const path = require('path');
const Exporter = require('../models/Exporter');

// Funzione per convertire numeri Excel in formato Data
const excelDateToJSDate = (serial) => {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

// Funzione per leggere dati da Excel (fallback)
const readFromExcel = (sheetName) => {
    const filePath = path.join(__dirname, '../data/exporters.xlsx');
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
        throw new Error("Sheet not found.");
    }
    let jsonData = xlsx.utils.sheet_to_json(worksheet);
    return jsonData.map(item => {
        if (item['Week'] && typeof item['Week'] === 'number') {
            const date = excelDateToJSDate(item['Week']);
            item['Week'] = date.toISOString().split('T')[0];
        }
        return item;
    });
};

exports.getSheetData = async (req, res) => {
    try {
        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specifies the name of the sheet (BoxType)." });
        }

        // Prova a leggere da MongoDB
        try {
            const data = await Exporter.find({});
            if (data && data.length > 0) {
                console.log("✅ Data retrieved from MongoDB");
                return res.json(data);
            }
        } catch (mongoError) {
            console.log("⚠️ MongoDB read failed, falling back to Excel");
        }

        // Fallback a Excel
        const jsonData = readFromExcel(sheetName);
        console.log("✅ Data Converted and Sent to Frontend from Excel");
        res.json(jsonData);
    } catch (error) {
        console.error('❌ Error retrieving sheet data:', error);
        res.status(500).json({ message: "Error retrieving sheet data." });
    }
};

exports.getWeeks = async (req, res) => {
    try {
        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specifies the name of the sheet (BoxType)." });
        }

        // Prova a leggere da MongoDB
        try {
            const data = await Exporter.find({});
            if (data && data.length > 0) {
                const weeks = Array.from(new Set(data.map(item => item.week)));
                console.log("✅ Weeks retrieved from MongoDB");
                return res.json(weeks);
            }
        } catch (mongoError) {
            console.log("⚠️ MongoDB read failed, falling back to Excel");
        }

        // Fallback a Excel
        const jsonData = readFromExcel(sheetName);
        const weeks = Array.from(new Set(
            jsonData.filter(item => item['Week Number'] !== undefined)
                    .map(item => item['Week Number'].toString())
        ));
        console.log("✅ Weeks Extracted from Excel");
        res.json(weeks);
    } catch (error) {
        console.error('❌ Error retrieving weeks:', error);
        res.status(500).json({ message: "Error retrieving weeks." });
    }
};
