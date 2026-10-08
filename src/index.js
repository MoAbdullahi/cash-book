/* ============================================================
   DAILY CASH BOOK — Cloudflare Worker
   ------------------------------------------------------------
   The only thing you need to edit is the EDITORS list below.
   Give each of the four people a name and their own PIN, then
   send each person their own PIN privately.
   ============================================================ */

const EDITORS = [
  { name: "Mo",    pin: "4417" },
  { name: "Jamal", pin: "2856" },
  { name: "Three", pin: "7390" },
  { name: "Four",  pin: "6132" },
];

/* The days already in the book. Used only the very first time
   the page is opened; after that the saved book is used. */
const SEED = [
  { date: "2026-09-07", sales: 61010, expenses: 26610, by: "" },
  { date: "2026-09-08", sales: 48400, expenses: 28000, by: "" },
  { date: "2026-09-09", sales: 14430, expenses: 21320, by: "" },
  { date: "2026-09-10", sales: 42828, expenses: 18450, by: "Jamal" },
  { date: "2026-09-11", sales: 34990, expenses: 13635, by: "Jamal" },
  { date: "2026-09-12", sales: 63825, expenses: 10700, by: "Jamal" },
  { date: "2026-09-14", sales: 49870, expenses: 22850, by: "Jamal" },
  { date: "2026-09-15", sales: 31430, expenses: 4800,  by: "Jamal" },
  { date: "2026-09-16", sales: 24840, expenses: 7920,  by: "Jamal" },
  { date: "2026-09-17", sales: 16360, expenses: 1565,  by: "Jamal" },
  { date: "2026-09-18", sales: 16690, expenses: 6000,  by: "Jamal" },
  { date: "2026-09-19", sales: 49470, expenses: 24340, by: "Jamal" },
  { date: "2026-09-21", sales: 38660, expenses: 17565, by: "Jamal" },
  { date: "2026-09-22", sales: 27400, expenses: 14480, by: "Jamal" },
  { date: "2026-09-23", sales: 14450, expenses: 7210,  by: "Jamal" },
  { date: "2026-09-24", sales: 26240, expenses: 16580, by: "Jamal" },
  { date: "2026-09-25", sales: 20730, expenses: 8680,  by: "Jamal" },
  { date: "2026-09-26", sales: 20910, expenses: 6300,  by: "Jamal" },
  { date: "2026-09-28", sales: 40390, expenses: 35925, by: "Jamal" },
  { date: "2026-09-29", sales: 73080, expenses: 40990, by: "Jamal" },
  { date: "2026-09-30", sales: 17150, expenses: 30325, by: "Jamal" },
  { date: "2026-10-01", sales: 44070, expenses: 18725, by: "Jamal" },
  { date: "2026-10-02", sales: 18560, expenses: 6490,  by: "Jamal" },
  { date: "2026-10-03", sales: 50380, expenses: 36480, by: "Jamal" },
  { date: "2026-10-05", sales: 27510, expenses: 15375, by: "Jamal" },
];

const KEY = "book";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!env.BOOK) {
      return json({ error: "storage_missing" }, 500);
    }

    if (url.pathname === "/data") {
      return json({ entries: await load(env) });
    }

    if (url.pathname === "/whoami" && request.method === "POST") {
      return handleWhoAmI(request, env);
    }

    if (url.pathname === "/save" && request.method === "POST") {
      return handleSave(request, env);
    }

    if (url.pathname === "/remove" && request.method === "POST") {
      return handleRemove(request, env);
    }

    return new Response(PAGE, {
      headers: { "content-type": "text/html;charset=UTF-8" },
    });
  },
};

/* ---------- storage ---------- */

async function load(env) {
  const raw = await env.BOOK.get(KEY);
  if (!raw) {
    await env.BOOK.put(KEY, JSON.stringify(SEED));
    return SEED;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function editorFor(pin) {
  if (typeof pin !== "string") return null;
  return EDITORS.find((e) => e.pin === pin.trim()) || null;
}

async function handleWhoAmI(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }
  const who = editorFor(body.pin);
  if (!who) return json({ error: "bad_pin" }, 403);
  return json({ name: who.name, entries: await load(env) });
}

async function handleSave(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }

  const who = editorFor(body.pin);
  if (!who) return json({ error: "bad_pin" }, 403);

  const date = String(body.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "bad_date" }, 400);

  const sales = Number(body.sales);
  const expenses = Number(body.expenses);
  if (!isFinite(sales) || !isFinite(expenses) || sales < 0 || expenses < 0) {
    return json({ error: "bad_numbers" }, 400);
  }

  const entries = (await load(env)).filter((e) => e.date !== date);
  entries.push({ date, sales, expenses, by: who.name, at: Date.now() });
  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  await env.BOOK.put(KEY, JSON.stringify(entries));

  return json({ entries, saved: date, by: who.name });
}

async function handleRemove(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }

  const who = editorFor(body.pin);
  if (!who) return json({ error: "bad_pin" }, 403);

  const date = String(body.date || "");
  const entries = (await load(env)).filter((e) => e.date !== date);
  await env.BOOK.put(KEY, JSON.stringify(entries));

  return json({ entries, removed: date });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json;charset=UTF-8" },
  });
}

/* ---------- the page ---------- */

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Daily Cash Book</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{
  --bg:#ECEEE9; --surface:#F5F6F2; --rule:#CDD2C8;
  --ink:#1A231E; --muted:#5B665F;
  --pos:#2C6B47; --neg:#A8382A;
  --panel-pos:#2C6B47; --panel-neg:#A8382A; --panel-fg:#F3F6F1;
  --font-ui:"IBM Plex Sans",system-ui,-apple-system,Segoe UI,sans-serif;
  --font-num:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
@media (prefers-color-scheme:dark){:root{
  --bg:#141A17; --surface:#1C2320; --rule:#2F3A34;
  --ink:#E5EAE3; --muted:#92A099;
  --pos:#64C08C; --neg:#E58870;
  --panel-pos:#23523A; --panel-neg:#6B2A20; --panel-fg:#EAF1E8;
  color-scheme:dark;
}}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg); color:var(--ink); font-family:var(--font-ui);
  font-size:14px; line-height:1.5; font-variant-numeric:tabular-nums;
  padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px)}
#app{max-width:620px; margin:0 auto; padding-inline:18px; padding-block:22px 44px}
button:focus-visible,input:focus-visible{outline:2px solid var(--pos); outline-offset:2px}

.top{display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:16px}
.top h1{font-size:16px; font-weight:600; margin:0}
.who{font-size:12.5px; color:var(--muted)}

.panel{border-radius:3px; padding:22px 20px; color:var(--panel-fg); background:var(--panel-pos)}
.panel.neg{background:var(--panel-neg)}
.panel-label{margin:0; font-size:12px; letter-spacing:.06em; text-transform:uppercase; opacity:.8}
.panel-figure{font-family:var(--font-num); font-weight:500; font-size:clamp(32px,9vw,44px);
  line-height:1.08; margin:8px 0 10px; letter-spacing:-.02em}
.panel-sub{margin:0; font-size:12.5px; opacity:.85}
.panel-split{display:flex; gap:20px; margin-top:14px; padding-top:12px;
  border-top:1px solid rgba(255,255,255,.22); font-size:12.5px}
.panel-split b{display:block; font-family:var(--font-num); font-weight:500; font-size:15px; margin-top:2px}

.tabs{display:flex; gap:20px; border-bottom:1px solid var(--rule); margin:24px 0 0}
.tab{background:none; border:0; padding:9px 0 11px; font:inherit; font-size:14px; color:var(--muted);
  cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px}
.tab[aria-selected="true"]{color:var(--ink); border-bottom-color:var(--ink); font-weight:500}

.ledger{list-style:none; margin:0; padding:0}
.mdiv{display:flex; justify-content:space-between; align-items:baseline; gap:12px;
  margin-top:20px; padding-bottom:7px; border-bottom:2px solid var(--ink);
  font-size:13px; letter-spacing:.04em; text-transform:uppercase}
.ledger .mdiv:first-child{margin-top:14px}
.mdiv b{font-family:var(--font-num); font-size:14px; font-weight:500; letter-spacing:0; text-transform:none}
.mdiv b.neg{color:var(--neg)}

.row{padding:12px 0; border-bottom:1px solid var(--rule)}
.row-a{display:flex; justify-content:space-between; align-items:baseline; gap:12px}
.row-a .d{font-size:14.5px}
.run{font-family:var(--font-num); font-size:16px; color:var(--pos)}
.run.neg{color:var(--neg)}
.row-b{display:flex; gap:16px; flex-wrap:wrap; margin-top:4px; font-size:12.5px; color:var(--muted)}
.row-b .v{font-family:var(--font-num)}
.sin{color:var(--pos)} .sout{color:var(--neg)}
.by{margin:6px 0 0; font-size:12px; color:var(--muted)}
.acts{display:flex; gap:8px; margin-top:9px}

.card{margin-top:26px; background:var(--surface); border:1px solid var(--rule);
  border-radius:3px; padding:16px}
.card h2{font-size:15px; font-weight:600; margin:0 0 4px}
.card-top{display:flex; justify-content:space-between; align-items:center; gap:12px}
.hint{font-size:12.5px; color:var(--muted); margin:0 0 14px}
.fields{display:grid; gap:11px; margin-bottom:13px}
.fields label{display:grid; gap:5px; font-size:12.5px; color:var(--muted)}
.fields input{font:inherit; font-size:16px; font-family:var(--font-num); color:var(--ink);
  background:var(--bg); border:1px solid var(--rule); border-radius:3px; padding:10px;
  width:100%; min-width:0}
@media (min-width:520px){.fields.three{grid-template-columns:repeat(3,1fr)}}

.btn{font:inherit; font-size:14.5px; background:var(--ink); color:var(--bg); border:0;
  border-radius:3px; padding:11px 18px; cursor:pointer}
.btn[disabled]{opacity:.5; cursor:default}
.gbtn{font:inherit; font-size:13px; background:none; color:var(--muted);
  border:1px solid var(--rule); border-radius:3px; padding:5px 11px; cursor:pointer}
.gbtn.warn{color:var(--neg)}
.msg{font-size:13px; margin:13px 0 0}
.msg.bad{color:var(--neg)}
.empty{font-size:14px; color:var(--muted); padding:22px 0}
.foot{font-size:12px; color:var(--muted); line-height:1.65; margin-top:24px;
  padding-top:15px; border-top:1px solid var(--rule)}
@media (prefers-reduced-motion:reduce){*{animation:none!important; transition:none!important}}
</style>
</head>
<body>
<main id="app"><p class="empty">Loading the book&hellip;</p></main>
<script>
(function () {
  "use strict";

  var app = document.getElementById("app");
  var entries = [];
  var view = "days";
  var pin = "";
  var me = "";
  var busy = false;
  var note = "";
  var noteBad = false;
  var editing = null;

  try { pin = sessionStorage.getItem("cb-pin") || ""; } catch (e) {}

  function money(n) {
    var v = Number(n) || 0, a = Math.abs(v);
    var s = a.toLocaleString("en-KE", {
      minimumFractionDigits: a % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
    return (v < 0 ? "-KSh " : "KSh ") + s;
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }
  function utc(iso) {
    var p = iso.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }
  function dayLabel(iso) {
    return utc(iso).toLocaleDateString("en-GB",
      { weekday:"short", day:"numeric", month:"short", timeZone:"UTC" });
  }
  function monthLabel(key) {
    var p = key.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, 1))
      .toLocaleDateString("en-GB", { month:"long", year:"numeric", timeZone:"UTC" });
  }
  function weekKey(iso) {
    var d = utc(iso), n = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - n);
    var start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return d.getUTCFullYear() + "-W" +
      String(Math.ceil(((d - start) / 86400000 + 1) / 7)).padStart(2, "0");
  }

  // Running total restarts at zero on the first day of each month.
  function rows() {
    var sorted = entries.slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    var bal = 0, month = null;
    return sorted.map(function (e) {
      var m = e.date.slice(0, 7);
      if (m !== month) { bal = 0; month = m; }
      var net = Number(e.sales) - Number(e.expenses);
      bal += net;
      return { date:e.date, sales:Number(e.sales), expenses:Number(e.expenses),
               by:e.by || "", net:net, run:bal };
    });
  }
  function group(list, keyOf) {
    var order = [], map = {};
    list.forEach(function (r) {
      var k = keyOf(r.date);
      if (!map[k]) { map[k] = { key:k, items:[], sales:0, expenses:0, net:0 }; order.push(k); }
      var g = map[k];
      g.items.push(r); g.sales += r.sales; g.expenses += r.expenses; g.net += r.net;
    });
    return order.map(function (k) { return map[k]; });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function render() {
    var list = rows();
    var months = group(list, function (d) { return d.slice(0, 7); });
    var last = list.length ? list[list.length - 1] : null;
    var current = months.length ? months[months.length - 1] : null;

    app.textContent = "";

    var top = el("div", "top");
    top.appendChild(el("h1", null, "Daily cash book"));
    top.appendChild(el("span", "who", me ? "Signed in as " + me : "View only"));
    app.appendChild(top);

    var panel = el("section", "panel" + (last && last.run < 0 ? " neg" : ""));
    panel.appendChild(el("p", "panel-label",
      "Cash at hand" + (current ? " \\u00b7 " + monthLabel(current.key) : "")));
    panel.appendChild(el("p", "panel-figure", money(last ? last.run : 0)));
    panel.appendChild(el("p", "panel-sub", last
      ? "This month only, through " + dayLabel(last.date) + ". Every month starts from zero."
      : "No days recorded yet."));
    if (current) {
      var split = el("div", "panel-split");
      var a = el("div", null, "Sales this month");
      a.appendChild(el("b", null, money(current.sales)));
      var b = el("div", null, "Cash out this month");
      b.appendChild(el("b", null, money(current.expenses)));
      split.appendChild(a); split.appendChild(b);
      panel.appendChild(split);
    }
    app.appendChild(panel);

    var tabs = el("nav", "tabs");
    tabs.setAttribute("role", "tablist");
    [["days","Days"],["weeks","Weeks"],["months","Months"]].forEach(function (t) {
      var btn = el("button", "tab", t[1]);
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", view === t[0] ? "true" : "false");
      btn.addEventListener("click", function () { view = t[0]; render(); });
      tabs.appendChild(btn);
    });
    app.appendChild(tabs);

    if (!list.length) {
      app.appendChild(el("p", "empty", "No days yet."));
    } else if (view === "days") {
      app.appendChild(daysList(list, months));
    } else {
      app.appendChild(groupList(view === "weeks" ? group(list, weekKey) : months, view));
    }

    app.appendChild(card());

    app.appendChild(el("p", "foot", me
      ? "Everyone with the link sees these figures. Your name is saved against every day you enter."
      : "These figures are live. Only the four editors can change them \\u2014 everyone else reads."));
  }

  function daysList(list, months) {
    var ul = el("ul", "ledger"), seen = null;
    list.slice().reverse().forEach(function (r) {
      var mk = r.date.slice(0, 7);
      if (mk !== seen) {
        seen = mk;
        var g = months.filter(function (x) { return x.key === mk; })[0];
        var div = el("li", "mdiv");
        div.appendChild(el("span", null, monthLabel(mk)));
        div.appendChild(el("b", g.net < 0 ? "neg" : null, money(g.net)));
        ul.appendChild(div);
      }
      ul.appendChild(dayRow(r));
    });
    return ul;
  }

  function dayRow(r) {
    var li = el("li", "row");
    var a = el("div", "row-a");
    a.appendChild(el("span", "d", dayLabel(r.date)));
    a.appendChild(el("span", "run" + (r.run < 0 ? " neg" : ""), money(r.run)));
    li.appendChild(a);

    var b = el("div", "row-b");
    var s1 = el("span", "sin", "In ");
    s1.appendChild(el("span", "v", money(r.sales)));
    var s2 = el("span", "sout", "Out ");
    s2.appendChild(el("span", "v", money(r.expenses)));
    var s3 = el("span", r.net < 0 ? "sout" : null, "Day ");
    s3.appendChild(el("span", "v", (r.net >= 0 ? "+" : "\\u2212") + money(Math.abs(r.net))));
    b.appendChild(s1); b.appendChild(s2); b.appendChild(s3);
    li.appendChild(b);

    if (r.by) li.appendChild(el("p", "by", "Entered by " + r.by));

    if (me) {
      var acts = el("div", "acts");
      var ed = el("button", "gbtn", "Edit");
      ed.addEventListener("click", function () {
        editing = r.date; note = ""; render();
        var f = document.getElementById("f-sales"); if (f) f.focus();
      });
      var del = el("button", "gbtn warn", "Delete");
      del.disabled = busy;
      del.addEventListener("click", function () { remove(r.date); });
      acts.appendChild(ed); acts.appendChild(del);
      li.appendChild(acts);
    }
    return li;
  }

  function groupList(groups, kind) {
    var ul = el("ul", "ledger");
    groups.slice().reverse().forEach(function (g) {
      var li = el("li", "row");
      var a = el("div", "row-a");
      a.appendChild(el("span", "d", kind === "months"
        ? monthLabel(g.key) : spanLabel(g.items)));
      a.appendChild(el("span", "run" + (g.net < 0 ? " neg" : ""), money(g.net)));
      li.appendChild(a);
      var b = el("div", "row-b");
      var s1 = el("span", "sin", "In ");
      s1.appendChild(el("span", "v", money(g.sales)));
      var s2 = el("span", "sout", "Out ");
      s2.appendChild(el("span", "v", money(g.expenses)));
      b.appendChild(s1); b.appendChild(s2);
      b.appendChild(el("span", null, g.items.length + (g.items.length === 1 ? " day" : " days")));
      li.appendChild(b);
      ul.appendChild(li);
    });
    return ul;
  }

  function spanLabel(items) {
    var a = items[0].date, b = items[items.length - 1].date;
    return a === b ? dayLabel(a) : dayLabel(a) + " \\u2013 " + dayLabel(b);
  }

  function field(id, label, type, value) {
    var wrap = document.createElement("label");
    wrap.setAttribute("for", id);
    wrap.appendChild(document.createTextNode(label));
    var input = document.createElement("input");
    input.id = id; input.type = type;
    if (type === "number") input.inputMode = "decimal";
    if (type === "password") input.inputMode = "numeric";
    input.value = value || "";
    wrap.appendChild(input);
    return wrap;
  }

  function prefill(key) {
    if (!editing) return "";
    var hit = entries.filter(function (e) { return e.date === editing; })[0];
    return hit ? String(hit[key]) : "";
  }

  function card() {
    var c = el("section", "card");

    if (!me) {
      c.appendChild(el("h2", null, "Editing is locked"));
      c.appendChild(el("p", "hint",
        "Anyone can read this page. The four editors each have their own PIN."));
      var f = el("div", "fields");
      f.appendChild(field("f-pin", "Your PIN", "password", ""));
      c.appendChild(f);
      var unlock = el("button", "btn", busy ? "Checking\\u2026" : "Unlock editing");
      unlock.disabled = busy;
      unlock.addEventListener("click", tryUnlock);
      c.appendChild(unlock);
      var inp = f.querySelector("input");
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") tryUnlock(); });
      if (note) c.appendChild(el("p", "msg" + (noteBad ? " bad" : ""), note));
      return c;
    }

    var head = el("div", "card-top");
    head.appendChild(el("h2", null, editing ? "Change " + dayLabel(editing) : "Enter a day"));
    var lock = el("button", "gbtn", editing ? "Cancel" : "Lock");
    lock.addEventListener("click", function () {
      if (editing) { editing = null; }
      else { me = ""; pin = ""; try { sessionStorage.removeItem("cb-pin"); } catch (e) {} }
      note = ""; render();
    });
    head.appendChild(lock);
    c.appendChild(head);
    c.appendChild(el("p", "hint",
      "Saving a date that is already in the book replaces that day's figures."));

    var fields = el("div", "fields three");
    fields.appendChild(field("f-date", "Date", "date", editing || todayISO()));
    fields.appendChild(field("f-sales", "Total sales (KSh)", "number", prefill("sales")));
    fields.appendChild(field("f-out", "Cash out (KSh)", "number", prefill("expenses")));
    c.appendChild(fields);

    var save = el("button", "btn", busy ? "Saving\\u2026" : "Save day");
    save.disabled = busy;
    save.addEventListener("click", saveDay);
    c.appendChild(save);

    if (note) c.appendChild(el("p", "msg" + (noteBad ? " bad" : ""), note));
    return c;
  }

  function say(text, bad) { note = text; noteBad = !!bad; }

  function post(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, data: d }; });
    });
  }

  function failure(d) {
    if (!d) return "Could not reach the book. Check your connection.";
    if (d.error === "bad_pin") return "That PIN is not one of the four.";
    if (d.error === "bad_date") return "Pick a date.";
    if (d.error === "bad_numbers") return "Sales and cash out must be numbers, and not negative.";
    if (d.error === "storage_missing") return "Storage is not set up yet. Mo needs to finish setup.";
    return "That did not save. Try again.";
  }

  function tryUnlock() {
    var val = document.getElementById("f-pin").value.trim();
    if (!val) { say("Enter your PIN.", true); render(); return; }
    busy = true; say(""); render();
    post("/whoami", { pin: val }).then(function (res) {
      busy = false;
      if (res.ok) {
        pin = val;
        me = res.data.name;
        entries = res.data.entries;
        try { sessionStorage.setItem("cb-pin", pin); } catch (e) {}
        say("");
      } else {
        say(failure(res.data), true);
      }
      render();
    }).catch(function () {
      busy = false; say(failure(null), true); render();
    });
  }

  function saveDay() {
    var date = document.getElementById("f-date").value;
    var sales = document.getElementById("f-sales").value;
    var out = document.getElementById("f-out").value;
    if (!date) { say("Pick a date.", true); render(); return; }
    busy = true; say("Saving\\u2026"); render();
    post("/save", { pin: pin, date: date, sales: sales, expenses: out })
      .then(function (res) {
        busy = false;
        if (res.ok) {
          entries = res.data.entries;
          me = res.data.by;
          editing = null;
          say("Saved " + dayLabel(res.data.saved) + ".");
        } else {
          say(failure(res.data), true);
          if (res.data && res.data.error === "bad_pin") { me = ""; pin = ""; }
        }
        render();
      }).catch(function () {
        busy = false; say(failure(null), true); render();
      });
  }

  function remove(date) {
    busy = true; say("Removing\\u2026"); render();
    post("/remove", { pin: pin, date: date }).then(function (res) {
      busy = false;
      if (res.ok) { entries = res.data.entries; say("Removed " + dayLabel(date) + "."); }
      else { say(failure(res.data), true); }
      render();
    }).catch(function () {
      busy = false; say(failure(null), true); render();
    });
  }

  fetch("/data").then(function (r) { return r.json(); }).then(function (d) {
    entries = d.entries || [];
    render();
    if (pin) {
      post("/whoami", { pin: pin }).then(function (res) {
        if (res.ok) { me = res.data.name; entries = res.data.entries; }
        else { pin = ""; try { sessionStorage.removeItem("cb-pin"); } catch (e) {} }
        render();
      }).catch(function () {});
    }
  }).catch(function () {
    app.textContent = "";
    app.appendChild(el("p", "empty", "Could not load the book. Refresh to try again."));
  });
})();
<\/script>
</body>
</html>`;
