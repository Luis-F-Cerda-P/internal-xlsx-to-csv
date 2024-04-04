const XLSX = require("xlsx");
const fs = require('fs');
// Importing the sortById and arrayOfArraysToCSVString functions from seeding_utilities.js
const { sortById, arrayOfArraysToCSVString } = require('./seeding_utilities');

/**
 * Checks if a location name follows the standard pattern.
 * The standard pattern includes:
 * - A format like "X-X-X" where X is a digit and the last character is an uppercase letter.
 * - A format like "X-X" where X is a digit.
 * - A single digit.
 * - A format like "REPISA X-X" where X is a digit.
 *
 * @param {string} locationName - The location name to be checked.
 * @returns {boolean} True if the location name follows the standard pattern, otherwise false.
 */
function isStandardLocationNamePattern(locationName) {
  const standardLocationNamesRegex = /^\d{1,}-\d{1,}-[A-Z]$|^(REPISA\s)?\d{1,}-\d{1,}$|^\d{1,}$/;
  return standardLocationNamesRegex.test(locationName);
}

/**
 * Processes a location string and updates the given array of location objects with its components.
 *
 * @param {string} location - The location string to be processed.
 * @param {Object[]} finalArr - The array of location objects to be updated.
 * @param {number} locId - The current location ID to be assigned to the processed location.
 */
function processLocation(location, finalArr) {
  /**
   * Represents the address components of the location string.
   * @type {string[]}
   */
  const addressComponents = location.split("-").map((_, index, array) => array.slice(0, index + 1).join("-"));

  // Process each address component
  addressComponents.forEach((curAddress, index, array) => {
    if (finalArr[index].locations.includes(curAddress)) {
      return; // Skip if the location already exists in the final array
    } else {
      // Add the new location to the final array
      finalArr[index].locations.push(curAddress);
      finalArr[index].loc_ids.push(++locId);

      // Find the containing location and update the containing location ID
      const contEle = finalArr.find(el => el.locations.includes(array[index - 1]));
      const contId = contEle?.locations.indexOf(array[index - 1]);
      contId == undefined ? finalArr[index].cont_ids.push(null) : finalArr[index].cont_ids.push(contEle.loc_ids[contId]);
    }
  });
}

/**
 * Generates location objects based on sanitized location names.
 * 
 * @param {string[]} allSanitizedLocations - An array of sanitized location names.
 * @returns {Object[]} An array of location objects containing information about locations.
 */
function generateLocationObjects(allSanitizedLocations) {
  /**
   * Represents the starting array of location objects.
   * @type {Object[]}
   */
  const startingObject = [
    { tipo: "estante", locations: [], loc_ids: [], cont_ids: [] },
    { tipo: "repisa", locations: [], loc_ids: [], cont_ids: [] },
    { tipo: "caja", locations: [], loc_ids: [], cont_ids: [] }
  ];



  // Process each sanitized location name and generate location objects
  return allSanitizedLocations.reduce(function (finalArr, location) {
    if (isStandardLocationNamePattern(location)) {
      processLocation(location, finalArr);
    }
    return finalArr;
  }, startingObject);
}

/**
 * Generates an array of arrays representing locations from an array of location objects.
 * 
 * @param {Object[]} arrOfObjForFile - An array of location objects.
 * @returns {Array[]} An array of arrays representing locations.
 */
function generateLocationArrayOfArraysFromObjects(arrOfObjForFile) {
  /**
   * Represents the array of arrays to be generated.
   * @type {Array[]}
   */
  const arrOfArrForFile = [];

  // Iterate over each location object and generate arrays
  arrOfObjForFile.forEach((obj, outIndex) => {
    obj.locations.forEach((location, inIndex) => {
      const location_id = obj.loc_ids[inIndex];
      const locTypeId = outIndex + 2;
      const contId = obj.cont_ids[inIndex] || 1;
      arrOfArrForFile.push([location_id, location, locTypeId, contId]);
    });
  });

  return arrOfArrForFile;
}

/**
 * Adds warehouse and non-standard locations to an array of arrays representing locations.
 * 
 * @param {Array[]} arrOfArrForFile - An array of arrays representing locations.
 * @param {string[]} nonStandardLiveLocations - An array of non-standard live locations.
 * @returns {Array[]} The updated array of arrays with warehouse and non-standard locations.
 */
function addWarehouseAndNonStandardLocationsToArrayOfArrays(arrOfArrForFile, nonStandardLiveLocations) {
  // Add warehouse location at the beginning
  arrOfArrForFile.unshift(["description", "location_type_id", "containing_location_id"], ["Eduardo Llanos 33 - Bodega 8", 1, null]);

  // Add non-standard live locations at the end
  arrOfArrForFile.push(...nonStandardLiveLocations.map(el => [el, 4, 1]));

  return arrOfArrForFile;
}

const workbook = XLSX.readFile('Inventario 1.xlsx');
const formResponsesSheet = workbook.Sheets['Form Responses 2'];
const formResponsesData = XLSX.utils.sheet_to_json(formResponsesSheet, { header: 1 });

const liveLocationsSheet = workbook.Sheets['Ubicaciones'];
const liveLocData = XLSX.utils.sheet_to_json(liveLocationsSheet, { header: 1, range: 4, blankrows: false });

const locations = formResponsesData.map(row => row[11]);
const uniqueLocations = Array.from(new Set(locations));

const standardLocs = uniqueLocations.filter(location => isStandardLocationNamePattern(location)).map(location => location.replace("REPISA ", ""));
const liveLocations = liveLocData.map(row => row[2]);
const uniqueLiveLocations = Array.from(new Set(liveLocations));

const allSanitizedLocations = Array.from(new Set([...standardLocs, ...uniqueLiveLocations])).sort();
const nonStandardLiveLocations = allSanitizedLocations.filter(loc => !standardLocs.includes(loc));

let locId = 1

const arrOfObjForFile = generateLocationObjects(allSanitizedLocations);
const arrOfArrForFile = generateLocationArrayOfArraysFromObjects(arrOfObjForFile);

sortById(arrOfArrForFile);
arrOfArrForFile.forEach((row, index, array) => array[index] = row.slice(1))
addWarehouseAndNonStandardLocationsToArrayOfArrays(arrOfArrForFile, nonStandardLiveLocations);

const csvString = arrayOfArraysToCSVString(arrOfArrForFile);

fs.writeFileSync('output/seeds/Location.csv', csvString);