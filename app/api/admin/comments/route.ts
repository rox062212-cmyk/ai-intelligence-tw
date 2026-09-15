import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getAdminUser } from '@/app/admin-auth';
import { getDb } from '@/db';
import { comments } from '@/db/schema';

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
    .select()
    .from(comments)
    .orderBy(desc(comments.createdAt));
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
  if (!Number.isInteger(id) || !['published', 'hidden'].includes(String(status)))
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  await getDb()
    .update(comments)
    .set({ status: String(status) })
    .where(eq(comments.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id))
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  await getDb().delete(comments).where(eq(comments.id, id));
  return NextResponse.json({ ok: true });
}
