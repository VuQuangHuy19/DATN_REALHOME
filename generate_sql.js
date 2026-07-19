const fs = require('fs');
const csvStr = fs.readFileSync('docs/TH03.csv', 'utf8');
const rows = csvStr.split('\n');

function parseCsvLine(line) {
  let row = [];
  let currentStr = '';
  let inQuotes = false;
  for(let j=0; j<line.length; j++) {
    const char = line[j];
    if(char === '"') {
      inQuotes = !inQuotes;
    } else if(char === ',' && !inQuotes) {
      row.push(currentStr.trim());
      currentStr = '';
    } else {
      currentStr += char;
    }
  }
  row.push(currentStr.trim());
  return row;
}

const headers = parseCsvLine(rows[0]);
const nameIdx = headers.findIndex(h => h.includes('Tòa nhà'));
const noteIdx = headers.findIndex(h => h.includes('Dịch vụ theo căn'));
const dvcIdx = headers.findIndex(h => h.includes('DVC(*)'));
const petIdx = headers.findIndex(h => h.includes('Nuôi Pet'));

const updates = [];
let processedBuildings = new Set();

for(let i=1; i<rows.length; i++) {
  const rowStr = rows[i];
  if(!rowStr.trim()) continue;
  
  let row = parseCsvLine(rowStr);
  
  let name = row[nameIdx]?.trim();
  if(!name) continue;

  name = name.split('-')[0].trim();
  
  if(processedBuildings.has(name)) continue;
  processedBuildings.add(name);
  
  const dvcRaw = (row[dvcIdx] || row[noteIdx] || '').toLowerCase();
  
  let commonServicePrice = 200000;
  let priceUpdated = false;
  const priceMatch = dvcRaw.match(/(?:dịch vụ|dvc|rác|vệ sinh).*?(\d+([.,]\d+)*)[k\s]*(?:\/|trên|1\s*)(người|ng|phòng|p)/) 
                  || dvcRaw.match(/(\d+([.,]\d+)*)[k\s]*(?:\/|trên|1\s*)(người|ng|phòng|p)/);
                  
  if (priceMatch) {
      let pStr = priceMatch[1].replace(/[.,]/g, '');
      let p = parseInt(pStr, 10);
      if (p > 0) {
          if (p < 1000) p *= 1000;
          commonServicePrice = p;
          priceUpdated = true;
      }
  }
  
  let allowPetText = row[petIdx]?.toUpperCase().includes('Y') ? 'Có' : 'Không';
  if (dvcRaw.includes('không nuôi chó') || dvcRaw.includes('không chó')) {
      allowPetText = 'Mèo (Không chó)';
  } else if (dvcRaw.includes('không nuôi pet') || dvcRaw.includes('không pet') || dvcRaw.includes('không chó mèo')) {
      allowPetText = 'Không';
  }
  
  let updateClauses = [`allow_pet = '${allowPetText}'`];
  if (priceUpdated) {
     updateClauses.push(`common_service_price = ${commonServicePrice}`);
  }
  
  updates.push(`UPDATE public.buildings SET ${updateClauses.join(', ')} WHERE name ILIKE '%${name.replace(/'/g, "''")}%' OR address ILIKE '%${name.replace(/'/g, "''")}%';`);
}

fs.writeFileSync('migration_fix.sql', 'ALTER TABLE public.buildings ALTER COLUMN allow_pet TYPE text USING (CASE WHEN allow_pet THEN \'Có\' ELSE \'Không\' END);\n\n' + updates.join('\n'));
console.log('Generated migration_fix.sql successfully');
