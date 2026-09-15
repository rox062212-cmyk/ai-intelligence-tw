import { NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { subscriptions } from '@/db/schema';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getMailConfig() {
  const runtime = env as unknown as Record<string, string | undefined>;
  return {
    apiKey: runtime.RESEND_API_KEY,
    from: runtime.EMAIL_FROM,
  };
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    email?: unknown;
    keywords?: unknown;
    sendTime?: unknown;
    timeZone?: unknown;
  } | null;
  const email =
    typeof payload?.email === 'string'
      ? payload.email.trim().toLowerCase()
      : '';
  const keywords = Array.isArray(payload?.keywords)
    ? payload.keywords
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 20)
    : [];
  const sendTime =
    typeof payload?.sendTime === 'string' ? payload.sendTime : '';
  const timeZone =
    typeof payload?.timeZone === 'string' ? payload.timeZone : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 254)
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(sendTime))
    return NextResponse.json({ error: 'invalid_time' }, { status: 400 });
  try {
    new Intl.DateTimeFormat('zh-TW', { timeZone }).format();
  } catch {
    return NextResponse.json({ error: 'invalid_timezone' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const token = crypto.randomUUID();
  const db = getDb();
  await db
    .insert(subscriptions)
    .values({
      email,
      keywords: JSON.stringify(keywords),
      sendTime,
      timeZone,
      verificationToken: token,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscriptions.email,
      set: {
        keywords: JSON.stringify(keywords),
        sendTime,
        timeZone,
        status: 'pending',
        verificationToken: token,
        updatedAt: now,
      },
    });

  const mail = getMailConfig();
  if (!mail.apiKey || !mail.from) {
    return NextResponse.json(
      { error: 'email_service_unconfigured' },
      { status: 503 },
    );
  }

  const verifyUrl = new URL('/api/subscriptions/verify', request.url);
  verifyUrl.searchParams.set('token', token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${mail.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: mail.from,
      to: [email],
      subject: '請驗證你的「AI 情報搜集網」訂閱',
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.7;color:#111;max-width:560px;margin:auto">
          <h1 style="font-size:24px">驗證每日 AI 情報訂閱</h1>
          <p>你已申請在每天 ${sendTime}（${timeZone}）接收 AI 情報。</p>
          <p><a href="${verifyUrl.toString()}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">完成 Email 驗證</a></p>
          <p style="color:#666;font-size:14px">若你沒有提出這項申請，可以直接忽略此信。</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    console.error('Verification email delivery failed', response.status);
    return NextResponse.json({ error: 'email_delivery_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, status: 'pending' });
}
