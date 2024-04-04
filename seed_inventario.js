const XLSX = require("xlsx");
const fs = require('fs');

function locHasStandarName(locName) {
  const standarLocationNames = /^\d{1,}-\d{1,}-[A-Z]$|^(REPISA\s)?\d{1,}-\d{1,}$|^\d{1,}$/;
  return standarLocationNames.test(locName)
}

function sortByLengthAndDefault(array) {
  return array.sort((a, b) => {
    // Compare lengths first
    if (a.length !== b.length) {
      return a.length - b.length;
    }
    return a.localeCompare(b);
  });
}

const workbook = XLSX.readFile('Inventario 1.xlsx')
const formResponsesSheet = workbook.Sheets['Form Responses 2'];
const frmRspnsData = XLSX.utils.sheet_to_json(formResponsesSheet, { header: 1 })
const liveLocationsSheet = workbook.Sheets['Ubicaciones'];
const liveLocData = XLSX.utils.sheet_to_json(liveLocationsSheet, { header: 1, range: 4, blankrows: false })
// TODAS LAS UBICACIONES usadas algunas vez por el inventario: 
const locations = frmRspnsData.map(r => r[11]);
const uniqueLocations = [... new Set(locations)]
const uniqueLocSorted = sortByLengthAndDefault(uniqueLocations);
// EXTRAER DE LAS UBICACIONES LAS QUE OBEDECEN EL PATRÓN "X-X-X"
const standardLocs = [... new Set(uniqueLocations.filter(loc => locHasStandarName(loc)).map(loc => loc.replace("REPISA ", "")))];
// UBICACIONES VIVAS, que tienen cosas en este momento: 
const liveLocations = liveLocData.map(r => r[2]);
const uniqueLiveLocations = [... new Set(liveLocations)];
const allSanitizedLocations = [... new Set([...standardLocs, ...uniqueLiveLocations])].sort();
const nonStandardLiveLocations = allSanitizedLocations.filter(loc => !standardLocs.includes(loc))

const startingObject = [
  {
    tipo: "estante",
    locations: [],
    loc_ids: [],
    cont_ids: []
  },
  {
    tipo: "repisa",
    locations: [],
    loc_ids: [],
    cont_ids: []
  },
  {
    tipo: "caja",
    locations: [],
    loc_ids: [],
    cont_ids: []
  },
]

let locId = 1;
const arrOfObjForFile = allSanitizedLocations.reduce(function (finalArr, location) {
  if (locHasStandarName(location)) {
    const addressComponents = location.split("-").map((_, index, array) => array.slice(0, index + 1).join("-"));
    addressComponents.forEach((curAddress, index, array) => {
      if (finalArr[index].locations.includes(curAddress)) {
        return;
      } else {
        finalArr[index].locations.push(curAddress);
        finalArr[index].loc_ids.push(++locId);
        const contEle = finalArr.find(el => el.locations.includes(array[index - 1]))
        const contId = contEle?.locations.indexOf(array[index - 1]);
        contId == undefined ? finalArr[index].cont_ids.push(null) : finalArr[index].cont_ids.push(contEle.loc_ids[contId]);
      }
    });

  }
  return finalArr;
}, startingObject)

const arrOfArrForFile = [];

arrOfObjForFile.forEach((obj, outIndex) => {
  obj.locations.forEach((location, inIndex) => {
    arrOfArrForFile.push(
      [
        // obj.loc_ids[inIndex],
        location,
        outIndex + 2,
        obj.cont_ids[inIndex] || 1
      ]
    )
  })
})

// arrOfArrForFile.sort((a,b) => a[0] - b[0]);
arrOfArrForFile.unshift(["description", "location_type_id", "containing_location_id"], ["Eduardo Llanos 33 - Bodega 8", 1, null])
arrOfArrForFile.push(...nonStandardLiveLocations.map(el=> [el, 4, 1]))
const csvString = arrOfArrForFile.map(row => row.join(',')).join('\n');

fs.writeFileSync('Location.csv', csvString);

console.log(nonStandardLiveLocations);
