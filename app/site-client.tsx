'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatGPTUser } from './chatgpt-auth';
import {
  articles,
  calendarEvents,
  dailyBriefing,
  type Article,
  type Source,
} from '@/lib/content';

type View = 'home' | 'daily' | 'calendar' | 'search' | 'article' | 'admin';
type Theme = 'system' | 'light' | 'dark';
type Comment = { id: number; author: string; body: string; createdAt: string };
type AdminSubscription = {
  id: number;
  email: string;
  keywords: string;
  status: string;
  sendTime: string;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
};
type AdminComment = {
  id: number;
  articleId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  status: string;
  createdAt: string;
};

const nav: { id: View; label: string }[] = [
  { id: 'home', label: '首頁' },
  { id: 'calendar', label: 'AI 日曆' },
];

const publishableArticles = articles.filter(
  (article) => article.sources.length >= 3,
);
const chronologicallySorted = [...publishableArticles].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);
const newestDate = chronologicallySorted[0]?.publishedAt.slice(0, 10) ?? '';
const recentFeatured = chronologicallySorted.slice(0, 3);
const earlierFeatured = chronologicallySorted
  .filter((article) => article.publishedAt.slice(0, 10) !== newestDate)
  .sort(
    (a, b) =>
      b.sources.length - a.sources.length ||
      b.publishedAt.localeCompare(a.publishedAt),
  )
  .slice(0, 3);
const featuredArticles = [...recentFeatured, ...earlierFeatured];
const featuredIds = new Set(featuredArticles.map((article) => article.id));
const moreArticles = chronologicallySorted.filter(
  (article) => !featuredIds.has(article.id),
);

function evidenceLabel(article: Article) {
  return article.evidenceLevel ?? (article.verified ? '多方證實' : '傳聞追蹤');
}

function sourceReliability(source: Source) {
  if (source.reliability) return source.reliability;
  if (source.type === '官方公告') return '第一手官方來源';
  if (source.type === '新聞') return '可信媒體';
  if (source.type === '研究' || source.type === '技術文件')
    return '研究或技術來源';
  return '來源可核對';
}

function compactArticleDate(article: Article) {
  return article.publishedAt.slice(0, 10).replaceAll('-', '.');
}

export default function SiteClient({
  user,
  initialView = 'home',
}: {
  user: ChatGPTUser | null;
  initialView?: View;
}) {
  const isAdmin = user?.email.toLowerCase() === 'rox062212@gmail.com';
  const [view, setView] = useState<View>(initialView);
  const [selected, setSelected] = useState<Article>(articles[0]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [calendarFilter, setCalendarFilter] = useState('全部');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [email, setEmail] = useState(user?.email ?? '');
  const [keywords, setKeywords] = useState('');
  const [sendTime, setSendTime] = useState('10:00');
  const [timeZone, setTimeZone] = useState('Asia/Taipei');
  const [subscribeState, setSubscribeState] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('ai-info-theme') as Theme | null;
    if (saved) setTheme(saved);
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserZone) setTimeZone(browserZone);
  }, []);

  useEffect(() => {
    if (view !== 'article') return;
    setComments([]);
    fetch(`/api/comments?articleId=${encodeURIComponent(selected.id)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { rows: Comment[] }) => setComments(data.rows))
      .catch(() => setCommentError('目前無法載入留言。'));
  }, [selected.id, view]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      root.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && media.matches),
      );
    apply();
    media.addEventListener('change', apply);
    localStorage.setItem('ai-info-theme', theme);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    type ModelTool = {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: ModelTool,
            options?: { signal?: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool: ModelTool = {
      name: 'search_ai_intelligence',
      title: '搜尋 AI 情報',
      description:
        '使用關鍵字搜尋網站內已整理及保留來源的 AI 情報，並在畫面顯示結果。',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', minLength: 1, maxLength: 100 } },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const value =
          typeof input === 'object' && input !== null && 'query' in input
            ? String((input as { query: unknown }).query).trim()
            : '';
        if (!value || value.length > 100)
          throw new Error('請提供 1 到 100 個字的搜尋關鍵字。');
        setQuery(value);
        setCategory('全部');
        setView('search');
        const normalized = value.toLowerCase();
        const count = articles.filter((article) =>
          [article.title, article.summary, article.category, ...article.tags]
            .join(' ')
            .toLowerCase()
            .includes(normalized),
        ).length;
        return { query: value, resultCount: count };
      },
    };
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => undefined);
    } catch {
      /* Browser does not support WebMCP. */
    }
    return () => lifecycle.abort();
  }, []);

  const categories = [
    '全部',
    ...Array.from(new Set(articles.map((article) => article.category))),
  ];
  const eventTypes = [
    '全部',
    ...Array.from(new Set(calendarEvents.map((event) => event.type))),
  ];
  const results = useMemo(
    () =>
      articles.filter((article) => {
        const text = [
          article.title,
          article.summary,
          article.category,
          ...article.tags,
          ...article.sources.map((source) => source.name),
        ]
          .join(' ')
          .toLowerCase();
        return (
          (category === '全部' || article.category === category) &&
          (!query.trim() || text.includes(query.trim().toLowerCase()))
        );
      }),
    [category, query],
  );
  const filteredEvents = calendarEvents.filter(
    (event) => calendarFilter === '全部' || event.type === calendarFilter,
  );

  const go = (next: View) => {
    setView(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openArticle = (article: Article) => {
    setSelected(article);
    go('article');
  };

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    setSubscribeState('loading');
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          sendTime,
          timeZone,
          keywords: keywords
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) throw new Error('subscribe');
      setSubscribeState('done');
    } catch {
      setSubscribeState('error');
    }
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    const body = commentText.trim();
    if (!body) return;
    setCommentError('');
    if (!user) {
      window.location.href = `/signin-with-chatgpt?return_to=${encodeURIComponent('/')}`;
      return;
    }
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ articleId: selected.id, body }),
      });
      if (!response.ok) throw new Error('comment');
      const data = (await response.json()) as { id: number };
      setComments((items) => [
        { id: data.id, author: user.displayName, body, createdAt: '剛剛' },
        ...items,
      ]);
    } catch {
      setCommentError('留言未送出，請稍後再試。');
      return;
    }
    setCommentText('');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-8">
          <button
            className="flex shrink-0 items-center gap-2"
            onClick={() => go('home')}
            aria-label="回到首頁"
          >
            <span className="grid size-8 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
              AI
            </span>
            <strong className="hidden whitespace-nowrap sm:block">
              ＡＩ情報搜集網
            </strong>
          </button>
          <nav
            className="hidden min-w-0 flex-1 items-center gap-1 md:flex"
            aria-label="主要選單"
          >
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-sm ${view === item.id ? 'bg-secondary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {item.label}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => {
                  window.location.href = '/admin';
                }}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-sm ${view === 'admin' ? 'bg-secondary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                管理後台
              </button>
            )}
          </nav>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              go('search');
            }}
            className="relative ml-auto hidden w-full max-w-xs sm:block"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => go('search')}
              className="h-10 w-full rounded-full border border-input bg-transparent pl-9 pr-4 text-base outline-none focus:ring-2 focus:ring-ring"
              placeholder="搜尋模型、公司、領域…"
              aria-label="搜尋情報"
            />
          </form>
          <button
            onClick={() => setSubscribeOpen(true)}
            className="hidden whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background lg:block"
          >
            訂閱每日情報
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border"
            aria-label="顯示設定"
          >
            <Settings className="size-4" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border md:hidden"
            aria-label="開啟選單"
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-border bg-background px-4 py-4 md:hidden">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                go('search');
              }}
              className="relative mb-3"
            >
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded-full border border-input bg-transparent pl-9 pr-4"
                placeholder="搜尋情報"
              />
            </form>
            <div className="flex flex-col">
              {nav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className="border-b border-border py-3 text-left"
                >
                  {item.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => {
                    window.location.href = '/admin';
                  }}
                  className="border-b border-border py-3 text-left"
                >
                  管理後台
                </button>
              )}
              <button
                onClick={() => setSubscribeOpen(true)}
                className="py-3 text-left"
              >
                訂閱每日情報
              </button>
            </div>
          </div>
        )}
      </header>

      {view === 'home' && (
        <HomeView
          onArticle={openArticle}
          onDaily={() => go('daily')}
          onCalendar={() => go('calendar')}
          onSubscribe={() => setSubscribeOpen(true)}
        />
      )}
      {view === 'daily' && <DailyView />}
      {view === 'calendar' && (
        <CalendarView
          filters={eventTypes}
          activeFilter={calendarFilter}
          setFilter={setCalendarFilter}
          events={filteredEvents}
        />
      )}
      {view === 'search' && (
        <SearchView
          query={query}
          categories={categories}
          category={category}
          setCategory={setCategory}
          results={results}
          onArticle={openArticle}
        />
      )}
      {view === 'article' && (
        <ArticleView
          article={selected}
          comments={comments}
          commentError={commentError}
          user={user}
          commentText={commentText}
          setCommentText={setCommentText}
          addComment={addComment}
          onBack={() => go('home')}
        />
      )}
      {view === 'admin' && isAdmin && <AdminView adminEmail={user.email} />}

      <footer className="mt-16 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row lg:px-8">
          <span>© 2026 ＡＩ情報搜集網</span>
          <span>所有情報均保留原始來源，重要內容應回原文確認。</span>
        </div>
      </footer>

      {settingsOpen && (
        <Modal title="顯示設定" onClose={() => setSettingsOpen(false)}>
          <fieldset className="space-y-2">
            <legend className="mb-3 text-sm text-muted-foreground">
              網站預設跟隨 Chrome 或裝置外觀。
            </legend>
            {(
              [
                ['system', '跟隨系統', '依照 Chrome／裝置設定'],
                ['light', '淺色模式', '白色底、黑色文字'],
                ['dark', '深色模式', '黑色底、白色文字'],
              ] as const
            ).map(([value, label, description]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-3 border-b border-border py-4 last:border-0"
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={theme === value}
                  onChange={() => setTheme(value)}
                  className="size-4 accent-foreground"
                />
                <span className="flex-1">
                  <strong className="block">{label}</strong>
                  <small className="text-muted-foreground">{description}</small>
                </span>
                {theme === value && <Check className="size-4" />}
              </label>
            ))}
          </fieldset>
        </Modal>
      )}
      {subscribeOpen && (
        <Modal title="訂閱每日 AI 情報" onClose={() => setSubscribeOpen(false)}>
          {subscribeState === 'done' ? (
            <div className="py-8 text-center">
              <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-foreground text-background">
                <Check />
              </span>
              <h3 className="text-xl font-semibold">已收到訂閱申請</h3>
              <p className="mt-2 text-muted-foreground">
                已保存每日 {sendTime}（{timeZone}
                ）的寄送偏好。正式寄信服務連線後，系統會寄出驗證信。
              </p>
            </div>
          ) : (
            <form onSubmit={subscribe} className="space-y-5">
              <p className="text-muted-foreground">
                選擇你希望每天收到 AI 重點的時間。
              </p>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-transparent px-3"
                  placeholder="name@example.com"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    寄送時間
                  </span>
                  <input
                    required
                    type="time"
                    value={sendTime}
                    onChange={(event) => setSendTime(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-transparent px-3"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">時區</span>
                  <select
                    value={timeZone}
                    onChange={(event) => setTimeZone(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3"
                  >
                    <option value="Asia/Taipei">台北</option>
                    <option value="Asia/Tokyo">東京</option>
                    <option value="Asia/Hong_Kong">香港</option>
                    <option value="Asia/Singapore">新加坡</option>
                    <option value="America/Los_Angeles">洛杉磯</option>
                    <option value="America/New_York">紐約</option>
                    <option value="Europe/London">倫敦</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  關鍵字偏好（選填）
                </span>
                <input
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-transparent px-3"
                  placeholder="影片生成, AI Agent, 台灣"
                />
              </label>
              {subscribeState === 'error' && (
                <p className="text-sm text-destructive">
                  暫時無法儲存，請稍後再試。
                </p>
              )}
              <button
                disabled={subscribeState === 'loading'}
                className="w-full rounded-full bg-foreground px-4 py-3 font-semibold text-background disabled:opacity-50"
              >
                {subscribeState === 'loading' ? '儲存中…' : '申請訂閱'}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                正式寄送前需完成 Email 驗證，每封信均可一鍵退訂。
              </p>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

function HomeView({
  onArticle,
  onDaily,
  onCalendar,
  onSubscribe,
}: {
  onArticle: (article: Article) => void;
  onDaily: () => void;
  onCalendar: () => void;
  onSubscribe: () => void;
}) {
  const latestRail = useRef<HTMLDivElement>(null);
  const todayLabel = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Taipei',
  }).format(new Date());
  const taipeiDateParts = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== 'literal') parts[part.type] = part.value;
      return parts;
    }, {});
  const todayIso = `${taipeiDateParts.year}-${taipeiDateParts.month}-${taipeiDateParts.day}`;
  const upcomingEvents = [...calendarEvents]
    .filter((event) => event.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const scrollRail = (
    rail: RefObject<HTMLDivElement | null>,
    direction: -1 | 1,
  ) => {
    rail.current?.scrollBy({
      left: direction * rail.current.clientWidth,
      behavior: 'smooth',
    });
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <p
        suppressHydrationWarning
        className="text-sm font-semibold tracking-widest text-muted-foreground"
      >
        {todayLabel}・每日持續更新
      </p>
      <h1 className="mt-4 max-w-4xl font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
        掌握 AI 現況，也查得到每一次重要變化
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        每日整理最新 AI
        情報，並持續保存可搜尋的歷史紀錄；每項結論都能回到原始資料。
      </p>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.7fr_0.8fr]">
        <section className="self-start rounded-2xl border border-border border-t-4 border-t-foreground bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">每日 AI 重點</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-border px-2.5 py-1 font-medium text-foreground">
                {dailyBriefing.date.replaceAll('年 ', '.').replaceAll('月 ', '.').replace('日', '')}
              </span>
              <span className="hidden sm:inline">
                整合 {dailyBriefing.sources.length} 個來源
              </span>
            </div>
          </div>
          <h3 className="mt-6 max-w-2xl font-serif text-3xl font-medium leading-tight">
            {dailyBriefing.title}
          </h3>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-muted-foreground">
            五分鐘掌握今天 AI 產業的重要變化、實際影響與後續觀察。
          </p>
          <button
            onClick={onDaily}
            className="mt-6 font-semibold underline underline-offset-4"
          >
            閱讀今日完整整理 →
          </button>
        </section>
        <aside className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">即將發生</h2>
            <CalendarDays className="size-5" />
          </div>
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="border-b border-border py-5 last:border-0"
            >
              <div className="text-sm text-muted-foreground">
                {event.date.slice(5).replace('-', '/')}
              </div>
              <strong className="mt-1 block">{event.title}</strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                {event.type}・{event.format}
              </span>
            </div>
          ))}
          <button
            onClick={onCalendar}
            className="mt-3 font-semibold underline underline-offset-4"
          >
            打開 AI 日曆 →
          </button>
        </aside>
      </div>
      <div className="mt-12 flex items-end justify-between gap-4 border-b border-foreground pb-3">
        <div>
          <h2 className="text-2xl font-semibold">熱門焦點</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            綜合近期影響與來源廣度，混合不同日期的重要情報
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            精選 {featuredArticles.length} 則
          </span>
          <button
            type="button"
            onClick={() => scrollRail(latestRail, -1)}
            aria-label="查看上一組熱門焦點"
            className="grid size-9 place-items-center rounded-full border border-border transition hover:bg-secondary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(latestRail, 1)}
            aria-label="查看下一組熱門焦點"
            className="grid size-9 place-items-center rounded-full border border-border transition hover:bg-secondary"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={latestRail}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {featuredArticles.map((article) => (
          <button
            key={article.id}
            onClick={() => onArticle(article)}
            className="group shrink-0 basis-[88%] snap-start border-b border-border py-6 text-left sm:basis-[calc((100%-1.5rem)/2)] lg:basis-[calc((100%-3rem)/3)]"
          >
            <div className="relative mb-5 aspect-[16/9] overflow-hidden bg-secondary">
              <img
                src={article.image}
                alt={article.imageAlt}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/news/ai-agent-tools.png';
                }}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
              <span className="absolute right-3 top-3 rounded-full border border-white/40 bg-black/75 px-2.5 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur-sm">
                {compactArticleDate(article)}
              </span>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">
              {article.category}・{evidenceLabel(article)}・
              {article.sources.length} 個來源
            </span>
            <h3 className="mt-2 text-xl font-semibold leading-8 group-hover:underline">
              {article.title}
            </h3>
            <p className="mt-2 leading-7 text-muted-foreground">
              {article.summary}
            </p>
          </button>
        ))}
      </div>
      <div className="mt-12 flex items-end justify-between gap-4 border-b border-foreground pb-3">
        <div>
          <h2 className="text-2xl font-semibold">更多情報</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            由新到舊持續保留，方便回看不同日期的內容
          </p>
        </div>
        <span className="text-sm text-muted-foreground">共 {moreArticles.length} 則</span>
      </div>
      <div className="grid items-stretch gap-x-5 sm:grid-cols-2 lg:grid-cols-4">
        {moreArticles.map((article) => (
          <button
            key={article.id}
            onClick={() => onArticle(article)}
            className="group flex h-full min-w-0 flex-col border-b border-border py-6 text-left"
          >
            <div className="relative mb-5 h-48 w-full shrink-0 overflow-hidden bg-secondary sm:h-44 lg:h-36 xl:h-44">
              <img
                src={article.image}
                alt={article.imageAlt}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/news/ai-agent-tools.png';
                }}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
              <span className="absolute right-3 top-3 rounded-full border border-white/40 bg-black/75 px-2.5 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur-sm">
                {compactArticleDate(article)}
              </span>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">
              {article.category}・{evidenceLabel(article)}・{article.sources.length} 個來源
            </span>
            <h3 className="mt-2 text-xl font-semibold leading-8 group-hover:underline">
              {article.title}
            </h3>
            <p className="mt-2 flex-1 leading-7 text-muted-foreground">
              {article.summary}
            </p>
          </button>
        ))}
      </div>
      <section className="mt-14 flex flex-col items-start justify-between gap-6 border-y border-border py-8 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">
            在你指定的時間，直接收到每日重點
          </h2>
          <p className="mt-2 text-muted-foreground">
            可設定關鍵字與領域；正式寄送前需要驗證 Email。
          </p>
        </div>
        <button
          onClick={onSubscribe}
          className="rounded-full bg-foreground px-6 py-3 font-semibold text-background"
        >
          <Mail className="mr-2 inline size-4" />
          訂閱每日情報
        </button>
      </section>
    </main>
  );
}

function DailyView() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 lg:px-8 lg:py-16">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold tracking-widest text-muted-foreground">
          每日更新・最後整理 {dailyBriefing.updatedAt}・約{' '}
          {dailyBriefing.readingMinutes} 分鐘閱讀
        </p>
        <h1 className="mt-4 font-serif text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
          {dailyBriefing.title}
        </h1>
        <p className="mt-4 text-sm font-semibold tracking-wide text-muted-foreground">
          每日 AI 重點｜{dailyBriefing.date}
        </p>
        <p className="mt-7 text-xl leading-9 text-muted-foreground sm:text-2xl sm:leading-10">
          {dailyBriefing.summary}
        </p>

        <p className="mt-10 border-y border-foreground py-8 text-lg leading-9">
          {dailyBriefing.lead}
        </p>

        <div className="mt-12 space-y-14">
          {dailyBriefing.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-serif text-3xl font-medium leading-tight">
                {section.heading}
              </h2>
              <div className="mt-5 space-y-5">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.text}
                    className="text-lg leading-9 text-muted-foreground"
                  >
                    {paragraph.text}{' '}
                    {paragraph.citations.map((citation) => (
                      <a
                        key={citation}
                        href={`#daily-source-${citation}`}
                        className="font-semibold text-foreground underline decoration-border underline-offset-4"
                        aria-label={`前往來源 ${citation}`}
                      >
                        [{citation}]
                      </a>
                    ))}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-14 border-l-4 border-foreground bg-secondary p-6 sm:p-8">
          <p className="text-sm font-semibold tracking-widest text-muted-foreground">
            今日結論
          </p>
          <p className="mt-3 text-xl font-medium leading-9">
            {dailyBriefing.conclusion}
          </p>
        </section>

        <section className="mt-14 border-t border-foreground pt-8">
          <h2 className="text-2xl font-semibold">本文來源</h2>
          <p className="mt-2 text-muted-foreground">
            本文綜合下列公開資料撰寫；點擊可直接閱讀原文。
          </p>
          <ol className="mt-6 space-y-4">
            {dailyBriefing.sources.map((source) => (
              <li
                id={`daily-source-${source.id}`}
                key={source.id}
                className="grid gap-2 border-b border-border pb-4 sm:grid-cols-[2rem_1fr_auto] sm:items-start"
              >
                <span className="font-serif text-xl text-muted-foreground">
                  {String(source.id).padStart(2, '0')}
                </span>
                <span>
                  <strong className="block">{source.title}</strong>
                  <small className="text-muted-foreground">
                    {source.name}・{source.type}
                  </small>
                </span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
                >
                  閱讀原文 <ExternalLink className="size-4" />
                </a>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </main>
  );
}

function CalendarView({
  filters,
  activeFilter,
  setFilter,
  events,
}: {
  filters: string[];
  activeFilter: string;
  setFilter: (value: string) => void;
  events: typeof calendarEvents;
}) {
  const taipeiDateParts = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== 'literal') parts[part.type] = part.value;
      return parts;
    }, {});
  const todayDate = `${taipeiDateParts.year}-${taipeiDateParts.month}-${taipeiDateParts.day}`;
  const [visibleMonth, setVisibleMonth] = useState(todayDate.slice(0, 7));
  const [year, month] = visibleMonth.split('-').map(Number);
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlanks =
    (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);
  const monthLabel = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  const moveMonth = (offset: number) => {
    const next = new Date(Date.UTC(year, month - 1 + offset, 1));
    setVisibleMonth(
      `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  };

  const typeStyles: Record<string, string> = {
    活動: 'border-violet-500 bg-violet-50 text-violet-950 dark:bg-violet-950/55 dark:text-violet-100',
    研究: 'border-sky-500 bg-sky-50 text-sky-950 dark:bg-sky-950/55 dark:text-sky-100',
    產業: 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/55 dark:text-amber-100',
    教育: 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/55 dark:text-emerald-100',
    政策: 'border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/55 dark:text-rose-100',
    競賽: 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-950 dark:bg-fuchsia-950/55 dark:text-fuchsia-100',
    安全: 'border-red-500 bg-red-50 text-red-950 dark:bg-red-950/55 dark:text-red-100',
    模型: 'border-indigo-500 bg-indigo-50 text-indigo-950 dark:bg-indigo-950/55 dark:text-indigo-100',
    產品更新: 'border-teal-500 bg-teal-50 text-teal-950 dark:bg-teal-950/55 dark:text-teal-100',
    停止服務: 'border-orange-500 bg-orange-50 text-orange-950 dark:bg-orange-950/55 dark:text-orange-100',
  };
  const fallbackStyle =
    'border-slate-500 bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-slate-100';

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold tracking-widest text-muted-foreground">
            重大發布、活動與期限
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium sm:text-5xl">
            AI 日曆
          </h1>
          <p className="mt-3 text-muted-foreground">
            收錄已確認、預計與可信傳聞，每筆行程均標示狀態並附上原始來源。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => moveMonth(-1)}
            className="grid size-10 place-items-center rounded-full border border-border"
            aria-label="上個月"
          >
            <ChevronLeft />
          </button>
          <strong className="min-w-28 text-center">{monthLabel}</strong>
          <button
            onClick={() => moveMonth(1)}
            className="grid size-10 place-items-center rounded-full border border-border"
            aria-label="下個月"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setFilter(filter)}
            className={`rounded-full border px-4 py-2 text-sm ${activeFilter === filter ? 'border-foreground bg-foreground text-background' : 'border-border'}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-border text-center text-sm text-muted-foreground">
            {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
              <div key={day} className="py-3">
                週{day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: leadingBlanks }, (_, index) => (
              <div
                key={`blank-${index}`}
                aria-hidden="true"
                className="min-h-32 border-b border-r border-border bg-secondary/20"
              />
            ))}
            {days.map((day) => {
              const date = `${visibleMonth}-${String(day).padStart(2, '0')}`;
              const isToday = date === todayDate;
              const dayEvents = events.filter((event) => event.date === date);
              return (
                <div
                  key={day}
                  className={`min-h-32 border-b border-r border-border p-2 ${isToday ? 'relative z-10 bg-secondary/50 ring-2 ring-inset ring-foreground' : ''}`}
                >
                  <span
                    className={`grid size-8 place-items-center rounded-full text-sm font-semibold ${isToday ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
                  >
                    {day}
                  </span>
                  {dayEvents.map((event) => (
                    <a
                      key={event.id}
                      href={event.source}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-2 block rounded-lg border-l-4 p-2 text-xs leading-5 transition hover:brightness-95 dark:hover:brightness-110 ${typeStyles[event.type] ?? fallbackStyle}`}
                    >
                      <strong className="block">{event.title}</strong>
                      <span className="opacity-70">
                        {event.type}・{event.format}
                      </span>
                      <span className="mt-1 block font-semibold">
                        {event.status === '已確認'
                          ? '● 已確認'
                          : event.status === '預計'
                            ? '○ 預計'
                            : '△ 傳聞'}
                      </span>
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
        {Object.entries(typeStyles)
          .filter(([type]) => filters.includes(type))
          .map(([type, styles]) => (
            <span key={type} className="flex items-center gap-2">
              <i
                aria-hidden="true"
                className={`size-3 rounded-sm border-l-4 ${styles}`}
              />
              {type}
            </span>
          ))}
        <span>● 已確認：官方公布明確日期</span>
        <span>○ 預計：官方僅公布時間範圍</span>
        <span>△ 傳聞：至少兩個可信來源支持，尚未官宣</span>
      </div>
    </main>
  );
}

function SearchView({
  query,
  categories,
  category,
  setCategory,
  results,
  onArticle,
}: {
  query: string;
  categories: string[];
  category: string;
  setCategory: (value: string) => void;
  results: Article[];
  onArticle: (article: Article) => void;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <h1 className="font-serif text-4xl font-medium sm:text-5xl">
        搜尋所有 AI 情報
      </h1>
      <div className="mt-7 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`rounded-full border px-4 py-2 text-sm ${category === item ? 'border-foreground bg-foreground text-background' : 'border-border'}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-8 border-t border-foreground">
        <p className="py-4 text-sm text-muted-foreground">
          找到 {results.length} 項相關情報
        </p>
        {results.map((article) => (
          <button
            key={article.id}
            onClick={() => onArticle(article)}
            className="grid w-full gap-4 border-t border-border py-6 text-left first:border-t-0 sm:grid-cols-[150px_1fr]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{article.category}</span>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {compactArticleDate(article)}
                </span>
              </div>
              <span className="mt-1 block text-sm text-muted-foreground">
                {article.sources.length} 個來源
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold leading-8 hover:underline">
                {article.title}
              </h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                {article.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-3 py-1 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
        {results.length === 0 && (
          <div className="py-20 text-center">
            <Search className="mx-auto mb-4 size-8 text-muted-foreground" />
            <h2 className="text-xl font-semibold">沒有找到相符的情報</h2>
            <p className="mt-2 text-muted-foreground">
              試著改用公司、模型名稱或較短的關鍵字。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function ArticleView({
  article,
  comments,
  commentError,
  user,
  commentText,
  setCommentText,
  addComment,
  onBack,
}: {
  article: Article;
  comments: Comment[];
  commentError: string;
  user: ChatGPTUser | null;
  commentText: string;
  setCommentText: (value: string) => void;
  addComment: (event: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <button
        onClick={onBack}
        className="mb-7 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        ← 返回最新情報
      </button>
      <div className="max-w-5xl">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{article.category}</span>
          <span>・</span>
          <span>{evidenceLabel(article)}</span>
          <span>・</span>
          <span>{article.sources.length} 個來源</span>
        </div>
        <h1 className="mt-4 font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-5 text-xl leading-9 text-muted-foreground">
          {article.summary}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          發布 {article.publishedAt}・最後更新 {article.updatedAt}
        </p>
        <div className="mt-5 rounded-xl border border-border bg-card px-4 py-3">
          <strong>可信度判定：{evidenceLabel(article)}</strong>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {article.evidenceNote ??
              (article.verified
                ? '內容已由可直接閱讀的公開來源核對；請仍以右側原文為準。'
                : '目前證據仍不完整，僅作為市場線索追蹤，不代表事件已發生。')}
          </p>
        </div>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article>
          <div className="border-y border-foreground py-6">
            <strong>閱讀方式</strong>
            <p className="mt-2 leading-7 text-muted-foreground">
              本文至少比對三個獨立來源；先核對共同事實，再整理各方觀點與分歧。重要敘述旁的數字可對照右側原始資料。
            </p>
          </div>
          {article.body.map((section) => (
            <section key={section.heading} className="py-8">
              <h2 className="text-2xl font-semibold">{section.heading}</h2>
              <p className="mt-4 text-lg leading-9">
                {section.text}{' '}
                <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">
                  [{section.citations.join('、')}]
                </span>
              </p>
            </section>
          ))}
          <section className="mt-8 border-t border-foreground pt-8">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5" />
              <h2 className="text-2xl font-semibold">留言與討論</h2>
            </div>
            <form onSubmit={addComment} className="mt-6">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-input bg-transparent p-4"
                placeholder={
                  user ? '分享你的觀點或補充來源…' : '登入後參與討論…'
                }
              />
              <button className="mt-3 rounded-full bg-foreground px-5 py-2.5 font-semibold text-background">
                {user ? '發表留言' : '登入並留言'}
              </button>
            </form>
            {commentError && (
              <p className="mt-3 text-sm text-red-500">{commentError}</p>
            )}
            <div className="mt-8">
              {comments.length === 0 && !commentError && (
                <p className="border-t border-border py-8 text-muted-foreground">
                  尚無留言，歡迎分享第一則觀點。
                </p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="border-t border-border py-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-secondary font-semibold">
                      {comment.author.slice(0, 1)}
                    </span>
                    <div>
                      <strong>{comment.author}</strong>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {comment.createdAt}
                      </span>
                    </div>
                  </div>
                  <p className="ml-12 mt-2 leading-7">{comment.body}</p>
                </div>
              ))}
            </div>
          </section>
        </article>
        <aside>
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">本文來源</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              所有結論皆可回到原文確認
            </p>
            <div className="mt-4">
              {article.sources.map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block border-t border-border py-4 first:border-t-0"
                >
                  <span className="text-xs text-muted-foreground">
                    來源 {source.id}・{source.type}
                  </span>
                  <span className="mt-2 inline-flex rounded-full border border-border px-2 py-1 text-xs font-semibold">
                    {sourceReliability(source)}
                  </span>
                  <strong className="mt-1 block leading-6">
                    {source.name}
                  </strong>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {source.title}
                  </span>
                  {(source.reliabilityNote || source.note) && (
                    <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                      {source.reliabilityNote ?? source.note}
                    </span>
                  )}
                  <span className="mt-2 flex items-center gap-1 text-sm font-semibold">
                    閱讀原文 <ExternalLink className="size-3" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function AdminView({ adminEmail }: { adminEmail: string }) {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [adminComments, setAdminComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'subscriptions' | 'comments'>('subscriptions');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [subscriptionResponse, commentResponse] = await Promise.all([
        fetch('/api/admin/subscriptions'),
        fetch('/api/admin/comments'),
      ]);
      if (!subscriptionResponse.ok || !commentResponse.ok)
        throw new Error('load');
      const subscriptionData = (await subscriptionResponse.json()) as {
        rows: AdminSubscription[];
      };
      const commentData = (await commentResponse.json()) as {
        rows: AdminComment[];
      };
      setSubscriptions(subscriptionData.rows);
      setAdminComments(commentData.rows);
    } catch {
      setError('無法載入後台資料，請重新登入後再試。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateSubscription = async (id: number, status: string) => {
    const response = await fetch('/api/admin/subscriptions', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok)
      setSubscriptions((items) =>
        items.map((item) => (item.id === id ? { ...item, status } : item)),
      );
  };

  const deleteSubscription = async (item: AdminSubscription) => {
    if (!window.confirm(`確定要刪除 ${item.email} 的訂閱嗎？`)) return;
    const response = await fetch(`/api/admin/subscriptions?id=${item.id}`, {
      method: 'DELETE',
    });
    if (response.ok)
      setSubscriptions((items) => items.filter((row) => row.id !== item.id));
  };

  const updateComment = async (id: number, status: string) => {
    const response = await fetch('/api/admin/comments', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok)
      setAdminComments((items) =>
        items.map((item) => (item.id === id ? { ...item, status } : item)),
      );
  };

  const deleteComment = async (item: AdminComment) => {
    if (!window.confirm(`確定要永久刪除 ${item.authorName} 的留言嗎？`)) return;
    const response = await fetch(`/api/admin/comments?id=${item.id}`, {
      method: 'DELETE',
    });
    if (response.ok)
      setAdminComments((items) => items.filter((row) => row.id !== item.id));
  };

  const activeCount = subscriptions.filter(
    (item) => item.status === 'active',
  ).length;
  const pendingCount = subscriptions.filter(
    (item) => item.status === 'pending',
  ).length;
  const hiddenCount = adminComments.filter(
    (item) => item.status === 'hidden',
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-foreground pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-widest text-muted-foreground">
            <ShieldCheck className="size-4" /> 最高管理權限
          </div>
          <h1 className="mt-3 font-serif text-4xl font-medium sm:text-5xl">
            管理後台
          </h1>
          <p className="mt-3 text-muted-foreground">目前登入：{adminEmail}</p>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
        >
          重新整理
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['全部訂閱', subscriptions.length],
          ['已啟用', activeCount],
          ['等待驗證', pendingCount],
          ['已隱藏留言', hiddenCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="text-sm text-muted-foreground">{label}</div>
            <strong className="mt-2 block text-3xl">{value}</strong>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-2 border-b border-border">
        <button
          onClick={() => setTab('subscriptions')}
          className={`px-4 py-3 font-semibold ${tab === 'subscriptions' ? 'border-b-2 border-foreground' : 'text-muted-foreground'}`}
        >
          訂閱者管理
        </button>
        <button
          onClick={() => setTab('comments')}
          className={`px-4 py-3 font-semibold ${tab === 'comments' ? 'border-b-2 border-foreground' : 'text-muted-foreground'}`}
        >
          留言管理
        </button>
      </div>

      {loading && (
        <p className="py-12 text-muted-foreground">正在載入後台資料…</p>
      )}
      {error && <p className="py-12 text-destructive">{error}</p>}

      {!loading && !error && tab === 'subscriptions' && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">狀態</th>
                <th className="p-4">每日寄送</th>
                <th className="p-4">關鍵字</th>
                <th className="p-4">更新時間</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-4 font-semibold">{item.email}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-secondary px-3 py-1">
                      {item.status === 'active'
                        ? '已啟用'
                        : item.status === 'paused'
                          ? '已停用'
                          : '等待驗證'}
                    </span>
                  </td>
                  <td className="p-4">
                    {item.sendTime}
                    <span className="ml-2 text-muted-foreground">
                      {item.timeZone}
                    </span>
                  </td>
                  <td className="max-w-52 truncate p-4 text-muted-foreground">
                    {JSON.parse(item.keywords || '[]').join('、') || '全部'}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleString('zh-TW')}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          void updateSubscription(
                            item.id,
                            item.status === 'active' ? 'paused' : 'active',
                          )
                        }
                        className="rounded-full border border-border px-3 py-1.5 font-semibold"
                      >
                        {item.status === 'active' ? '停用' : '啟用'}
                      </button>
                      <button
                        onClick={() => void deleteSubscription(item)}
                        className="grid size-8 place-items-center rounded-full border border-border text-destructive"
                        aria-label={`刪除 ${item.email}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && tab === 'comments' && (
        <div className="mt-6 space-y-3">
          {adminComments.length === 0 && (
            <p className="py-8 text-muted-foreground">目前沒有留言。</p>
          )}
          {adminComments.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <strong>{item.authorName}</strong>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {item.authorEmail}
                  </span>
                  <p className="mt-3 leading-7">{item.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    文章：{item.articleId}・
                    {new Date(item.createdAt).toLocaleString('zh-TW')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() =>
                      void updateComment(
                        item.id,
                        item.status === 'published' ? 'hidden' : 'published',
                      )
                    }
                    className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold"
                  >
                    {item.status === 'published' ? '隱藏' : '公開'}
                  </button>
                  <button
                    onClick={() => void deleteComment(item)}
                    className="grid size-9 place-items-center rounded-full border border-border text-destructive"
                    aria-label="刪除留言"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-border"
            aria-label="關閉"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
