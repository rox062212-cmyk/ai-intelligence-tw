import { articles } from '@/lib/content';

const SITE_URL = 'https://ai-intelligence-tw.siri431695.chatgpt.site';

type SubscriptionRecord = {
  id: number;
  email: string;
  keywords: string;
  send_time: string;
  time_zone: string;
  next_send_at: string;
  verification_token: string;
};

type RuntimeEnv = {
  DB: D1Database;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

type PreparedDelivery = {
  id: number;
  status: string;
  attempts: number;
  subject: string | null;
  html: string | null;
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

function calendarParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function utcForZonedLocal(
  timeZone: string,
  date: { year: number; month: number; day: number },
  sendTime: string,
) {
  const [hour, minute] = sendTime.split(':').map(Number);
  const desired = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  let candidate = desired;
  for (let index = 0; index < 4; index += 1) {
    const actual = localDateTime(new Date(candidate), timeZone);
    const [actualYear, actualMonth, actualDay] = actual.date.split('-').map(Number);
    const [actualHour, actualMinute] = actual.time.split(':').map(Number);
    const represented = Date.UTC(
      actualYear,
      actualMonth - 1,
      actualDay,
      actualHour,
      actualMinute,
    );
    const correction = desired - represented;
    candidate += correction;
    if (correction === 0) break;
  }
  return new Date(candidate);
}

export function computeNextSendAt(
  timeZone: string,
  sendTime: string,
  after: Date,
) {
  const local = localDateTime(after, timeZone);
  const [year, month, day] = local.date.split('-').map(Number);
  let localCalendar = new Date(Date.UTC(year, month - 1, day));
  let candidate = utcForZonedLocal(
    timeZone,
    calendarParts(localCalendar),
    sendTime,
  );
  if (candidate.getTime() <= after.getTime()) {
    localCalendar = new Date(localCalendar.getTime() + 86_400_000);
    candidate = utcForZonedLocal(
      timeZone,
      calendarParts(localCalendar),
      sendTime,
    );
  }
  return candidate.toISOString();
}

export function computeInitialSendAt(
  timeZone: string,
  sendTime: string,
  now: Date,
) {
  const local = localDateTime(now, timeZone);
  return local.time >= sendTime
    ? now.toISOString()
    : computeNextSendAt(timeZone, sendTime, now);
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

function articlePublishedAt(value: string) {
  return new Date(`${value.replace(' ', 'T')}:00+08:00`);
}

function articlesInDeliveryWindow(scheduledFor: string) {
  const end = new Date(scheduledFor);
  const start = new Date(end.getTime() - 24 * 60 * 60_000);
  return articles
    .filter((article) => article.sources.length >= 3)
    .filter((article) => {
      const publishedAt = articlePublishedAt(article.publishedAt);
      return publishedAt > start && publishedAt <= end;
    })
    .sort(
      (left, right) =>
        articlePublishedAt(right.publishedAt).getTime() -
        articlePublishedAt(left.publishedAt).getTime(),
    );
}

function deliveryWindowLabel(scheduledFor: string, timeZone: string) {
  const end = new Date(scheduledFor);
  const start = new Date(end.getTime() - 24 * 60 * 60_000);
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${formatter.format(start)}～${formatter.format(end)}`;
}

function digestSubject(scheduledFor: string) {
  const lead = articlesInDeliveryWindow(scheduledFor)[0];
  return lead
    ? `每日 AI 重點｜${lead.title}`
    : '每日 AI 重點｜過去 24 小時暫無重要更新';
}

function renderEmail(subscription: SubscriptionRecord, scheduledFor: string) {
  // Product rule: every digest keeps the full editorial format. The delivery
  // window is the preceding 24 hours; the lead story receives a deep analysis,
  // while every other verified story remains in the complete summary list.
  // Do not replace this with a cards-only digest.
  const selected = articlesInDeliveryWindow(scheduledFor);
  const keywords = parseKeywords(subscription.keywords).map((item) =>
    item.toLowerCase(),
  );
  const unsubscribeUrl = `${SITE_URL}/api/subscriptions/unsubscribe?token=${encodeURIComponent(subscription.verification_token)}`;
  const lead = selected[0];
  const categoryCounts = [...new Set(selected.map((article) => article.category))]
    .map(
      (category) =>
        `${category} ${selected.filter((article) => article.category === category).length} 則`,
    )
    .join('、');
  const cards = selected
    .map((article) => {
      const haystack = [
        article.title,
        article.summary,
        article.category,
        ...article.tags,
      ]
        .join(' ')
        .toLowerCase();
      const matched = keywords.some((keyword) => haystack.includes(keyword));
      return `
        <tr>
          <td style="padding:18px 0;border-top:1px solid #ddd">
            <p style="font-size:13px;line-height:1.5;margin:0 0 6px;color:#666">${matched ? '符合你的關注・' : ''}${escapeHtml(article.category)}・${escapeHtml(article.publishedAt)}</p>
            <h3 style="font-size:18px;line-height:1.5;margin:0 0 8px;color:#111">${escapeHtml(article.title)}</h3>
            <p style="font-size:15px;line-height:1.7;margin:0 0 10px;color:#444">${escapeHtml(article.summary)}</p>
            <a href="${SITE_URL}/?article=${encodeURIComponent(article.id)}" style="font-size:15px;color:#111;font-weight:700">閱讀完整整理</a>
          </td>
        </tr>`;
    })
    .join('') ||
    '<tr><td style="padding:24px 0;border-top:1px solid #ddd;color:#555">這 24 小時內尚無通過多來源驗證門檻的新情報。</td></tr>';
  const subject = digestSubject(scheduledFor);
  const windowLabel = deliveryWindowLabel(
    scheduledFor,
    subscription.time_zone,
  );
  const featureSections = lead
    ? [
        {
          heading: '今日全貌',
          text: `${lead.summary}\n\n${lead.body[0]?.text ?? ''}`,
        },
        {
          heading: '為什麼值得注意？',
          text: lead.body[1]?.text ?? lead.summary,
        },
        {
          heading: '對企業與市場的影響',
          text: lead.body[2]?.text ?? lead.summary,
        },
        {
          heading: '尚未確定的地方',
          text:
            lead.evidenceNote ??
            '目前仍需等待更多第一手資料與獨立來源交叉驗證。',
        },
      ]
        .map(
          (section) => `
            <section style="margin:0 0 28px">
              <h2 style="font-size:22px;line-height:1.4;margin:0 0 12px;color:#111">${escapeHtml(section.heading)}</h2>
              ${section.text
                .split('\n\n')
                .filter(Boolean)
                .map(
                  (paragraph) =>
                    `<p style="font-size:16px;line-height:1.75;margin:0 0 12px;color:#333">${escapeHtml(paragraph)}</p>`,
                )
                .join('')}
            </section>`,
        )
        .join('')
    : '';
  const conclusion = lead?.body.at(-1)?.text ?? lead?.summary ?? '';

  return `<!doctype html>
  <html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
  <body style="margin:0;background:#f3f3f3;font-family:Arial,'Noto Sans TC',sans-serif;color:#111">
    <div style="display:none;max-height:0;overflow:hidden">整理寄送時間往前 24 小時的重要 AI 情報。</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f3f3"><tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #ddd">
        <tr><td style="padding:32px">
          <p style="font-size:13px;letter-spacing:.08em;margin:0 0 12px;color:#666">每日 AI 重點・過去 24 小時</p>
          <h1 style="font-size:30px;line-height:1.35;margin:0 0 14px;color:#111">${escapeHtml(lead?.title ?? '過去 24 小時暫無重要更新')}</h1>
          <p style="font-size:15px;line-height:1.7;margin:0 0 10px;color:#666">統計區間：${escapeHtml(windowLabel)}（${escapeHtml(subscription.time_zone)}）</p>
          <p style="font-size:17px;line-height:1.75;margin:0 0 28px;color:#444">${selected.length > 0 ? `這 24 小時共有 ${selected.length} 則情報通過多來源驗證。${categoryCounts ? `涵蓋 ${escapeHtml(categoryCounts)}。` : ''}${lead ? `以下先深入整理最重要的「${escapeHtml(lead.title)}」，再列出完整情報摘要。` : ''}` : '這 24 小時內沒有通過多來源驗證門檻的新情報。'}</p>
          ${featureSections}
          ${lead ? `<p style="font-size:17px;line-height:1.75;margin:4px 0 30px;padding:18px;background:#f4f4f4;color:#111"><strong>今日結論</strong><br>${escapeHtml(conclusion)}</p>` : ''}
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
  delivery: PreparedDelivery,
) {
  const now = new Date().toISOString();
  const claim = await env.DB.prepare(
    `UPDATE email_deliveries
       SET status = 'sending', attempts = attempts + 1, updated_at = ?
     WHERE id = ? AND status IN ('pending', 'failed') AND attempts < 3`,
  )
    .bind(now, delivery.id)
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
        subject: delivery.subject ?? digestSubject(subscription.next_send_at),
        html:
          delivery.html ??
          renderEmail(subscription, subscription.next_send_at),
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
          delivery.id,
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
      .bind(result?.id ?? null, sentAt, sentAt, delivery.id)
      .run();
    return 'sent';
  } catch (error) {
    await env.DB.prepare(
      `UPDATE email_deliveries SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(
        String(error).slice(0, 500),
        new Date().toISOString(),
        delivery.id,
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

  const { results: missingSchedule = [] } = await env.DB.prepare(
    `SELECT id, send_time, time_zone FROM subscriptions
     WHERE status = 'active' AND next_send_at IS NULL LIMIT 500`,
  ).all<{ id: number; send_time: string; time_zone: string }>();
  for (const subscription of missingSchedule) {
    let nextSendAt: string;
    try {
      nextSendAt = computeInitialSendAt(
        subscription.time_zone,
        subscription.send_time,
        now,
      );
    } catch {
      continue;
    }
    await env.DB.prepare(
      `UPDATE subscriptions SET next_send_at = ?, updated_at = ?
       WHERE id = ? AND next_send_at IS NULL`,
    )
      .bind(nextSendAt, now.toISOString(), subscription.id)
      .run();
  }

  const preparationDeadline = new Date(now.getTime() + 30 * 60_000).toISOString();
  const { results: upcoming = [] } = await env.DB.prepare(
    `SELECT id, email, keywords, send_time, time_zone, next_send_at,
            verification_token
     FROM subscriptions
     WHERE status = 'active' AND next_send_at <= ?
     ORDER BY next_send_at ASC LIMIT 500`,
  )
    .bind(preparationDeadline)
    .all<SubscriptionRecord>();
  let prepared = 0;
  for (const subscription of upcoming) {
    let digestDate: string;
    try {
      digestDate = localDateTime(
        new Date(subscription.next_send_at),
        subscription.time_zone,
      ).date;
    } catch {
      continue;
    }
    const preparedAt = now.toISOString();
    const result = await env.DB.prepare(
      `INSERT INTO email_deliveries
        (subscription_id, digest_date, status, attempts, scheduled_for,
         subject, html, prepared_at, created_at, updated_at)
       VALUES (?, ?, 'pending', 0, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(subscription_id, digest_date) DO NOTHING`,
    )
      .bind(
        subscription.id,
        digestDate,
        subscription.next_send_at,
        digestSubject(subscription.next_send_at),
        renderEmail(subscription, subscription.next_send_at),
        preparedAt,
        preparedAt,
        preparedAt,
      )
      .run();
    prepared += result.meta.changes ?? 0;
  }

  const { results = [] } = await env.DB.prepare(
    `SELECT id, email, keywords, send_time, time_zone, next_send_at,
            verification_token
     FROM subscriptions
     WHERE status = 'active' AND next_send_at <= ?
     ORDER BY next_send_at ASC LIMIT 500`,
  )
    .bind(now.toISOString())
    .all<SubscriptionRecord>();

  const summary = {
    checked: results.length,
    initialized: missingSchedule.length,
    prepared,
    due: results.length,
    sent: 0,
    failed: 0,
  };
  for (const subscription of results) {
    let digestDate: string;
    try {
      digestDate = localDateTime(
        new Date(subscription.next_send_at),
        subscription.time_zone,
      ).date;
    } catch {
      continue;
    }
    const createdAt = now.toISOString();
    await env.DB.prepare(
      `INSERT INTO email_deliveries
        (subscription_id, digest_date, status, attempts, scheduled_for,
         subject, html, prepared_at, created_at, updated_at)
       VALUES (?, ?, 'pending', 0, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(subscription_id, digest_date) DO NOTHING`,
    )
      .bind(
        subscription.id,
        digestDate,
        subscription.next_send_at,
        digestSubject(subscription.next_send_at),
        renderEmail(subscription, subscription.next_send_at),
        createdAt,
        createdAt,
        createdAt,
      )
      .run();
    const delivery = await env.DB.prepare(
      `SELECT id, status, attempts, subject, html FROM email_deliveries
       WHERE subscription_id = ? AND digest_date = ?`,
    )
      .bind(subscription.id, digestDate)
      .first<PreparedDelivery>();
    const advanceSchedule = async () => {
      const nextSendAt = computeNextSendAt(
        subscription.time_zone,
        subscription.send_time,
        now,
      );
      await env.DB.prepare(
        `UPDATE subscriptions SET next_send_at = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(nextSendAt, now.toISOString(), subscription.id)
        .run();
    };
    if (!delivery) continue;
    if (delivery.status === 'sent' || delivery.attempts >= 3) {
      await advanceSchedule();
      continue;
    }
    const outcome = await sendOne(
      env,
      subscription,
      digestDate,
      delivery,
    );
    if (outcome === 'sent') summary.sent += 1;
    if (outcome === 'failed') summary.failed += 1;
    if (outcome === 'sent') {
      await advanceSchedule();
    } else if (outcome === 'failed') {
      const attempts = await env.DB.prepare(
        `SELECT attempts FROM email_deliveries WHERE id = ?`,
      )
        .bind(delivery.id)
        .first<{ attempts: number }>();
      if ((attempts?.attempts ?? 0) >= 3) await advanceSchedule();
    }
  }
  return summary;
}
