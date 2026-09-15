import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { comments } from '@/db/schema';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const articleId = new URL(request.url).searchParams.get('articleId')?.trim();
  if (!articleId)
    return NextResponse.json({ error: 'invalid_article' }, { status: 400 });
  const rows = await getDb()
    .select({
      id: comments.id,
      author: comments.authorName,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(eq(comments.articleId, articleId))
    .orderBy(desc(comments.createdAt));
  return NextResponse.json({
    rows: rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    })),
  });
}

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
