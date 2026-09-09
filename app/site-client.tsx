'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  X,
} from 'lucide-react';
import type { ChatGPTUser } from './chatgpt-auth';
import {
  articles,
  calendarEvents,
  dailyPoints,
  type Article,
} from '@/lib/content';

type View = 'home' | 'daily' | 'calendar' | 'search' | 'article';
type Theme = 'system' | 'light' | 'dark';
type Comment = { id: number; author: string; body: string; createdAt: string };

const nav: { id: View; label: string }[] = [
  { id: 'home', label: '首頁' },
  { id: 'daily', label: '每日 AI 重點' },
  { id: 'calendar', label: 'AI 日曆' },
];

export default function SiteClient({ user }: { user: ChatGPTUser | null }) {
  const [view, setView] = useState<View>('home');
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
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      author: '林育成',
      body: '實際導入時，我更在意 API 成本是否能維持穩定。',
      createdAt: '今天 09:42',
    },
    {
      id: 2,
      author: '陳小安',
      body: '希望未來也能標示文章更新前後的差異。',
      createdAt: '今天 10:03',
    },
  ]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('ai-info-theme') as Theme | null;
    if (saved) setTheme(saved);
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserZone) setTimeZone(browserZone);
  }, []);

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
      setComments((items) => [
        { id: Date.now(), author: user.displayName, body, createdAt: '剛剛' },
        ...items,
      ]);
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
      {view === 'daily' && (
        <DailyView
          onArticle={(id) =>
            openArticle(
              articles.find((article) => article.id === id) ?? articles[0],
            )
          }
        />
      )}
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
          setQuery={setQuery}
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
          user={user}
          commentText={commentText}
          setCommentText={setCommentText}
          addComment={addComment}
          onBack={() => go('home')}
        />
      )}

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

  const scrollLatest = (direction: -1 | 1) => {
    latestRail.current?.scrollBy({
      left: direction * latestRail.current.clientWidth,
      behavior: 'smooth',
    });
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <p className="text-sm font-semibold tracking-widest text-muted-foreground">
        2026 年 9 月 9 日・今日情報已更新
      </p>
      <h1 className="mt-4 max-w-4xl font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
        今天的 AI 發生了什麼，十分鐘讀懂真正重要的變化
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        多來源蒐集、交叉查證與重新整理。每項結論都能回到原始資料。
      </p>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.7fr_0.8fr]">
        <section className="rounded-2xl border border-border border-t-4 border-t-foreground bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">每日 AI 重點</h2>
            <span className="text-sm text-muted-foreground">
              整合 42 個來源
            </span>
          </div>
          <ol className="mt-5 space-y-4">
            {dailyPoints.map((point, index) => (
              <li key={point.title} className="grid grid-cols-[2rem_1fr] gap-2">
                <span className="font-serif text-xl text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <strong>{point.title}</strong>
                  <p className="mt-1 leading-7 text-muted-foreground">
                    {point.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
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
          {calendarEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="border-b border-border py-5 last:border-0"
            >
              <div className="text-sm text-muted-foreground">
                {event.date.slice(5).replace('-', '/')}・{event.status}
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
        <h2 className="text-2xl font-semibold">最新情報</h2>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            今日 {articles.length} 則・已依來源可信度排序
          </span>
          <button
            type="button"
            onClick={() => scrollLatest(-1)}
            aria-label="查看上一組最新情報"
            className="grid size-9 place-items-center rounded-full border border-border transition hover:bg-secondary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollLatest(1)}
            aria-label="查看下一組最新情報"
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
        {articles.map((article) => (
          <button
            key={article.id}
            onClick={() => onArticle(article)}
            className="group shrink-0 basis-[88%] snap-start border-b border-border py-6 text-left sm:basis-[calc((100%-1.5rem)/2)] lg:basis-[calc((100%-3rem)/3)]"
          >
            <div className="mb-5 aspect-[16/9] overflow-hidden bg-secondary">
              <img
                src={article.image}
                alt={article.imageAlt}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">
              {article.category}・{article.sources.length} 個來源
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

function DailyView({ onArticle }: { onArticle: (id: string) => void }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
      <p className="text-sm font-semibold tracking-widest text-muted-foreground">
        每日更新・最後整理 09:20
      </p>
      <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
        每日 AI 重點｜2026 年 9 月 9 日
      </h1>
      <p className="mt-5 text-xl leading-9 text-muted-foreground">
        今天的核心不是又多了一個模型，而是 AI
        產品正從「回答問題」走向「完成工作」。
      </p>
      <div className="mt-10 border-t border-foreground">
        {dailyPoints.map((point, index) => (
          <article
            key={point.title}
            className="grid gap-4 border-b border-border py-8 sm:grid-cols-[4rem_1fr]"
          >
            <span className="font-serif text-3xl text-muted-foreground">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h2 className="text-2xl font-semibold">{point.title}</h2>
              <p className="mt-3 text-lg leading-8 text-muted-foreground">
                {point.text}
              </p>
              <button
                onClick={() => onArticle(point.articleId)}
                className="mt-4 font-semibold underline underline-offset-4"
              >
                查看情報與來源 →
              </button>
            </div>
          </article>
        ))}
      </div>
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
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
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
            傳聞不會被當成正式日期，所有行程均附原始來源。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="grid size-10 place-items-center rounded-full border border-border"
            aria-label="上個月"
          >
            <ChevronLeft />
          </button>
          <strong>2026 年 9 月</strong>
          <button
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
            {days.map((day) => {
              const date = `2026-09-${String(day).padStart(2, '0')}`;
              const dayEvents = events.filter((event) => event.date === date);
              return (
                <div
                  key={day}
                  className="min-h-32 border-b border-r border-border p-2"
                >
                  <span className="text-sm text-muted-foreground">{day}</span>
                  {dayEvents.map((event) => (
                    <a
                      key={event.id}
                      href={event.source}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block rounded-lg bg-secondary p-2 text-xs leading-5"
                    >
                      <strong className="block">{event.title}</strong>
                      <span className="text-muted-foreground">
                        {event.status}・{event.type}
                      </span>
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
        <span>● 已確認：官方公布明確日期</span>
        <span>○ 預計：只有大概時間</span>
        <span>△ 傳聞：尚未獲官方證實</span>
      </div>
    </main>
  );
}

function SearchView({
  query,
  setQuery,
  categories,
  category,
  setCategory,
  results,
  onArticle,
}: {
  query: string;
  setQuery: (value: string) => void;
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
      <div className="relative mt-7">
        <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-14 w-full rounded-full border border-input bg-transparent pl-12 pr-5 text-lg outline-none focus:ring-2 focus:ring-ring"
          placeholder="輸入模型、公司、領域或關鍵字"
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
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
              <span className="text-sm font-semibold">{article.category}</span>
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
  user,
  commentText,
  setCommentText,
  addComment,
  onBack,
}: {
  article: Article;
  comments: Comment[];
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
          <span>{article.verified ? '已交叉查證' : '待確認'}</span>
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
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article>
          <div className="border-y border-foreground py-6">
            <strong>閱讀方式</strong>
            <p className="mt-2 leading-7 text-muted-foreground">
              本文由多項來源重新整理，重要敘述旁的數字可對照右側原始資料。
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
            <div className="mt-8">
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
                  <strong className="mt-1 block leading-6">
                    {source.name}
                  </strong>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {source.title}
                  </span>
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
