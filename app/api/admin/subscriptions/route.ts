import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getAdminUser } from '@/app/admin-auth';
import { getDb } from '@/db';
import { subscriptions } from '@/db/schema';

async function authorize() {
  const admin = await getAdminUser();
  if (!admin)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await authorize();
  if (denied) return denied;
  const rows = await getDb()
    .select({
      id: subscriptions.id,
      email: subscriptions.email,
      keywords: subscriptions.keywords,
      status: subscriptions.status,
      sendTime: subscriptions.sendTime,
      timeZone: subscriptions.timeZone,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .orderBy(desc(subscriptions.updatedAt));
  return NextResponse.json({ rows });
}

export async function PATCH(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  const payload = (await request.json().catch(() => null)) as {
    id?: unknown;
    status?: unknown;
  } | null;
  const id = Number(payload?.id);
  const status = payload?.status;
  if (!Number.isInteger(id) || !['active', 'paused', 'pending'].includes(String(status)))
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  await getDb()
    .update(subscriptions)
    .set({ status: String(status), updatedAt: new Date().toISOString() })
    .where(eq(subscriptions.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id))
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  await getDb().delete(subscriptions).where(eq(subscriptions.id, id));
  return NextResponse.json({ ok: true });
}
