import { redirect } from 'next/navigation';
import { ADMIN_EMAIL } from '../admin-auth';
import { requireChatGPTUser } from '../chatgpt-auth';
import SiteClient from '../site-client';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireChatGPTUser('/admin');
  if (user.email.toLowerCase() !== ADMIN_EMAIL) redirect('/');
  return <SiteClient user={user} initialView="admin" />;
}
