import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAdminUser } from '@/app/admin-auth';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { dispatchDueDailyEmails } from '@/lib/daily-email';

export async function POST() {
  const admin = await getAdminUser();
  const user = admin ?? (await getChatGPTUser());
  const authorized =
    user?.email.toLowerCase() === 'rox062212@gmail.com' ||
    user?.email.toLowerCase() === 'siri@redball.com.tw';
  if (!authorized)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const summary = await dispatchDueDailyEmails(
    env as unknown as Parameters<typeof dispatchDueDailyEmails>[0],
  );
  return NextResponse.json({ ok: true, ...summary });
}
