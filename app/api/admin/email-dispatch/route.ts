import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAdminUser } from '@/app/admin-auth';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { dispatchDueDailyEmails } from '@/lib/daily-email';

export async function POST(request: Request) {
  const admin = await getAdminUser();
  const user = admin ?? (await getChatGPTUser());
  const runtime = env as unknown as Record<string, string | undefined>;
  const suppliedKey = request.headers.get('x-dispatch-key');
  const scheduledRequest =
    Boolean(runtime.EMAIL_DISPATCH_KEY) &&
    suppliedKey === runtime.EMAIL_DISPATCH_KEY;
  const authorizedUser =
    user?.email.toLowerCase() === 'rox062212@gmail.com' ||
    user?.email.toLowerCase() === 'siri@redball.com.tw';
  if (!authorizedUser && !scheduledRequest)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const summary = await dispatchDueDailyEmails(
    env as unknown as Parameters<typeof dispatchDueDailyEmails>[0],
  );
  return NextResponse.json({ ok: true, ...summary });
}
