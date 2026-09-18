import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  keywords: text('keywords').notNull().default('[]'),
  sendTime: text('send_time').notNull().default('10:00'),
  timeZone: text('time_zone').notNull().default('Asia/Taipei'),
  status: text('status').notNull().default('pending'),
  verificationToken: text('verification_token').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const comments = sqliteTable(
  'comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    articleId: text('article_id').notNull(),
    userId: text('user_id').notNull(),
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email').notNull(),
    body: text('body').notNull(),
    status: text('status').notNull().default('published'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_comments_article_created').on(table.articleId, table.createdAt),
  ],
);

export const savedArticles = sqliteTable(
  'saved_articles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    articleId: text('article_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_saved_user_article').on(table.userId, table.articleId),
  ],
);

export const emailDeliveries = sqliteTable(
  'email_deliveries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    subscriptionId: integer('subscription_id').notNull(),
    digestDate: text('digest_date').notNull(),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    resendEmailId: text('resend_email_id'),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    sentAt: text('sent_at'),
  },
  (table) => [
    uniqueIndex('idx_email_delivery_subscription_date').on(
      table.subscriptionId,
      table.digestDate,
    ),
    index('idx_email_delivery_status').on(table.status, table.updatedAt),
  ],
);
