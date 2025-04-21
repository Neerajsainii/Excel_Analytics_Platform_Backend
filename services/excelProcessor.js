const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

/**
 * Determines the data type of a value
 * @param {*} value 
 * @returns {string} Data type
 */
const getDataType = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') {
    // Check if it's a date
    if (!isNaN(Date.parse(value))) {
      return 'date';
    }
    return 'string';
  }
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'mixed';
};

/**
 * Infers data types from an array of values
 * @param {Array} values 
 * @returns {string} The most likely data type
 */
const inferDataType = (values) => {
  if (!values || values.length === 0) return 'null';
  
  const typeCount = {};
  
  // Count the frequency of each data type
  values.forEach(value => {
    const type = getDataType(value);
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  
  // Find the most common type
  let mostCommonType = 'string';
  let maxCount = 0;
  
  for (const type in typeCount) {
    if (typeCount[type] > maxCount) {
      maxCount = typeCount[type];
      mostCommonType = type;
    }
  }
  
  return mostCommonType;
};

/**
 * Calculate statistics for a column based on its data type
 * @param {Array} values 
 * @param {string} dataType 
 * @returns {Object} Statistics object
 */
const calculateStatistics = (values, dataType) => {
  // Filter out null and undefined values
  const filteredValues = values.filter(v => v !== null && v !== undefined);
  const stats = {
    count: values.length,
    nullCount: values.length - filteredValues.length
  };
  
  if (filteredValues.length === 0) return stats;
  
  // Calculate unique values
  const uniqueSet = new Set(filteredValues);
  stats.uniqueCount = uniqueSet.size;
  
  // Add type-specific statistics
  if (dataType === 'number') {
    stats.min = Math.min(...filteredValues);
    stats.max = Math.max(...filteredValues);
    stats.sum = filteredValues.reduce((sum, val) => sum + val, 0);
    stats.mean = stats.sum / filteredValues.length;
    
    if (filteredValues.length > 1) {
      const meanSquaredDiff = filteredValues.map(v => Math.pow(v - stats.mean, 2));
      stats.variance = meanSquaredDiff.reduce((sum, val) => sum + val, 0) / filteredValues.length;
      stats.stdDev = Math.sqrt(stats.variance);
    }
  } else if (dataType === 'string') {
    stats.minLength = Math.min(...filteredValues.map(v => v.length));
    stats.maxLength = Math.max(...filteredValues.map(v => v.length));
    stats.mostCommon = getMostCommonValue(filteredValues);
  } else if (dataType === 'date') {
    const dates = filteredValues.map(v => new Date(v));
    stats.min = new Date(Math.min(...dates));
    stats.max = new Date(Math.max(...dates));
  }
  
  return stats;
};

/**
 * Find the most common value in an array
 * @param {Array} values 
 * @returns {*} Most common value
 */
const getMostCommonValue = (values) => {
  const frequency = {};
  let maxCount = 0;
  let mostCommon = null;
  
  values.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;
    if (frequency[value] > maxCount) {
      maxCount = frequency[value];
      mostCommon = value;
    }
  });
  
  return mostCommon;
};

/**
 * Cleans a column name for MongoDB compatibility
 * @param {string} columnName 
 * @returns {string} Cleaned column name
 */
const cleanColumnName = (columnName) => {
  // Replace spaces, dots, and special characters
  let cleaned = columnName
    .replace(/\s+/g, '_')        // Replace spaces with underscores
    .replace(/\./g, '_')         // Replace dots with underscores
    .replace(/[^a-zA-Z0-9_]/g, '')  // Remove other special characters
    .toLowerCase();              // Convert to lowercase
  
  // Ensure it doesn't start with number or underscore
  if (/^[0-9_]/.test(cleaned)) {
    cleaned = 'col_' + cleaned;
  }
  
  // Handle empty names
  if (!cleaned) {
    cleaned = 'column';
  }
  
  return cleaned;
};

/**
 * Process Excel data and extract structured information
 * @param {string} filePath Path to Excel file
 * @param {string} sheetName Optional sheet name (defaults to first sheet)
 * @returns {Object} Processed data
 */
const processExcelFile = (filePath, sheetName = null) => {
  try {
    // Ensure the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found at path: ' + filePath);
    }
    
    // Read the workbook
    const workbook = XLSX.readFile(filePath);
    
    // Determine which sheet to process
    const sheetToProcess = sheetName || workbook.SheetNames[0];
    
    if (!workbook.SheetNames.includes(sheetToProcess)) {
      throw new Error(`Sheet "${sheetToProcess}" not found in workbook`);
    }
    
    // Get the worksheet
    const worksheet = workbook.Sheets[sheetToProcess];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    if (jsonData.length === 0) {
      return {
        sheetName: sheetToProcess,
        columns: [],
        data: [],
        rowCount: 0,
        summary: {}
      };
    }
    
    // Extract columns from the first row
    const originalColumns = Object.keys(jsonData[0]);
    
    // Set up columns with clean names and data types
    const columns = [];
    const cleanToOriginalMap = {};
    const columnData = {};
    
    // Initialize column data arrays
    originalColumns.forEach(col => {
      columnData[col] = jsonData.map(row => row[col]);
    });
    
    // Process each column
    originalColumns.forEach(originalCol => {
      const cleanName = cleanColumnName(originalCol);
      
      // Handle duplicate column names by adding a suffix
      let uniqueCleanName = cleanName;
      let counter = 1;
      
      while (cleanToOriginalMap[uniqueCleanName]) {
        uniqueCleanName = `${cleanName}_${counter}`;
        counter++;
      }
      
      cleanToOriginalMap[uniqueCleanName] = originalCol;
      
      // Get the data for this column
      const values = columnData[originalCol];
      
      // Infer the data type
      const dataType = inferDataType(values);
      
      // Calculate statistics
      const statistics = calculateStatistics(values, dataType);
      
      // Create column object
      columns.push({
        name: uniqueCleanName,
        originalName: originalCol,
        dataType,
        statistics
      });
    });
    
    // Transform data to use clean column names
    const transformedData = jsonData.map(row => {
      const newRow = {};
      for (const cleanName in cleanToOriginalMap) {
        const originalName = cleanToOriginalMap[cleanName];
        newRow[cleanName] = row[originalName];
      }
      return newRow;
    });
    
    // Calculate summary statistics for the entire dataset
    const summary = {
      rowCount: jsonData.length,
      columnCount: columns.length,
      emptyRows: jsonData.filter(row => 
        Object.values(row).every(val => val === null || val === '')).length,
      dataTypes: columns.reduce((acc, col) => {
        acc[col.dataType] = (acc[col.dataType] || 0) + 1;
        return acc;
      }, {})
    };
    
    return {
      sheetName: sheetToProcess,
      columns,
      data: transformedData,
      rowCount: jsonData.length,
      summary
    };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw error;
  }
};

module.exports = {
  processExcelFile,
  getDataType,
  cleanColumnName
}; 