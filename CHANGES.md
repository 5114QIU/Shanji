2026-04-17 — 本次更新说明

概览：
- 修复/增强重置密码流程的兼容性与手机访问体验。

详细改动：

1. `src/App.tsx`
- 支持从 URL 的 `query`、`hash` 和路径中识别重置密码标志（`?type=recovery` 或 `#...` 或 `/reset-password`）。
- 目的：在用户通过邮件在新标签/不同打开方式返回时均能正确渲染重置密码页面。

2. `src/components/auth/ResetPasswordPage.tsx`
- 页面加载时会解析 URL 中可能包含的 `access_token` 与 `refresh_token`（支持 query 与 hash），并尝试用 `supabase.auth.setSession(...)` 建立会话。
- 成功后会清理 URL（移除敏感参数），避免令牌泄露。
- 目的：保证通过邮件跳转回站点后，Supabase 会话正确建立，从而能提交新密码。

3. `src/components/auth/AuthForm.tsx`
- 改进发送重置邮件时的 `redirectTo`：优先使用环境变量 `VITE_APP_URL`（若配置），否则回退到 `window.location.origin`。
- 目的：避免邮件链接指向 `localhost` 导致手机无法访问；可配置为局域网 IP 或生产域名以便手机打开。

4. `src/vite-env.d.ts`
- 新增可选声明 `VITE_APP_URL?: string`，用于类型提示与编译时检查。

其他：
- 本次变更已在本地测试开发服务器（Vite）启动流程；如需我将改动推送到 GitHub 并生成 Pull Request，请确认。

注意事项：
- 请不要在前端代码或仓库中提交 Supabase 的 service-role key（仅在后端/Secret 管理中使用）。
- 若要在手机上直接测试本地开发服务器，请在 `.env` 中设置 `VITE_APP_URL` 指向你的机器局域网 IP（如 `http://192.168.x.x:3000`），或使用公网隧道（如 ngrok）。
