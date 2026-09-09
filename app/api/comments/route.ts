import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { comments } from '@/db/schema';
import { getChatGPTUser } from '@/app/chatgpt-auth';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return NextResponse.json(
      { error: 'authentication_required' },
      { status: 401 },
    );
  const payload = (await request.json().catch(() => null)) as {
    articleId?: unknown;
    body?: unknown;
  } | null;
  const articleId =
    typeof payload?.articleId === 'string' ? payload.articleId.trim() : '';
  const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
  if (!articleId || !body || body.length > 2000)
    return NextResponse.json({ error: 'invalid_comment' }, { status: 400 });
  const createdAt = new Date().toISOString();
  const db = getDb();
  const [row] = await db
    .insert(comments)
    .values({
      articleId,
      userId: user.userId,
      authorName: user.displayName,
      authorEmail: user.email,
      body,
      createdAt,
    })
    .returning({ id: comments.id });
  return NextResponse.json({ id: row.id, createdAt });
}
