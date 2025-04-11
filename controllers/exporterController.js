const xlsx = require('xlsx');
const path = require('path');

// Funzione per convertire numeri Excel in formato Data
const excelDateToJSDate = (serial) => {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

exports.getSheetData = (req, res) => {
    try {
        const filePath = path.join(__dirname, '../data/exporters.xlsx');
        const workbook = xlsx.readFile(filePath);

        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specifies the name of the sheet (BoxType)." });
        }

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            return res.status(404).json({ message: "Sheet not found." });
        }

        let jsonData = xlsx.utils.sheet_to_json(worksheet);

        jsonData = jsonData.map(item => {
            if (item['Week'] && typeof item['Week'] === 'number') {
                const date = excelDateToJSDate(item['Week']);
                item['Week'] = date.toISOString().split('T')[0];
            }
            return item;
        });

        console.log("✅ Data Converted and Sent to Frontend:", JSON.stringify(jsonData, null, 2));
        res.json(jsonData);
    } catch (error) {
        console.error('❌ Error retrieving sheet data:', error);
        res.status(500).json({ message: "Error retrieving sheet data." });
    }
};

exports.getWeeks = (req, res) => {
    try {
        const filePath = path.join(__dirname, '../data/exporters.xlsx');
        const workbook = xlsx.readFile(filePath);

        const sheetName = req.query.sheet;
        if (!sheetName) {
            return res.status(400).json({ message: "Specifies the name of the sheet (BoxType)." });
        }

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            return res.status(404).json({ message: "Sheet not found." });
        }

        let jsonData = xlsx.utils.sheet_to_json(worksheet);
        const weeks = Array.from(new Set(
            jsonData.filter(item => item['Week Number'] !== undefined)
                    .map(item => item['Week Number'].toString())
        ));

        console.log("✅ Settimane Estratte:", weeks);
        res.json(weeks);
    } catch (error) {
        console.error('❌ Errore nel recupero delle settimane:', error);
        res.status(500).json({ message: "Errore nel recupero delle settimane." });
    }
};
