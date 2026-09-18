import { articles, dailyBriefing } from '@/lib/content';

const SITE_URL = 'https://ai-intelligence-tw.siri431695.chatgpt.site';

type SubscriptionRecord = {
  id: number;
  email: string;
  keywords: string;
  send_time: string;
  time_zone: string;
  verification_token: string;
};

type RuntimeEnv = {
  DB: D1Database;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function localDateTime(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function parseKeywords(raw: string) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function selectedArticles(rawKeywords: string) {
  const keywords = parseKeywords(rawKeywords).map((item) => item.toLowerCase());
  const publishable = articles.filter((article) => article.sources.length >= 3);
  if (keywords.length === 0) return publishable.slice(0, 5);
  const matched = publishable.filter((article) => {
    const haystack = [
      article.title,
      article.summary,
      article.category,
      ...article.tags,
    ]
      .join(' ')
      .toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
  return (matched.length > 0 ? matched : publishable).slice(0, 5);
}

function renderEmail(subscription: SubscriptionRecord) {
  const selected = selectedArticles(subscription.keywords);
  const unsubscribeUrl = `${SITE_URL}/api/subscriptions/unsubscribe?token=${encodeURIComponent(subscription.verification_token)}`;
  const sections = dailyBriefing.sections
    .slice(0, 4)
    .map(
      (section) => `
        <section style="margin:0 0 28px">
          <h2 style="font-size:20px;line-height:1.4;margin:0 0 10px;color:#111">${escapeHtml(section.heading)}</h2>
          ${section.paragraphs
            .map(
              (paragraph) =>
                `<p style="font-size:16px;line-height:1.75;margin:0 0 12px;color:#333">${escapeHtml(paragraph.text)}</p>`,
            )
            .join('')}
        </section>`,
    )
    .join('');
  const cards = selected
    .map(
      (article) => `
        <tr>
          <td style="padding:18px 0;border-top:1px solid #ddd">
            <p style="font-size:13px;line-height:1.5;margin:0 0 6px;color:#666">${escapeHtml(article.category)}・${escapeHtml(article.publishedAt)}</p>
            <h3 style="font-size:18px;line-height:1.5;margin:0 0 8px;color:#111">${escapeHtml(article.title)}</h3>
            <p style="font-size:15px;line-height:1.7;margin:0 0 10px;color:#444">${escapeHtml(article.summary)}</p>
            <a href="${SITE_URL}/?article=${encodeURIComponent(article.id)}" style="font-size:15px;color:#111;font-weight:700">閱讀完整整理</a>
          </td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
  <html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(dailyBriefing.title)}</title></head>
  <body style="margin:0;background:#f3f3f3;font-family:Arial,'Noto Sans TC',sans-serif;color:#111">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(dailyBriefing.summary)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f3f3"><tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #ddd">
        <tr><td style="padding:32px">
          <p style="font-size:13px;letter-spacing:.08em;margin:0 0 12px;color:#666">每日 AI 重點・${escapeHtml(dailyBriefing.date)}</p>
          <h1 style="font-size:30px;line-height:1.35;margin:0 0 14px;color:#111">${escapeHtml(dailyBriefing.title)}</h1>
          <p style="font-size:17px;line-height:1.75;margin:0 0 28px;color:#444">${escapeHtml(dailyBriefing.lead)}</p>
          ${sections}
          <p style="font-size:17px;line-height:1.75;margin:4px 0 30px;padding:18px;background:#f4f4f4;color:#111"><strong>今日結論</strong><br>${escapeHtml(dailyBriefing.conclusion)}</p>
          <h2 style="font-size:22px;line-height:1.4;margin:0 0 4px;color:#111">你可能關注的情報</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${cards}</table>
          <p style="margin:28px 0"><a href="${SITE_URL}" style="display:inline-block;background:#111;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700">前往 AI 情報搜集網</a></p>
          <p style="font-size:12px;line-height:1.7;margin:24px 0 0;color:#777">你收到此信，是因為你已驗證每日 AI 情報訂閱。<a href="${unsubscribeUrl}" style="color:#555">取消訂閱</a></p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

async function sendOne(
  env: RuntimeEnv,
  subscription: SubscriptionRecord,
  digestDate: string,
  deliveryId: number,
) {
  const now = new Date().toISOString();
  const claim = await env.DB.prepare(
    `UPDATE email_deliveries
       SET status = 'sending', attempts = attempts + 1, updated_at = ?
     WHERE id = ? AND status IN ('pending', 'failed') AND attempts < 3`,
  )
    .bind(now, deliveryId)
    .run();
  if ((claim.meta.changes ?? 0) === 0) return 'skipped';

  const unsubscribeUrl = `${SITE_URL}/api/subscriptions/unsubscribe?token=${encodeURIComponent(subscription.verification_token)}`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
        'idempotency-key': `daily-ai-${subscription.id}-${digestDate}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [subscription.email],
        subject: `每日 AI 重點｜${dailyBriefing.title}`,
        html: renderEmail(subscription),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      await env.DB.prepare(
        `UPDATE email_deliveries
           SET status = 'failed', attempts = CASE WHEN ? THEN attempts ELSE 3 END,
               last_error = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(
          retryable ? 1 : 0,
          `${response.status}: ${result?.message ?? 'Resend request failed'}`.slice(
            0,
            500,
          ),
          new Date().toISOString(),
          deliveryId,
        )
        .run();
      return 'failed';
    }
    const sentAt = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE email_deliveries
         SET status = 'sent', resend_email_id = ?, last_error = NULL,
             sent_at = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(result?.id ?? null, sentAt, sentAt, deliveryId)
      .run();
    return 'sent';
  } catch (error) {
    await env.DB.prepare(
      `UPDATE email_deliveries SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(
        String(error).slice(0, 500),
        new Date().toISOString(),
        deliveryId,
      )
      .run();
    return 'failed';
  }
}

export async function dispatchDueDailyEmails(env: RuntimeEnv, now = new Date()) {
  if (!env.DB || !env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error('Daily email runtime configuration is incomplete.');
  }

  const staleBefore = new Date(now.getTime() - 10 * 60_000).toISOString();
  await env.DB.prepare(
    `UPDATE email_deliveries SET status = 'failed', updated_at = ?
     WHERE status = 'sending' AND updated_at < ? AND attempts < 3`,
  )
    .bind(now.toISOString(), staleBefore)
    .run();

  const { results = [] } = await env.DB.prepare(
    `SELECT id, email, keywords, send_time, time_zone, verification_token
     FROM subscriptions WHERE status = 'active'`,
  ).all<SubscriptionRecord>();

  const summary = { checked: results.length, due: 0, sent: 0, failed: 0 };
  for (const subscription of results) {
    let local: { date: string; time: string };
    try {
      local = localDateTime(now, subscription.time_zone);
    } catch {
      continue;
    }
    if (local.time < subscription.send_time) continue;
    summary.due += 1;
    const createdAt = now.toISOString();
    await env.DB.prepare(
      `INSERT INTO email_deliveries
        (subscription_id, digest_date, status, attempts, created_at, updated_at)
       VALUES (?, ?, 'pending', 0, ?, ?)
       ON CONFLICT(subscription_id, digest_date) DO NOTHING`,
    )
      .bind(subscription.id, local.date, createdAt, createdAt)
      .run();
    const delivery = await env.DB.prepare(
      `SELECT id, status, attempts FROM email_deliveries
       WHERE subscription_id = ? AND digest_date = ?`,
    )
      .bind(subscription.id, local.date)
      .first<{ id: number; status: string; attempts: number }>();
    if (!delivery || delivery.status === 'sent' || delivery.attempts >= 3) continue;
    const outcome = await sendOne(env, subscription, local.date, delivery.id);
    if (outcome === 'sent') summary.sent += 1;
    if (outcome === 'failed') summary.failed += 1;
  }
  return summary;
}
