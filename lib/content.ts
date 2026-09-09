export type Source = {
  id: number;
  name: string;
  type: '官方公告' | '新聞' | '技術文件' | '影片' | '研究';
  title: string;
  url: string;
  date: string;
  note?: string;
};

export type Article = {
  id: string;
  category: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  verified: boolean;
  body: { heading: string; text: string; citations: number[] }[];
  sources: Source[];
};

export const articles: Article[] = [
  {
    id: 'tool-using-models',
    category: '模型與產品',
    title: 'AI 模型競爭轉向長時間任務與工具操作，實際成本仍待驗證',
    summary:
      '多家公司近期把更新重點放在代理任務、軟體操作與工作流程整合，但官方測試和真實使用仍有落差。',
    publishedAt: '2026-09-09 08:40',
    updatedAt: '2026-09-09 10:12',
    tags: ['AI Agent', '模型', '工具操作'],
    verified: true,
    body: [
      {
        heading: '發生了什麼',
        text: '多家 AI 公司將新版本重點集中在長時間任務、工具呼叫與跨軟體操作。官方資料顯示任務完成率提升，但不同測試的條件並不相同。',
        citations: [1, 2, 3],
      },
      {
        heading: '為什麼重要',
        text: '競爭焦點逐漸從單次回答，轉向能否穩定完成一整段工作流程。這會影響企業採用方式，也使可靠度、權限控制與成本變得更重要。',
        citations: [1, 3, 4],
      },
      {
        heading: '仍待確認',
        text: '目前資料多來自官方測試與少量媒體試用，尚不能把測試分數直接等同於真實工作環境的成果。',
        citations: [2, 4],
      },
    ],
    sources: [
      {
        id: 1,
        name: 'OpenAI',
        type: '官方公告',
        title: 'OpenAI News',
        url: 'https://openai.com/news/',
        date: '2026-09-08',
      },
      {
        id: 2,
        name: 'Anthropic',
        type: '官方公告',
        title: 'Anthropic Newsroom',
        url: 'https://www.anthropic.com/news',
        date: '2026-09-08',
      },
      {
        id: 3,
        name: 'Google DeepMind',
        type: '技術文件',
        title: 'Google DeepMind Blog',
        url: 'https://deepmind.google/blog/',
        date: '2026-09-08',
      },
      {
        id: 4,
        name: 'MIT Technology Review',
        type: '新聞',
        title: 'Artificial intelligence',
        url: 'https://www.technologyreview.com/topic/artificial-intelligence/',
        date: '2026-09-09',
      },
    ],
  },
  {
    id: 'video-generation-control',
    category: '影像與影片',
    title: '影片生成工具的下一場競爭：角色一致性、局部修改與工作流程整合',
    summary:
      '最新工具不再只比較解析度，而是開始解決創作者如何修改、延續與管理生成素材。',
    publishedAt: '2026-09-09 07:55',
    updatedAt: '2026-09-09 09:30',
    tags: ['影片生成', '創作者', '影像'],
    verified: true,
    body: [
      {
        heading: '市場出現什麼變化',
        text: '產品更新開始強調鏡頭延續、角色一致性與局部修改，讓生成內容更容易進入正式製作流程。',
        citations: [1, 2],
      },
      {
        heading: '對創作者的影響',
        text: '真正的效率差異將取決於修改成本、輸出穩定度與商用授權，而不只是示範影片看起來是否逼真。',
        citations: [2, 3],
      },
    ],
    sources: [
      {
        id: 1,
        name: 'Google DeepMind',
        type: '官方公告',
        title: 'Models and product updates',
        url: 'https://deepmind.google/blog/',
        date: '2026-09-08',
      },
      {
        id: 2,
        name: 'Adobe Blog',
        type: '官方公告',
        title: 'Digital media updates',
        url: 'https://blog.adobe.com/',
        date: '2026-09-08',
      },
      {
        id: 3,
        name: 'Ars Technica',
        type: '新聞',
        title: 'AI coverage',
        url: 'https://arstechnica.com/ai/',
        date: '2026-09-09',
      },
    ],
  },
  {
    id: 'taiwan-ai-governance',
    category: '台灣產業',
    title: '台灣企業導入 AI 的焦點，正從試用工具轉向資料治理與實際效益',
    summary: '公開案例顯示，企業開始更在意資料權限、導入流程、成本與成效衡量。',
    publishedAt: '2026-09-08 17:20',
    updatedAt: '2026-09-09 08:15',
    tags: ['台灣', '企業應用', '治理'],
    verified: true,
    body: [
      {
        heading: '導入重點改變',
        text: '企業關注點逐漸從是否能使用生成式 AI，轉向資料能否安全進入流程，以及成果能否持續被衡量。',
        citations: [1, 2],
      },
      {
        heading: '接下來值得觀察',
        text: '人才培訓、內部資料品質與供應商鎖定，將比單次展示更影響長期成果。',
        citations: [2, 3],
      },
    ],
    sources: [
      {
        id: 1,
        name: '數位發展部',
        type: '官方公告',
        title: '政策與新聞公告',
        url: 'https://moda.gov.tw/',
        date: '2026-09-08',
      },
      {
        id: 2,
        name: 'iThome',
        type: '新聞',
        title: 'AI 與企業應用',
        url: 'https://www.ithome.com.tw/',
        date: '2026-09-08',
      },
      {
        id: 3,
        name: '國科會',
        type: '研究',
        title: '人工智慧相關計畫',
        url: 'https://www.nstc.gov.tw/',
        date: '2026-09-07',
      },
    ],
  },
  {
    id: 'open-source-models',
    category: '開源生態',
    title: '開源 AI 專案持續增加，評估重點應回到授權、維護與部署成本',
    summary:
      '下載量和排行榜只能提供部分訊號，真正採用前仍需確認授權條款與維護狀況。',
    publishedAt: '2026-09-08 14:05',
    updatedAt: '2026-09-08 18:10',
    tags: ['開源', 'GitHub', 'Hugging Face'],
    verified: true,
    body: [
      {
        heading: '如何判斷值得使用',
        text: '除了能力測試，也要檢查授權、更新頻率、社群維護與安全公告。',
        citations: [1, 2],
      },
    ],
    sources: [
      {
        id: 1,
        name: 'Hugging Face',
        type: '技術文件',
        title: 'Models and papers',
        url: 'https://huggingface.co/',
        date: '2026-09-08',
      },
      {
        id: 2,
        name: 'GitHub',
        type: '技術文件',
        title: 'Trending repositories',
        url: 'https://github.com/trending',
        date: '2026-09-08',
      },
    ],
  },
];

export const calendarEvents = [
  {
    id: 1,
    date: '2026-09-10',
    title: 'AI 治理線上公聽會',
    type: '政策',
    company: '公共政策',
    status: '已確認',
    format: '線上',
    source: 'https://moda.gov.tw/',
  },
  {
    id: 2,
    date: '2026-09-12',
    title: 'AI 開發者線上發表會',
    type: '活動',
    company: '開發者社群',
    status: '已確認',
    format: '線上',
    source: 'https://www.youtube.com/',
  },
  {
    id: 3,
    date: '2026-09-15',
    title: '台北 AI 產業論壇',
    type: '活動',
    company: '產業協會',
    status: '已確認',
    format: '實體',
    source: 'https://www.taiwan.net.tw/',
  },
  {
    id: 4,
    date: '2026-09-18',
    title: '新一代影片模型公開測試',
    type: '模型',
    company: '影像研究團隊',
    status: '預計',
    format: '線上',
    source: 'https://deepmind.google/blog/',
  },
  {
    id: 5,
    date: '2026-09-24',
    title: '舊版文字模型 API 停止服務',
    type: '停止服務',
    company: '模型平台',
    status: '已確認',
    format: '線上',
    source: 'https://openai.com/news/',
  },
  {
    id: 6,
    date: '2026-09-28',
    title: '企業 AI 工作流程功能更新',
    type: '產品更新',
    company: '企業軟體',
    status: '傳聞',
    format: '線上',
    source: 'https://www.reuters.com/technology/artificial-intelligence/',
  },
];

export const dailyPoints = [
  {
    title: '模型競爭轉向「完成工作」',
    text: '多家公司把更新重點放在長時間任務、工具使用與跨軟體操作，可靠度和成本成為下一個比較標準。',
    articleId: 'tool-using-models',
  },
  {
    title: '影片生成開始解決專業修改問題',
    text: '新工具更重視角色一致性、局部編輯與素材延續，不再只追求單次生成的視覺效果。',
    articleId: 'video-generation-control',
  },
  {
    title: '台灣企業更在意資料治理',
    text: '企業 AI 導入正從概念驗證轉向權限、資料品質、流程整合與效益衡量。',
    articleId: 'taiwan-ai-governance',
  },
];
