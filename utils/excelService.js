const xlsx = require('xlsx');
const path = require('path');

const getExcelSheetNames = (fileName) => {
  const filePath = path.join(__dirname, '..', 'data', fileName);
  const workbook = xlsx.readFile(filePath);
  return workbook.SheetNames;
};

const readExcelSheet = (fileName, sheetName) => {
  const filePath = path.join(__dirname, '..', 'data', fileName);
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

module.exports = { getExcelSheetNames, readExcelSheet };
