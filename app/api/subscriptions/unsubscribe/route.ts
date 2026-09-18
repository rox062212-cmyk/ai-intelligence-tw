import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { subscriptions } from '@/db/schema';

function page(title: string, message: string) {
  return new NextResponse(
    `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head><body style="margin:0;background:#080808;color:#f5f5f5;font-family:system-ui,-apple-system,sans-serif"><main style="max-width:620px;margin:12vh auto;padding:32px"><p style="color:#999">AI 情報搜集網</p><h1>${title}</h1><p style="color:#bbb;line-height:1.8">${message}</p><a href="/" style="color:#fff">返回首頁</a></main></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

async function unsubscribe(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return page('無法取消訂閱', '退訂連結不完整。');
  await getDb()
    .update(subscriptions)
    .set({ status: 'inactive', updatedAt: new Date().toISOString() })
    .where(eq(subscriptions.verificationToken, token));
  return page('已取消訂閱', '之後不會再寄送每日 AI 情報。');
}

export const GET = unsubscribe;
export const POST = unsubscribe;
