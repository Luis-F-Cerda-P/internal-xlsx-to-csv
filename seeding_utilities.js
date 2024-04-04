/**
 * Converts an array of arrays to a CSV string.
 * 
 * @param {Array[]} array - The array of arrays to be converted.
 * @returns {string} The CSV string.
 */
function arrayOfArraysToCSVString(array, separator = ",") {
  return array.map(row => row.join(separator)).join('\n');
}
// Read the text file and parse its contents as array of arrays (Contents: SKUs)
function getDataFromTxtFile(data) {
  // Split the text into lines
  const lines = data.split('\r\n');

  // Parse each line into an array of values
  const dataArray = lines.map(function (line) {
    return line.split(',');
  });

  return dataArray;
}
function removeHelperIds(array) {
  return array.map((row, index) => index == 0 ? row : row.slice(1));
}
/**
 * Sorts an array of arrays by the first element (assuming it's an ID).
 * 
 * @param {Array[]} array - The array to be sorted.
 * @returns {Array[]} The sorted array.
 */
function sortById(array) {
  return array.sort((a, b) => a[0] - b[0]);
}



module.exports = {
  arrayOfArraysToCSVString,
  getDataFromTxtFile,
  removeHelperIds,
  sortById,
}
