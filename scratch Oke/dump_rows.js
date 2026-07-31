const XLSX = require('xlsx');

async function dumpRows() {
  const url = 'https://docs.google.com/spreadsheets/d/1u4hoU068GqrBlyFIsRcGTioUQ64ssoiH_7R-TP760bs/export?format=xlsx';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  for (let r = 0; r < 60; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const nonEmpty = row.map((cell, idx) => cell !== null && cell !== undefined ? `[c${idx}]: ${cell}` : null).filter(Boolean);
    console.log(`Row ${r+1}: ${nonEmpty.join(' | ')}`);
  }
}

dumpRows().catch(console.error);
