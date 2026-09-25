import { redirect } from 'next/navigation';

export default function LandlordReadingsPage() {
  redirect('/landlord/invoices?tab=readings');
}
