import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/admin/services/invoices?tab=readings');
}