const fs = require('fs');

function parseCsvLine(text) {
  let ret = [];
  let current = '';
  let inQuotes = false;
  for(let i=0; i<text.length; i++){
      let char = text[i];
      if (char === '"' && text[i+1] === '"') {
          current += '"';
          i++;
      } else if (char === '"') {
          inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
          ret.push(current);
          current = '';
      } else {
          current += char;
      }
  }
  ret.push(current);
  return ret;
}

const csv = fs.readFileSync('docs/TH03.csv', 'utf-8');
const rows = csv.split('\n');

const updates = [];
let processedBuildings = new Set();

const nameIdx = 4; // Tòa nhà (Địa chỉ) (*)
const coordIdx = 5; // Tọa độ (Lat, Lng)

for(let i=1; i<rows.length; i++) {
  const rowStr = rows[i];
  if(!rowStr.trim()) continue;
  
  let row = parseCsvLine(rowStr);
  
  let name = row[nameIdx]?.trim();
  if(!name) continue;

  name = name.split('-')[0].trim();
  
  if(processedBuildings.has(name)) continue;
  processedBuildings.add(name);
  
  let lat = 'NULL', lng = 'NULL';
  const coordStr = row[coordIdx]?.trim();
  if (coordStr) {
      const parts = coordStr.split(',');
      if (parts.length >= 2) {
          let parsedLat = parseFloat(parts[0]);
          let parsedLng = parseFloat(parts[1]);
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
              lat = parsedLat;
              lng = parsedLng;
          }
      }
  }

  if (lat !== 'NULL' && lng !== 'NULL') {
      updates.push(`UPDATE public.buildings SET latitude = ${lat}, longitude = ${lng} WHERE name ILIKE '%${name.replace(/'/g, "''")}%' OR address ILIKE '%${name.replace(/'/g, "''")}%';`);
  }
}

fs.writeFileSync('update_coords.sql', updates.join('\n'));
console.log('Generated update_coords.sql successfully');
