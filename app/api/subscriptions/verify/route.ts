import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { subscriptions } from '@/db/schema';
import { computeInitialSendAt } from '@/lib/daily-email';

function page(
  title: string,
  message: string,
  success: boolean,
  subscriptionToken?: string,
) {
  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  if (success && subscriptionToken) {
    headers.set(
      'set-cookie',
      `ai_info_subscription=${encodeURIComponent(subscriptionToken)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
    );
  }
  return new Response(
    `<!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#0a0a0a;color:#f5f5f5;font-family:system-ui,-apple-system,sans-serif">
        <main style="min-height:100vh;display:grid;place-items:center;padding:24px">
          <section style="max-width:560px;border:1px solid #3a3a3a;border-radius:20px;padding:40px;background:#171717;text-align:center">
            <div style="font-size:48px">${success ? '✓' : '!'}</div>
            <h1 style="font-size:28px">${title}</h1>
            <p style="color:#b5b5b5;line-height:1.7">${message}</p>
            <a href="/" style="display:inline-block;margin-top:16px;background:#fff;color:#111;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">返回 AI 情報搜集網</a>
          </section>
        </main>
      </body>
    </html>`,
    { headers },
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim();
  if (!token) return page('驗證連結無效', '請回到網站重新申請驗證信。', false);

  const db = getDb();
  const record = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      sendTime: subscriptions.sendTime,
      timeZone: subscriptions.timeZone,
      nextSendAt: subscriptions.nextSendAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.verificationToken, token))
    .get();

  if (!record) return page('驗證連結已失效', '請回到網站重新申請驗證信。', false);
  if (record.status === 'active' && record.nextSendAt)
    return page(
      '這個信箱已完成驗證',
      '你的每日 AI 情報訂閱已經啟用。',
      true,
      token,
    );

  await db
    .update(subscriptions)
    .set({
      status: 'active',
      nextSendAt: computeInitialSendAt(
        record.timeZone,
        record.sendTime,
        new Date(),
      ),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subscriptions.id, record.id));

  return page(
    'Email 驗證完成',
    '你的訂閱已啟用，之後會依照設定時間寄送每日 AI 情報。',
    true,
    token,
  );
}
