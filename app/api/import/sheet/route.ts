import { handleImportSheet } from '@/src/features/import/api/import-sheet.handler';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleImportSheet(request);
}
