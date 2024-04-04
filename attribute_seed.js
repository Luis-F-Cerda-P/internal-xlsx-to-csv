const fs = require('fs');
const { getDataFromTxtFile } = require('./seeding_utilities')
const data = fs.readFileSync("skus.txt", 'utf8');

const dictionary = {
  "Color": {
    "pi": "Rosado",
    "ma": "Café oscuro",
    "gr": "Gris",
    "ce": "Celeste",
    "ro": "Rojo",
    "ve": "Verde",
    "na": "Naranja",
    "vi": "Violeta",
    "az": "Azul",
    "be": "Café claro"
  },
  "Patrón": {
    "aa": "Leopardo",
    "bb": "Jirafa",
    "cc": "Tigre",
    "dd": "Cebra",
  }
}
// Get the elements that have two alphabetical characters (a 'suffix') as their last characters
function findSkusWithSuffix(dataArray) {
  const skuHasTextCharacters = sku => (/[a-zA-Z]/).test(sku[0].slice(-2))
  const skusWithSuffix = dataArray.filter(skuHasTextCharacters)
  return skusWithSuffix;
}
// Check if a given suffic exists in the suffix lookup table
function suffixExistsInDictionary(suffix, lookupTable) {
  // Iterate over the keys and values of the dictionary object
  for (const [attribute, suffixes] of Object.entries(lookupTable)) {
    // Check if the suffix is found in the current attribute's suffixes
    if (suffix in suffixes) {
      // If found, return the attribute
      return true;
    }
  }
  // If suffix not found, return null or handle it as needed
  return false;

}
// Main script: 
const dataArray = getDataFromTxtFile(data);
const skusWithSuffix = findSkusWithSuffix(dataArray);
const uniqueSuffixes = [...new Set(skusWithSuffix.map(sku => sku[0].slice(-2)))]
const missingSuffixes = uniqueSuffixes.filter(suffix => !suffixExistsInDictionary(suffix, dictionary));
// console.log(missingSuffixes);

let attributesResult = [["description"]];
let valuesResult = [["description", "attribute_field_id"]];
let iterator = 1;

for (const [attribute, values] of Object.entries(dictionary)) {
  attributesResult.push(attribute);
  for (const value of Object.values(values)) {
    valuesResult.push([value, iterator])
  }
  iterator++;
}


fs.writeFileSync("output/seeds/AttributeField.csv", attributesResult.join("\n"))
fs.writeFileSync("output/seeds/AttributeValue.csv", valuesResult.map(line => line.join(",")).join("\n"))