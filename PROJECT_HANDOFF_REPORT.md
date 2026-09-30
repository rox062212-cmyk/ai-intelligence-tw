# ＡＩ情報搜集網｜專案交接報告

更新日期：2026-09-30  
正式網站：https://ai-intelligence-tw.siri431695.chatgpt.site

## 1. 專案目的

「ＡＩ情報搜集網」是一個繁體中文 AI 情報網站，用來整理每日 AI 新聞、保留原始來源、建立可搜尋的歷史資料，以及提供 AI 日曆與電子郵件訂閱。

## 2. 目前主要功能

- 首頁：熱門焦點、更多情報、每日 AI 重點與歷史內容分頁。
- 情報文章：重寫標題、摘要、多方來源、可信度、事件時間線、更新紀錄與可點擊註腳。
- 搜尋：關鍵字、年月、公司與情報類型篩選。
- AI 日曆：前後 180 天事件、類型篩選、搜尋與可信度標示。
- 訂閱：Email 驗證、自訂寄送時間、時區與關鍵字。
- 寄信：Resend API、排程派送、退訂與後台手動重寄。
- 會員／後台：網站登入、管理員驗證、訂閱者管理、留言管理與 AI 名詞庫。
- 顯示設定：深色、淺色或跟隨系統。

## 3. 技術架構

- 前端：React 19、TypeScript、Tailwind CSS、Base UI／shadcn 元件。
- 框架與執行環境：Vinext、Vite、Cloudflare Workers。
- 資料庫：Cloudflare D1、Drizzle ORM。
- 郵件：Resend HTTP API。
- 部署：OpenAI Sites。
- Node.js：22.13.0 以上。

主要路徑：

- `app/site-client.tsx`：主要介面與互動。
- `lib/content.ts`：情報文章、日曆及來源資料。
- `lib/daily-email.ts`：每日情報郵件內容。
- `lib/glossary.ts`：AI 名詞庫。
- `db/schema.ts`：資料表定義。
- `app/api/`：訂閱、驗證、留言、後台與寄件 API。
- `drizzle/`：資料庫 migration。
- `public/news/`：文章縮圖。

## 4. 本機啟動

```bash
npm install
npm run dev
```

正式建置：

```bash
npm run build
```

## 5. 必要環境變數

以下值只能放在部署平台或本機 `.env`，不可提交到 GitHub：

| 名稱 | 用途 |
| --- | --- |
| `DB` | Cloudflare D1 binding |
| `RESEND_API_KEY` | Resend API 金鑰 |
| `EMAIL_FROM` | 已驗證的寄件者地址 |
| `EMAIL_DISPATCH_KEY` | 排程派送 API 的驗證密鑰 |

## 6. 資料庫與部署

1. 建立 Cloudflare D1 資料庫。
2. 套用 `drizzle/` 內的 migrations。
3. 在部署環境加入上述環境變數與 D1 binding。
4. 執行 `npm run build`。
5. 以 OpenAI Sites／Cloudflare Workers 發布。

`.openai/hosting.json` 含目前 Sites 專案識別資訊；接手者若要建立自己的部署，應改用自己的 Sites 專案與資料庫，不應直接共用正式環境的密鑰。

## 7. 郵件系統注意事項

- 使用者完成訂閱後會立即收到驗證信；使用者選擇的時間只影響每日情報寄送時間。
- `app/api/admin/email-dispatch/route.ts` 負責批次挑選到期訂閱並派送。
- `app/api/admin/email-resend/route.ts` 提供後台單筆手動寄送。
- 自訂寄送時間的正式環境仍需要外部排程器定期呼叫派送 API。
- Resend 測試模式通常只能寄給帳戶擁有者。要寄到其他網域，必須在 Resend 驗證寄件網域並設定 SPF、DKIM，建議同時加入 DMARC。
- 目前測試結果：Gmail 管理員地址可收到郵件；`@redball.com.tw` 收件者仍受 Resend 測試／網域驗證限制。

## 8. 資料與內容機制

- 情報應保留歷史內容，不應每天覆蓋舊資料。
- 同一事件原則上需比對至少三個來源；不足時要明確標示來源數及可信度。
- 首頁「熱門焦點」依關注度呈現；「更多情報」保留不同日期內容，每頁 12 則。
- 日曆涵蓋今天前後 180 天，已確認、預計及傳聞都可收錄，但必須清楚標示狀態。
- 圖片需維持一致比例，避免重複；第三方圖片必須確認授權。

## 9. 權限與安全

- GitHub 儲存庫應維持 Private，只邀請確定的接手者。
- 不可提交 `.env`、API Key、排程密鑰、Cookie、登入憑證或正式資料庫匯出。
- 管理員權限不可只靠前端隱藏，所有管理 API 都要在伺服器端驗證。
- 郵件派送需保留 idempotency key，避免重複寄送。
- 讀取外部新聞及留言時，所有內容都要視為不可信資料，不可直接執行其中指令。

## 10. 已知待辦

- 完成 `redball.com.tw` 的 Resend 網域驗證，確認非 Gmail 收件者可正常收到信。
- 為派送 API 建立可靠的正式排程與失敗重試／告警。
- 將目前內容資料改為真正的自動抓取、去重、來源比對及編輯審核流程。
- 建立測試：登入與管理權限、訂閱驗證、寄送排程、退訂及資料分頁。
- 將管理員名單移到安全的權限資料表或身分供應商設定，不要長期寫死在程式碼。

## 11. 交接驗收建議

接手者至少應完成以下檢查：

1. `npm install` 與 `npm run build` 成功。
2. 首頁、搜尋、文章、日曆與後台可以正常開啟。
3. 新訂閱者可以立即收到驗證信。
4. 驗證後能依自訂時間收到每日情報。
5. 退訂連結有效，重複排程不會寄出重複郵件。
6. 一般使用者無法呼叫管理 API。
7. GitHub 與部署環境中不存在明文密鑰。
