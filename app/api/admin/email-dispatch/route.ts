import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAdminUser } from '@/app/admin-auth';
import { dispatchDueDailyEmails } from '@/lib/daily-email';

export async function POST() {
  const admin = await getAdminUser();
  if (!admin)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const summary = await dispatchDueDailyEmails(
    env as unknown as Parameters<typeof dispatchDueDailyEmails>[0],
  );
  return NextResponse.json({ ok: true, ...summary });
}
