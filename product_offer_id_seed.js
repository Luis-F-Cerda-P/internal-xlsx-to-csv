const XLSX = require("xlsx");
const fs = require('fs');
const { removeHelperIds, arrayOfArraysToCSVString } = require('./seeding_utilities');

// const myRange = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 1, r: 1048575 } });

function prepareCandidateCode(candidateCode) {
  const processedCode = candidateCode.split("").map(el => parseInt(el));

  return processedCode;
}
function getCheckDigit(sum) {
  const digit = (sum % 10) === 0 ? 0 : 10 - (sum % 10);
  return digit;
}
function isValidUPC(code) {
  function sumOfDigits(codeAsArray) {
    let sum = 0;

    for (let i = 0; i < codeAsArray.length; i++) {
      const element = codeAsArray[i];
      if (i % 2 === 0) {
        sum += element * 3
      } else {
        sum += element
      }
    }

    return sum;
  }

  if (code.length !== 12) {
    // return console.error("Wrong argument. UPC codes are exactly twelve (12) digits long");
    return 
  }
  if (typeof code !== "string") {
    // return console.error("Wrong argument. The input for this function must be a String type");
    return 
  }
  const codeAsArray = prepareCandidateCode(code)
  const checkSum = codeAsArray.pop();
  const sum = sumOfDigits(codeAsArray);
  const newDigit = getCheckDigit(sum);
  const isValid = newDigit === checkSum;

  return isValid;
}
function isValidEAN(code) {
  function sumOfDigits(codeAsArray) {
    let sum = 0;

    for (let i = 0; i < codeAsArray.length; i++) {
      const element = codeAsArray[i];
      if (!(i % 2 === 0)) {
        sum += element * 3
      } else {
        sum += element
      }
    }

    return sum;
  }

  if (code.length !== 13) {
    return console.error("Wrong argument. EAN codes are exactly thirteen (13) digits long");
  }
  if (typeof code !== "string") {
    return console.error("Wrong argument. The input for this function must be a String type");
  }
  const codeAsArray = prepareCandidateCode(code)
  const checkSum = codeAsArray.pop();
  const sum = sumOfDigits(codeAsArray);
  const newDigit = getCheckDigit(sum);
  const isValid = newDigit === checkSum;

  return isValid;
}
function codeHasAnyNumberOfLettersInIt(code) {
  const letters = /[A-Za-z]/;
  return letters.test(code);
}
function codeHasSuffix(code) {
  const suffix = /[A-Za-z]+$/;
  return suffix.test(code);
}
function codeHasPrefix(code) {
  const suffix = /^[A-Za-z]+/;
  return suffix.test(code);
}
function codeWithoutSuffixAlreadyExists(code) {
  const exists = resultsObject.identifiers.find(prod => prod[1] === code.slice(0,-2));

  return exists
}
function sortByCode(a, b) {
  return a[0].localeCompare(b[0])
}
function lookupIdentifierType(typeString) {
  const identifierTypeId = identifierTypesTable.findIndex(row => row[0] === typeString);

  return identifierTypeId;
}
function determineIdentifierType(code) {
  const codeHasLetters = codeHasAnyNumberOfLettersInIt(code);
  if (!codeHasLetters) {
    if (isValidUPC(code)) {
      return lookupIdentifierType("UPC");
    } else if (isValidEAN(code)) {
      return lookupIdentifierType("EAN");
    } else {
      return lookupIdentifierType("Non-standard Barcode");
    }
  }

  return lookupIdentifierType("Internal SKU")
}
function determineIdentifiableType(code, identifierType) {
  if (identifierType !== 3) {
    return "Product"
  } else if (codeHasSuffix(code) && codeWithoutSuffixAlreadyExists(code)) {
    return "Offer"
  } else {
    return "Product"
  }
}
function generateItemRecordOrRecords(item, identifiableType) {
  if (identifiableType === "Product") {
    const resultsArrayNewLength = resultsObject.products.push([
      idTracker.products,
      item[1],
      -1
    ])
    idTracker.products++;

    return resultsObject.products[resultsArrayNewLength - 1]
  } else if (identifiableType === "Offer") {
    const resultsArrayNewLength = resultsObject.offers.push([
      idTracker.offers,
      item[1],
    ])

    if (codeWithoutSuffixAlreadyExists(item[0])) {
      const preexistingItem =  resultsObject.identifiers.find(prod => prod[1] === item[0].slice(0,-2))

      resultsObject.offerDetails.push([
        idTracker.offerDetails++,
        idTracker.offers,
        // idTracker.products - 1,
        preexistingItem[0],
        1
      ])
    }

    idTracker.offers++;
    return resultsObject.offers[resultsArrayNewLength - 1]
  }
}
function processData(arrayOfCodesAndDescriptions) {
  arrayOfCodesAndDescriptions.forEach(item => {
    const code = item[0];
    const identifierId = idTracker.identifiers;
    const identifierValue = code;
    const identifierType = determineIdentifierType(code);
    const identifiableType = determineIdentifiableType(code, identifierType);
    const itemInfo = generateItemRecordOrRecords(item, identifiableType)
    const identifiableId = itemInfo[0];

    resultsObject.identifiers.push([
      identifierId,
      identifierValue,
      identifierType,
      true,
      identifiableType,
      identifiableId
    ])

    idTracker.identifiers++;
  });
}

const resultsObject = {
  products: [["description", "minimun_stock"]],
  offers: [["description"]],
  offerDetails: [["offer_id", "identifier_id", "item_quantity" ]],
  identifiers: [["value", "identifier_type_id", "main_identifier", "identifiable_type", "identifiable_id"]],
}
const idTracker = {
  products: 1,
  offers: 1,
  offerDetails: 1,
  identifiers: 1,
}

const inventarioWorkbook = XLSX.readFileSync('Inventario 1.xlsx');
const existenciasSheet = inventarioWorkbook.Sheets['Existencias'];
const existenciasDataWithHeaders = XLSX.utils.sheet_to_json(existenciasSheet, { header: 1, blankrows: false, range: 'A1:B1048576' });
const existenciasData = existenciasDataWithHeaders.slice(1)
existenciasData.sort(sortByCode);

const identifierTypesFile = XLSX.readFileSync('IdentifierType.csv');
const identifierTypesSheet = identifierTypesFile.Sheets['Sheet1']
const identifierTypesTable = XLSX.utils.sheet_to_json(identifierTypesSheet, { header: 1 });

processData(existenciasData);

const productsCsvString = arrayOfArraysToCSVString(removeHelperIds(resultsObject.products), "{");
const offersCsvString = arrayOfArraysToCSVString(removeHelperIds(resultsObject.offers));
const offerDetailsCsvString = arrayOfArraysToCSVString(removeHelperIds(resultsObject.offerDetails));
const identifiersCsvString = arrayOfArraysToCSVString(removeHelperIds(resultsObject.identifiers));

// console.table(productsCsvString);
// console.table(offersCsvString.slice(0,11));
// console.table(offerDetailsCsvString.slice(0,11));
// console.table(identifiersCsvString.slice(0,11));


fs.writeFileSync('output/seeds/Product.csv', productsCsvString);
fs.writeFileSync('output/seeds/Offer.csv', offersCsvString);
fs.writeFileSync('output/seeds/OfferDetail.csv', offerDetailsCsvString);
fs.writeFileSync('output/seeds/Identifier.csv', identifiersCsvString);
// fs.writeFileSync('Offer.csv', offersCsvString);
// fs.writeFileSync('OfferDetail.csv', offerDetailsCsvString);
// fs.writeFileSync('Identifier.csv', identifiersCsvString);
// CSV de productos, ordenados (description, id)
// Qué es una oferta? Un código que tiene sufijo o prefijo, y que el resto de la información es un código válido. Sería en tipo un SKU del usuario
// CSV de ofertas, también ordenadas (description, id)
// CSV de identificadores, ordenados (value, id, type, identifiable_id)
/*
FLUJO: 
  1. Guardo en Idenfifiers el value 
  2. Chequeo si un código (row[1]) tiene letras. 
    NO TIENE LETRAS: 
      2.1. Reviso si es UPC válido 
        ES VALIDO: 
            2.1.1. Asigno el tipo UPC a Identifier.identifier_type_id desde una lookupTable que se arma desde la semilla de tipos
            2.1.2. Asigno el "identifiable_type_id" como "Product"
        NO ES VALIDO: 
      2.2 Reviso si es un EAN válido
        ES VALIDO:
            2.2.1. Asigno el tipo EAN a Identifier.identifier_type_id desde una lookupTable que se arma desde la semilla de tipos
        NO ES VALIDO: 
            2.2.2. Asigno el tipo Non-Standard Barcode desde una lookupTable que se arma desde la semilla de tipos
      2.3 Asigno el "identifiable_id" como "Product"
    SÍ TIENE LETRAS:
      2.4 Reviso si tiene un sufijo 
        LO TIENE: 
          2.4.1. El tipo es "SKU"
          2.4.2. Remuevo el sufijo
          2.4.3. Chequeo a qué producto u oferta pertenece
            PERTENECE A UN PRODUCTO X 
              2.4.3.1. Asigno el "identifiable_id" como el id de su progenitor 
              2.4.3.2. Asigno el "identifiable_type" como "Offer" 
            NO PERTENECE A NADIE
              2.4.3.3. Asigno el "identifiable_type" como "Product" 
        NO LO TIENE: 
          2.4.4. Reviso si tiene un prefijo <- En teoría tiene que tenerlo, porque por culpa de un caracter alfabetico fue que seguimos todo este flujo lógico
          2.4.5. El tipo es "SKU"
          2.5.6. Asigno el "identifiable_type" como "Offer"
  3. Desde los valores asignados en el paso enterior determino dónde guardar, voy aumentando los IDs de producto u offer según corresponda, guardando las relaciones entre ellos. 
    CUANDO ES PRODUCT: 
      3.1. Le asigno un ID: a través de variable que parte en 1    
      3.2. Le asigno un minimun stock: -1 por defecto    
    CUANDO ES OFFER: 
      3.3. Le asigno un ID: a través de variable offer_id que parte en 1    
      3.4. Le asinno el ID de su progenitor. 
*/
