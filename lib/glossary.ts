export type GlossaryTerm = {
  id: string;
  name: string;
  english?: string;
  aliases: string[];
  category: '基礎概念' | '模型技術' | '開發技術' | '硬體設施' | '治理安全' | '產品服務';
  short: string;
  detail: string;
  sourceName: string;
  sourceUrl: string;
  updatedAt: string;
};

const googleGlossary = 'https://docs.cloud.google.com/docs/generative-ai/glossary';
const mlGlossary = 'https://developers.google.com/machine-learning/glossary';

export const glossaryTerms: GlossaryTerm[] = [
  { id: 'ai-agent', name: 'AI 代理', english: 'AI Agent', aliases: ['AI Agent', '智能代理', '代理式 AI'], category: '基礎概念', short: '能根據目標規劃步驟、使用工具並採取行動的 AI 應用。', detail: 'AI 代理通常由模型、指令、記憶、工具與協調流程組成。它不只回答問題，也可能查資料、操作軟體或完成多步驟任務，因此權限與人工核准特別重要。', sourceName: 'Google Cloud 生成式 AI 詞彙表', sourceUrl: googleGlossary, updatedAt: '2026-09-30' },
  { id: 'llm', name: '大型語言模型', english: 'Large Language Model, LLM', aliases: ['LLM', '大型語言模型'], category: '模型技術', short: '以大量文字資料訓練、用來理解與生成語言的模型。', detail: '大型語言模型會根據上下文預測後續 token，可用於寫作、摘要、翻譯、問答與程式生成；它的回答仍可能不正確。', sourceName: 'Google Cloud 生成式 AI 詞彙表', sourceUrl: googleGlossary, updatedAt: '2026-09-30' },
  { id: 'foundation-model', name: '基礎模型', english: 'Foundation Model', aliases: ['Foundation Model', '基礎模型', '前沿模型'], category: '模型技術', short: '以大量資料預訓練、可再適配多種任務的通用模型。', detail: '基礎模型可以處理文字、影像、聲音或多種模態，再透過提示、微調或外部工具完成特定用途。', sourceName: 'Google Cloud 生成式 AI 詞彙表', sourceUrl: googleGlossary, updatedAt: '2026-09-30' },
  { id: 'generative-ai', name: '生成式 AI', english: 'Generative AI', aliases: ['生成式人工智慧', 'GenAI', '生成 AI'], category: '基礎概念', short: '能根據輸入產生文字、影像、聲音、影片或程式碼的 AI。', detail: '生成式 AI 從訓練資料學習模式，再依提示產生新內容；輸出不是資料庫的逐字查詢結果，需要查證。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'rag', name: '檢索增強生成', english: 'Retrieval-Augmented Generation, RAG', aliases: ['RAG', '檢索增強生成'], category: '開發技術', short: '先搜尋外部資料，再讓模型依取回內容作答的技術。', detail: 'RAG 可補充模型訓練後的新資訊或企業內部資料，並協助附上來源，但效果仍取決於檢索品質與文件可信度。', sourceName: 'Google Cloud RAG 說明', sourceUrl: 'https://cloud.google.com/use-cases/retrieval-augmented-generation', updatedAt: '2026-09-30' },
  { id: 'embedding', name: '嵌入向量', english: 'Embedding', aliases: ['Embedding', 'Embeddings', '向量嵌入'], category: '模型技術', short: '把文字、影像或其他資料轉成可比較語意關係的數字向量。', detail: '語意接近的內容通常會在向量空間中更靠近，因此嵌入向量常用於相似度搜尋、推薦與 RAG。', sourceName: 'Google Cloud 生成式 AI 詞彙表', sourceUrl: googleGlossary, updatedAt: '2026-09-30' },
  { id: 'vector-database', name: '向量資料庫', english: 'Vector Database', aliases: ['Vector DB', '向量資料庫', '向量搜尋'], category: '開發技術', short: '專門儲存與搜尋向量表示的資料系統。', detail: '向量資料庫能依語意相似度找出接近的文件或內容，常作為 RAG 的檢索層。', sourceName: 'Google Cloud RAG 說明', sourceUrl: 'https://cloud.google.com/use-cases/retrieval-augmented-generation', updatedAt: '2026-09-30' },
  { id: 'token', name: 'Token', english: 'Token', aliases: ['token', 'Tokens', '詞元'], category: '模型技術', short: '模型處理輸入與輸出的基本單位，可能是字、詞或詞的一部分。', detail: '模型會先把內容切成 token；可處理的 token 數會影響上下文長度，API 成本也經常依輸入與輸出 token 計算。', sourceName: 'Google Cloud 生成式 AI 詞彙表', sourceUrl: googleGlossary, updatedAt: '2026-09-30' },
  { id: 'tokenizer', name: '分詞器', english: 'Tokenizer', aliases: ['Tokenizer', 'Tokenization', '分詞'], category: '模型技術', short: '把文字或其他輸入轉換成模型可處理 token 的系統。', detail: '不同模型使用不同詞彙表與切分方式，同一句文字在不同模型中可能產生不同數量的 token。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'context-window', name: '上下文視窗', english: 'Context Window', aliases: ['Context Window', '上下文長度', '脈絡視窗'], category: '模型技術', short: '模型一次能讀取並參考的輸入與輸出總範圍。', detail: '上下文視窗通常以 token 計算；長視窗能容納更多資料，但不代表模型一定能正確注意所有細節。', sourceName: 'Google Cloud 生成式 AI 詞彙表', sourceUrl: googleGlossary, updatedAt: '2026-09-30' },
  { id: 'prompt', name: '提示詞', english: 'Prompt', aliases: ['Prompt', '提示語', '系統提示'], category: '基礎概念', short: '提供給模型、用來指定任務與回應方式的輸入。', detail: '提示詞可以包含問題、指令、角色、範例與背景資料；清楚的限制和資料來源通常有助於得到更可用的結果。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'inference', name: '推論', english: 'Inference', aliases: ['Inference', '模型推論'], category: '模型技術', short: '已訓練模型接收輸入並產生結果的運算階段。', detail: '推論和訓練不同；推論成本受到模型大小、輸入輸出長度、硬體與延遲需求影響。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'training', name: '模型訓練', english: 'Model Training', aliases: ['Training', '訓練模型', '預訓練'], category: '模型技術', short: '使用資料調整模型參數，使模型學會辨識模式的過程。', detail: '大型模型訓練需要大量資料與運算資源；資料品質、目標函數與評估方式都會影響模型能力。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'fine-tuning', name: '微調', english: 'Fine-tuning', aliases: ['Fine-tuning', '微調模型', '指令微調'], category: '模型技術', short: '在既有模型上使用特定資料繼續訓練，使它適應任務或領域。', detail: '微調可改變模型行為與專業能力，但需要合適資料與評估；不是所有知識更新都必須用微調完成。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'hallucination', name: '幻覺', english: 'Hallucination', aliases: ['AI 幻覺', '模型幻覺', 'Hallucination'], category: '治理安全', short: '模型生成看似合理、實際上錯誤或沒有根據的內容。', detail: '加入檢索、要求引用與人工核對可降低風險，但無法保證完全消除幻覺。', sourceName: 'Google Cloud 生成式 AI 詞彙表', sourceUrl: googleGlossary, updatedAt: '2026-09-30' },
  { id: 'grounding', name: '資料落地', english: 'Grounding', aliases: ['Grounding', '接地', '有根據生成'], category: '開發技術', short: '讓模型回應依據可核對資料，而非只依模型內部記憶。', detail: '資料落地可使用搜尋、企業文件或資料庫；來源新鮮度與可信度仍需另外管理。', sourceName: 'Google Cloud 生成式 AI 詞彙表', sourceUrl: googleGlossary, updatedAt: '2026-09-30' },
  { id: 'multimodal', name: '多模態', english: 'Multimodal', aliases: ['多模態模型', 'Multimodal AI'], category: '模型技術', short: '能處理文字、影像、聲音或影片等多種資料形式。', detail: '多模態模型的輸入、輸出或兩者可以包含不只一種形式，例如看圖回答問題或由文字生成影片。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'transformer', name: 'Transformer', english: 'Transformer', aliases: ['Transformer 架構', '變形器模型'], category: '模型技術', short: '以注意力機制處理序列資料的神經網路架構。', detail: 'Transformer 是許多現代大型語言模型的基礎，能平行處理序列並學習內容間的關係。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'attention', name: '注意力機制', english: 'Attention', aliases: ['Self-attention', '自注意力', 'Attention'], category: '模型技術', short: '讓模型衡量輸入中不同位置彼此重要程度的機制。', detail: '注意力使模型能在處理某個 token 時參考其他位置，Transformer 會使用多頭注意力學習不同關係。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'api', name: 'API', english: 'Application Programming Interface', aliases: ['應用程式介面', 'API 介面'], category: '開發技術', short: '讓不同軟體以定義好的方式交換資料或呼叫功能的介面。', detail: 'AI API 讓開發者從應用程式呼叫模型；需要管理金鑰、權限、成本、速率限制與輸入資料。', sourceName: 'MDN Web Docs', sourceUrl: 'https://developer.mozilla.org/en-US/docs/Glossary/API', updatedAt: '2026-09-30' },
  { id: 'mcp', name: '模型上下文協定', english: 'Model Context Protocol, MCP', aliases: ['MCP', 'Model Context Protocol'], category: '開發技術', short: '讓 AI 應用以標準方式連接資料來源與工具的開放協定。', detail: 'MCP 定義客戶端與伺服器如何交換工具、資源與提示，使不同 AI 應用能重用相同整合。', sourceName: 'Anthropic MCP 文件', sourceUrl: 'https://docs.anthropic.com/en/docs/mcp', updatedAt: '2026-09-30' },
  { id: 'benchmark', name: '基準測試', english: 'Benchmark', aliases: ['Benchmark', '模型評測', '評測集'], category: '治理安全', short: '用固定資料與指標比較模型能力或限制的方法。', detail: '單一基準測試不等於真實使用效果；需要同時檢查資料污染、任務適配與實際工作流程。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'ai-chip', name: 'AI 晶片', english: 'AI Accelerator', aliases: ['AI 加速器', 'AI Chip', '加速晶片'], category: '硬體設施', short: '為訓練或執行 AI 模型最佳化的運算晶片。', detail: 'GPU、TPU 與各種專用加速器都可用於 AI；效能需搭配記憶體、互連、軟體與耗電一起評估。', sourceName: 'Google Cloud AI 基礎設施', sourceUrl: 'https://cloud.google.com/ai-infrastructure', updatedAt: '2026-09-30' },
  { id: 'gpu', name: 'GPU', english: 'Graphics Processing Unit', aliases: ['圖形處理器', '顯示晶片'], category: '硬體設施', short: '擅長大量平行運算、廣泛用於 AI 訓練與推論的處理器。', detail: 'GPU 原本用於圖形運算，也適合神經網路矩陣計算；實際能力受到記憶體容量、頻寬與互連影響。', sourceName: 'NVIDIA GPU 說明', sourceUrl: 'https://www.nvidia.com/en-us/data-center/what-is-a-gpu/', updatedAt: '2026-09-30' },
  { id: 'tpu', name: 'TPU', english: 'Tensor Processing Unit', aliases: ['Tensor Processing Unit', '張量處理器'], category: '硬體設施', short: 'Google 為機器學習工作設計的專用加速器。', detail: 'TPU 針對張量運算與大型模型訓練、推論最佳化，通常透過 Google Cloud 使用。', sourceName: 'Google Cloud TPU 文件', sourceUrl: 'https://cloud.google.com/tpu/docs/intro-to-tpu', updatedAt: '2026-09-30' },
  { id: 'data-center', name: '資料中心', english: 'Data Center', aliases: ['Data Center', '數據中心'], category: '硬體設施', short: '集中部署伺服器、網路、儲存、供電與冷卻設備的設施。', detail: '大型 AI 模型需要高密度運算與高速網路，使資料中心的電力、散熱、水資源與供應鏈成為重要議題。', sourceName: 'Google 資料中心', sourceUrl: 'https://www.google.com/about/datacenters/', updatedAt: '2026-09-30' },
  { id: 'ai-governance', name: 'AI 治理', english: 'AI Governance', aliases: ['人工智慧治理', '模型治理'], category: '治理安全', short: '管理 AI 的責任、風險、權限、透明度與使用規則。', detail: 'AI 治理涵蓋資料、模型、供應商、部署、監測與事故處理，目標是讓責任和決策流程可追溯。', sourceName: 'NIST AI 風險管理框架', sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework', updatedAt: '2026-09-30' },
  { id: 'ai-safety', name: 'AI 安全', english: 'AI Safety', aliases: ['模型安全', '人工智慧安全'], category: '治理安全', short: '研究並降低 AI 系統造成錯誤、濫用或失控影響的領域。', detail: 'AI 安全包括可靠性、資安、濫用防護、能力評估、人類監督與重大事故管理。', sourceName: 'NIST AI 風險管理框架', sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework', updatedAt: '2026-09-30' },
  { id: 'human-in-the-loop', name: '人在迴路', english: 'Human-in-the-loop', aliases: ['HITL', '人機核准', '人工審核', '人類控制'], category: '治理安全', short: '在 AI 工作流程中保留人工檢查、批准或接管。', detail: '人在迴路適合付款、發布、醫療、法律與高風險決策；人工存在不代表安全，仍需清楚權限和可理解資訊。', sourceName: 'NIST AI 風險管理框架', sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework', updatedAt: '2026-09-30' },
  { id: 'open-source-model', name: '開放權重模型', english: 'Open-weight Model', aliases: ['開源模型', 'Open-source Model', 'Open-weight'], category: '模型技術', short: '公開模型權重、允許下載或自行部署的模型。', detail: '開放權重不一定等同完整開源；授權條款、訓練資料、程式碼與商業使用限制需要分別確認。', sourceName: 'Google 機器學習詞彙表', sourceUrl: mlGlossary, updatedAt: '2026-09-30' },
  { id: 'chatgpt', name: 'ChatGPT', aliases: ['Chat GPT'], category: '產品服務', short: 'OpenAI 推出的對話式 AI 產品。', detail: 'ChatGPT 以對話介面提供問答、寫作、分析與工具功能；可用能力會依模型、方案與地區而不同。', sourceName: 'OpenAI：Introducing ChatGPT', sourceUrl: 'https://openai.com/index/chatgpt/', updatedAt: '2026-09-30' },
  { id: 'claude', name: 'Claude', aliases: ['Claude AI'], category: '產品服務', short: 'Anthropic 開發的 AI 助理與模型系列。', detail: 'Claude 可用於文字、程式、分析與代理工作；不同型號在能力、速度、價格與安全設定上有所差異。', sourceName: 'Anthropic Claude', sourceUrl: 'https://www.anthropic.com/claude', updatedAt: '2026-09-30' },
  { id: 'gemini', name: 'Gemini', aliases: ['Google Gemini'], category: '產品服務', short: 'Google 的多模態 AI 模型與助理品牌。', detail: 'Gemini 應用於消費者助理、Google 產品與開發平台；不同版本支援的上下文、工具與模態不同。', sourceName: 'Google Gemini', sourceUrl: 'https://gemini.google.com/', updatedAt: '2026-09-30' },
  { id: 'copilot', name: 'Copilot', aliases: ['Microsoft Copilot'], category: '產品服務', short: 'Microsoft 在 Windows、Microsoft 365 與開發工具中的 AI 助理品牌。', detail: 'Copilot 不是單一模型，而是一組整合於不同產品的 AI 功能；資料權限和能力依使用情境而異。', sourceName: 'Microsoft Copilot', sourceUrl: 'https://www.microsoft.com/en-us/microsoft-copilot', updatedAt: '2026-09-30' },
  { id: 'muse', name: 'Muse', english: 'Muse for Small Business', aliases: ['Meta Muse'], category: '產品服務', short: 'Meta 面向小型企業、可連接社群與商務工具的 AI 營運代理。', detail: 'Muse 能整理營運資料、準備內容與提出下一步；對外發布、傳送訊息或付款等動作仍需人工核准。', sourceName: 'Meta：Introducing Muse for Small Business', sourceUrl: 'https://about.fb.com/news/2026/09/introducing-muse-small-business/amp/', updatedAt: '2026-09-30' },
];

export const glossaryCategories = [
  '全部',
  '基礎概念',
  '模型技術',
  '開發技術',
  '硬體設施',
  '治理安全',
  '產品服務',
] as const;
