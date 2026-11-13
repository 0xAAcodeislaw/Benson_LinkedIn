// 后台页面的 HTML 外壳（登录页 / 编辑页）。表单逻辑在 src/assets/admin.js。

const BASE_CSS = `
:root{--blue:#0a66c2;--bg:#f4f2ee;--card:#fff;--text:#191919;--muted:rgba(0,0,0,.6);
--border:rgba(0,0,0,.12);--danger:#b3261e;--radius:10px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);
font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif}
a{color:var(--blue)}
button{font:inherit;cursor:pointer}
input,textarea,select{font:inherit;color:inherit}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius)}
.btn{border:1px solid transparent;border-radius:999px;padding:8px 18px;font-weight:600;
background:var(--blue);color:#fff;transition:background .15s}
.btn:hover{background:#004182}
.btn.ghost{background:#fff;color:var(--blue);border-color:var(--blue)}
.btn.ghost:hover{background:rgba(10,102,194,.08)}
.btn.danger{background:#fff;color:var(--danger);border-color:var(--danger)}
.btn:disabled{opacity:.5;cursor:not-allowed}
`;

export function loginPage({ error = "", next = "/admin" } = {}) {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>后台登录</title>
<style>${BASE_CSS}
.wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.box{width:100%;max-width:360px;padding:32px 28px}
h1{margin:0 0 6px;font-size:20px}
p.sub{margin:0 0 20px;color:var(--muted);font-size:13px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
input[type=password]{width:100%;padding:10px 12px;border:1px solid var(--border);
border-radius:8px;background:#fff}
input[type=password]:focus{outline:2px solid var(--blue);outline-offset:1px;border-color:transparent}
button{width:100%;margin-top:16px;padding:10px}
.err{margin-top:14px;padding:9px 12px;border-radius:8px;background:#fdecea;color:var(--danger);font-size:13px}
.hint{margin-top:18px;font-size:12px;color:var(--muted)}
</style>
</head>
<body>
<div class="wrap">
  <form class="card box" method="post" action="/api/login">
    <h1>后台登录</h1>
    <p class="sub">修改简历内容与头像</p>
    <label for="pw">密码</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
    <input type="hidden" name="next" value="${next}">
    <button class="btn" type="submit">登录</button>
    ${error ? `<div class="err">${error}</div>` : ""}
    <p class="hint">忘记密码：在终端运行<br><code>npx wrangler secret put ADMIN_PASSWORD_HASH</code></p>
  </form>
</div>
</body>
</html>`;
}

export function editorPage() {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>内容管理</title>
<style>${BASE_CSS}
.top{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid var(--border)}
.top-in{max-width:900px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.top h1{font-size:15px;margin:0;font-weight:700}
.spacer{flex:1}
.status{font-size:12px;color:var(--muted)}
.status.ok{color:#057642}
.status.err{color:var(--danger)}
.tabs{max-width:900px;margin:0 auto;padding:0 16px;display:flex;gap:4px;overflow-x:auto}
.tabs button{border:none;background:none;padding:8px 14px;border-radius:8px 8px 0 0;
color:var(--muted);font-weight:600;font-size:13px}
.tabs button[aria-selected=true]{color:var(--blue);background:rgba(10,102,194,.08)}
main{max-width:900px;margin:0 auto;padding:18px 16px 80px}
section.card{padding:18px;margin-bottom:14px}
section.card h2{font-size:15px;margin:0 0 4px}
section.card .note{font-size:12px;color:var(--muted);margin:0 0 14px}
.field{margin-bottom:14px}
.field:last-child{margin-bottom:0}
.field label{display:block;font-size:12.5px;font-weight:600;margin-bottom:5px;color:#333}
.field input[type=text],.field input[type=number],.field input[type=password],.field textarea{
width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:#fff}
.field textarea{min-height:74px;resize:vertical}
.field input:focus,.field textarea:focus{outline:2px solid var(--blue);outline-offset:1px;border-color:transparent}
.item{border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;background:#fafafa}
.item-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.item-head strong{font-size:13px}
.item-head .spacer{flex:1}
.mini{border:none;background:none;color:var(--muted);padding:4px 6px;border-radius:6px;font-size:12px}
.mini:hover{background:rgba(0,0,0,.06);color:var(--text)}
.mini.del:hover{background:#fdecea;color:var(--danger)}
.add{border:1px dashed var(--border);background:none;color:var(--blue);border-radius:8px;
padding:9px;width:100%;font-weight:600;font-size:13px}
.add:hover{background:rgba(10,102,194,.06)}
.avatar-row{display:flex;align-items:center;gap:14px}
.avatar-row img{width:72px;height:72px;border-radius:50%;object-fit:cover;border:1px solid var(--border)}
.avatar-actions{display:flex;flex-direction:column;gap:6px}
.check{display:flex;align-items:center;gap:8px;font-size:13px}
.warn{background:#fff8e1;border:1px solid #f0d9a0;border-radius:8px;padding:10px 12px;
font-size:12.5px;color:#7a5b00;margin-bottom:14px}
.color-row{display:flex;gap:8px;align-items:center}
.color-row input[type=color]{width:46px;height:38px;padding:2px;border:1px solid var(--border);
border-radius:8px;background:#fff;cursor:pointer}
.color-row input[type=text]{flex:1}
.img-field{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
.img-field img{width:168px;height:96px;object-fit:cover;border-radius:8px;
border:1px solid var(--border);background:#f0f0f0}
.img-actions{display:flex;flex-direction:column;gap:6px}
.backup-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.field input.is-missing,.field textarea.is-missing{border-color:#d08b00;background:#fffbf0}
:root[data-theme=dark] .field input.is-missing,
:root[data-theme=dark] .field textarea.is-missing{background:#3a2f14;border-color:#b58500}

/* 手机端：顶部栏压成一行，避免按钮换行 */
@media (max-width:640px){
.top-in{padding:8px 12px;gap:8px;flex-wrap:nowrap}
.top h1{font-size:14px;white-space:nowrap}
.top .btn{padding:8px 12px;font-size:13px;white-space:nowrap}
.top .status{display:none}
.tabs{padding:0 12px}
main{padding:14px 12px 72px}
section.card{padding:14px}
.item{padding:12px}
.item-head{gap:6px}
.item-head strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
}
</style>
</head>
<body>
<header class="top">
  <div class="top-in">
    <h1>内容管理</h1>
    <span class="status" id="status"></span>
    <span class="spacer"></span>
    <a class="btn ghost" href="/" target="_blank" rel="noopener">查看网站</a>
    <a class="btn ghost" href="/en/?print=1" target="_blank" rel="noopener">打印简历</a>
    <button class="btn" id="save" type="button">保存</button>
    <button class="btn ghost" id="logout" type="button">退出</button>
  </div>
  <div class="tabs" id="tabs" role="tablist"></div>
</header>
<main id="form" aria-live="polite"></main>
<script src="/assets/admin.js" defer></script>
</body>
</html>`;
}
