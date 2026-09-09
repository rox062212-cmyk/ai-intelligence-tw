import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { subscriptions } from '@/db/schema';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  return NextResponse.json({ ok: true, status: 'pending' });
}
