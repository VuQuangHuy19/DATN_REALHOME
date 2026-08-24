'use client';

import { PrintContractPage } from '@/features/finance/components/PrintContractPage';

export default function Page({ params }: { params: { id: string } }) {
  return <PrintContractPage params={params} />;
}
