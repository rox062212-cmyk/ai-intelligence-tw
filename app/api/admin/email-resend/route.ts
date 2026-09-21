import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getAdminUser } from '@/app/admin-auth';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { subscriptions } from '@/db/schema';
import { digestSubject, renderEmail } from '@/lib/daily-email';

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

  const payload = (await request.json().catch(() => null)) as {
    subscriptionId?: unknown;
    resendKey?: unknown;
  } | null;
  const subscriptionId = Number(payload?.subscriptionId);
  const resendKey =
    typeof payload?.resendKey === 'string' ? payload.resendKey.trim() : '';
  if (
    !Number.isInteger(subscriptionId) ||
    !/^[a-z0-9-]{1,64}$/i.test(resendKey)
  )
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  if (!runtime.RESEND_API_KEY || !runtime.EMAIL_FROM)
    return NextResponse.json({ error: 'email_service_unconfigured' }, { status: 503 });

  const subscription = await getDb()
    .select({
      id: subscriptions.id,
      email: subscriptions.email,
      keywords: subscriptions.keywords,
      sendTime: subscriptions.sendTime,
      timeZone: subscriptions.timeZone,
      nextSendAt: subscriptions.nextSendAt,
      verificationToken: subscriptions.verificationToken,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .get();
  if (!subscription || subscription.status !== 'active')
    return NextResponse.json({ error: 'subscription_not_active' }, { status: 404 });

  const scheduledFor = new Date().toISOString();
  const subject = digestSubject(scheduledFor);
  const html = renderEmail(
    {
      id: subscription.id,
      email: subscription.email,
      keywords: subscription.keywords,
      send_time: subscription.sendTime,
      time_zone: subscription.timeZone,
      next_send_at: subscription.nextSendAt ?? scheduledFor,
      verification_token: subscription.verificationToken,
    },
    scheduledFor,
  );
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${runtime.RESEND_API_KEY}`,
      'content-type': 'application/json',
      'idempotency-key': `manual-daily-ai-${subscription.id}-${resendKey}`,
    },
    body: JSON.stringify({
      from: runtime.EMAIL_FROM,
      to: [subscription.email],
      subject,
      html,
    }),
  });
  const result = (await response.json().catch(() => null)) as
    | { id?: string; message?: string }
    | null;
  if (!response.ok)
    return NextResponse.json(
      { error: 'email_delivery_failed', detail: result?.message ?? null },
      { status: response.status },
    );
  return NextResponse.json({ ok: true, resendEmailId: result?.id ?? null });
}
