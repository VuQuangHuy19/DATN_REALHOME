const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const csvContent = fs.readFileSync('docs/RealHome_Import_Chuan_Hoa.csv', 'utf8');
const lines = csvContent.split(/\r?\n/);

if (lines.length < 3) {
  console.error("CSV doesn't have enough lines");
  process.exit(1);
}

// We only want the first 3 lines (1 header, 2 sample data)
const targetLines = lines.slice(0, 3).join('\n');

const wb = xlsx.read(targetLines, { type: 'string' });
const ws = wb.Sheets[wb.SheetNames[0]];

// Calculate column widths
const colWidths = [];
const range = xlsx.utils.decode_range(ws['!ref']);

for (let C = range.s.c; C <= range.e.c; ++C) {
  let maxColWidth = 10;
  for (let R = range.s.r; R <= range.e.r; ++R) {
    const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
    const cell = ws[cellAddress];
    if (cell && cell.v) {
      const cellValueStr = cell.v.toString();
      // Calculate visual width: count Vietnamese chars, spaces, etc.
      if (cellValueStr.length > maxColWidth) {
        maxColWidth = cellValueStr.length;
      }
    }
  }
  // Add some padding
  colWidths.push({ wch: Math.min(maxColWidth + 2, 50) }); // Cap at 50 chars wide
}

ws['!cols'] = colWidths;

// Ensure public/templates exists
const dir = path.join(__dirname, '../public/templates');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Write the file
xlsx.writeFile(wb, path.join(dir, 'RealHome_Import_Template.xlsx'));
console.log('Template generated successfully with adjusted column widths.');
