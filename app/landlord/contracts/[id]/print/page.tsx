'use client';

import PrintDepositContractPage from '@/app/admin/contracts/[id]/print/page';

export default function LandlordPrintDepositContractPage({ params }: { params: { id: string } }) {
  return <PrintDepositContractPage params={params} />;
}
