const colorPalette = [
  'bg-red-50 text-red-700 border-red-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
];

export function getAreaColorClass(area: string | null | undefined): string {
  if (!area) return 'bg-slate-50 text-slate-600 border-slate-200';
  
  // Normalize area name to match same areas (e.g. 'đống đa' vs 'Đống Đa')
  const normalized = area.trim().toLowerCase();
  
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
}
