/* =====================================================
   Spend Tracker: plain JavaScript, no libraries.
   Pages: index.html (Home), daily.html (Daily Spends),
          monthly.html (Monthly Total), fields.html (Expense Fields)
   Data is saved in the browser with localStorage.
   ===================================================== */
(function () {
  "use strict";

  /* ---------- 1. DATA ---------- */
  var KEY_EXPENSES = "spend.expenses";
  var KEY_FIELDS = "spend.fields";

  var DEFAULT_FIELDS = [
    { id: "f-food", name: "Food", color: "#f59e0b" },
    { id: "f-transport", name: "Transport", color: "#3b82f6" },
    { id: "f-bills", name: "Bills", color: "#ef4444" },
    { id: "f-shopping", name: "Shopping", color: "#a855f7" },
    { id: "f-entertainment", name: "Entertainment", color: "#ec4899" },
    { id: "f-health", name: "Health", color: "#10b981" },
    { id: "f-other", name: "Other", color: "#64748b" }
  ];

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length >= 0 ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY_EXPENSES, JSON.stringify(expenses));
      localStorage.setItem(KEY_FIELDS, JSON.stringify(fields));
    } catch (e) {
      /* storage blocked or full: ignore */
    }
  }

  var fields = load(KEY_FIELDS, DEFAULT_FIELDS.slice());
  if (fields.length === 0) fields = DEFAULT_FIELDS.slice();
  var expenses = load(KEY_EXPENSES, []);

  /* ---------- 2. HELPERS ---------- */
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function todayISO() { return isoDate(new Date()); }
  function parseISO(iso) {
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function monthKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function shiftMonth(key, n) {
    var p = key.split("-").map(Number);
    return monthKey(new Date(p[0], p[1] - 1 + n, 1));
  }
  function monthLabel(key) {
    var p = key.split("-").map(Number);
    return MONTHS_LONG[p[1] - 1] + " " + p[0];
  }
  function monthLabelShort(key) {
    var p = key.split("-").map(Number);
    return MONTHS[p[1] - 1] + " " + String(p[0]).slice(2);
  }
  function fmtDay(iso) {
    var d = parseISO(iso);
    return DAYS[d.getDay()] + ", " + pad(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }
  function fmtShort(iso) {
    var d = parseISO(iso);
    return pad(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }
  function fmtMoney(n) {
    var whole = Math.abs(n - Math.round(n)) < 0.005;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2
    }).format(n);
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function sum(list) { return list.reduce(function (s, e) { return s + e.amount; }, 0); }
  function fieldById(id) {
    for (var i = 0; i < fields.length; i++) if (fields[i].id === id) return fields[i];
    return { id: id, name: "Unknown", color: "#94a3b8" };
  }
  function readableOn(hex) {
    var h = String(hex || "#000000").replace("#", "");
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#1f2937" : "#ffffff";
  }
  function tag(f) {
    return '<span class="tag" style="background:' + esc(f.color) + ";color:" + readableOn(f.color) + '">' + esc(f.name) + "</span>";
  }
  function inMonth(key) {
    return expenses.filter(function (e) { return e.date.slice(0, 7) === key; });
  }
  function totalsByField(list) {
    var map = {};
    list.forEach(function (e) { map[e.field] = (map[e.field] || 0) + e.amount; });
    return Object.keys(map)
      .map(function (id) { return { field: fieldById(id), total: map[id] }; })
      .sort(function (a, b) { return b.total - a.total; });
  }
  function emptyBox(text) {
    return '<div class="empty"><div class="empty-icon">🧾</div><h3>' + esc(text) + "</h3>" +
      '<p>Add your first spend to see it here.</p>' +
      '<div class="row center"><button class="btn" data-action="add">+ Add Expense</button>' +
      '<button class="btn btn-ghost" data-action="sample">Load sample data</button></div></div>';
  }

  /* ---------- 3. SAMPLE DATA ---------- */
  function buildSample() {
    var now = new Date();
    var rows = [
      [0, 1, "f-bills", 1800, "Electricity and internet"], [0, 2, "f-food", 450, "Groceries"], [0, 3, "f-transport", 120, "Metro card recharge"],
      [1, 2, "f-bills", 1750, "Electricity and internet"], [1, 9, "f-food", 620, "Dinner with friends"], [1, 14, "f-transport", 300, "Cab rides"],
      [1, 20, "f-shopping", 1500, "Headphones"], [2, 4, "f-bills", 1700, "Electricity and internet"], [2, 11, "f-food", 540, "Groceries"],
      [2, 18, "f-entertainment", 400, "Movie night"], [3, 5, "f-bills", 1650, "Electricity and internet"], [3, 12, "f-food", 380, "Canteen"],
      [3, 22, "f-shopping", 900, "T-shirts"], [4, 6, "f-bills", 1700, "Electricity and internet"], [4, 15, "f-transport", 250, "Bus pass"],
      [5, 8, "f-food", 700, "Groceries"], [5, 17, "f-entertainment", 350, "Cricket match tickets"]
    ];
    return rows.map(function (r) {
      var day = r[0] === 0 ? Math.min(r[1], now.getDate()) : r[1];
      var fid = fields.some(function (f) { return f.id === r[2]; }) ? r[2] : fields[0].id;
      return { id: uid(), amount: r[3], field: fid, date: isoDate(new Date(now.getFullYear(), now.getMonth() - r[0], day)), note: r[4] };
    });
  }

  /* ---------- 4. MODAL ---------- */
  function closeModal() {
    var o = document.getElementById("overlay");
    if (o) o.remove();
  }
  function openModal(title, bodyHtml) {
    closeModal();
    var o = document.createElement("div");
    o.className = "overlay";
    o.id = "overlay";
    o.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<button class="x" type="button" aria-label="Close" data-action="close">×</button>' +
      "<h2>" + esc(title) + "</h2>" + bodyHtml + "</div>";
    document.body.appendChild(o);
    o.addEventListener("mousedown", function (e) { if (e.target === o) closeModal(); });
    var first = o.querySelector("input,select");
    if (first) first.focus();
  }
  function setErr(form, name, msg) {
    var el = form.querySelector('[data-for="' + name + '"]');
    if (el) el.textContent = msg || "";
  }

  function openAddExpense() {
    var opts = fields.map(function (f) { return '<option value="' + esc(f.id) + '">' + esc(f.name) + "</option>"; }).join("");
    openModal("Add Expense",
      '<form id="addForm" novalidate>' +
      '<label>Amount (₹)<input id="fAmount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="e.g. 450"><span class="err" data-for="amount"></span></label>' +
      '<label>Field of expense<select id="fField"><option value="">Select a field</option>' + opts + '</select><span class="err" data-for="field"></span></label>' +
      '<label>Date<input id="fDate" type="date" value="' + todayISO() + '"><span class="err" data-for="date"></span></label>' +
      '<label>Note (optional)<input id="fNote" type="text" maxlength="120" placeholder="What was this for?"></label>' +
      '<div class="row end"><button type="button" class="btn btn-ghost" data-action="close">Cancel</button><button type="submit" class="btn">Save expense</button></div>' +
      "</form>");
  }

  /* ---------- 5. PAGES ---------- */
  var state = { dailyMonth: monthKey(new Date()), monthlySel: null };
  var pages = {};

  /* HOME */
  pages.home = function () {
    var today = todayISO();
    var mk = monthKey(new Date());
    var todayList = expenses.filter(function (e) { return e.date === today; });
    var monthList = inMonth(mk);
    var byField = totalsByField(monthList);
    var top = byField[0];
    var html = '<h1>Dashboard</h1><div class="stats">' +
      '<div class="stat"><span>Spent today</span><b>' + fmtMoney(sum(todayList)) + "</b><small>" + fmtDay(today) + "</small></div>" +
      '<div class="stat"><span>This month</span><b>' + fmtMoney(sum(monthList)) + "</b><small>" + monthLabel(mk) + "</small></div>" +
      '<div class="stat"><span>Top field this month</span><b>' + (top ? esc(top.field.name) : "—") + "</b><small>" + (top ? fmtMoney(top.total) : "No spends yet") + "</small></div>" +
      "</div>";
    if (expenses.length === 0) return html + emptyBox("No expenses yet");
    var recent = expenses.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 6);
    html += '<section class="card"><div class="card-head"><h2>Recent spends</h2><a class="link" href="daily.html">See all daily spends →</a></div><ul class="list">';
    recent.forEach(function (e) {
      html += "<li>" + tag(fieldById(e.field)) + '<span class="grow"><span class="note">' + esc(e.note || "No note") + '</span><small class="muted">' + fmtShort(e.date) + "</small></span>" +
        '<b class="amt">' + fmtMoney(e.amount) + "</b></li>";
    });
    return html + "</ul></section>";
  };

  /* DAILY SPENDS */
  pages.daily = function () {
    var list = inMonth(state.dailyMonth);
    var html = '<h1>Daily Spends</h1><div class="toolbar"><label class="inline">Month <input type="month" id="monthPick" value="' + esc(state.dailyMonth) + '"></label>' +
      '<div class="muted">' + list.length + " spend" + (list.length === 1 ? "" : "s") + " · Total <b>" + fmtMoney(sum(list)) + "</b></div></div>";
    if (expenses.length === 0) return html + emptyBox("No expenses yet");
    if (list.length === 0) return html + '<div class="empty"><div class="empty-icon">📅</div><h3>No spends in ' + esc(monthLabel(state.dailyMonth)) + "</h3><p>Pick another month or add a spend.</p></div>";
    var groups = {};
    list.forEach(function (e) { (groups[e.date] = groups[e.date] || []).push(e); });
    Object.keys(groups).sort().reverse().forEach(function (date) {
      var items = groups[date];
      html += '<section class="card day"><div class="day-head"><h2>' + fmtDay(date) + "</h2><b>" + fmtMoney(sum(items)) + '</b></div><ul class="list">';
      items.forEach(function (e) {
        html += "<li>" + tag(fieldById(e.field)) + '<span class="grow note">' + esc(e.note || "—") + "</span>" +
          '<b class="amt">' + fmtMoney(e.amount) + "</b>" +
          '<button class="icon-btn danger" data-action="del" data-id="' + esc(e.id) + '" aria-label="Delete this spend" title="Delete">🗑</button></li>';
      });
      html += "</ul></section>";
    });
    return html;
  };

  /* MONTHLY TOTAL */
  pages.monthly = function () {
    var totals = {};
    expenses.forEach(function (e) { var k = e.date.slice(0, 7); totals[k] = (totals[k] || 0) + e.amount; });
    var keys = Object.keys(totals).sort().reverse();
    var html = "<h1>Total Monthly Expense</h1>";
    if (keys.length === 0) return html + emptyBox("No expenses yet");
    var current = monthKey(new Date());
    if (!state.monthlySel || !totals[state.monthlySel]) state.monthlySel = totals[current] ? current : keys[0];
    var max = Math.max.apply(null, keys.map(function (k) { return totals[k]; }));
    html += '<section class="card"><h2>All months</h2><ul class="bars">';
    keys.forEach(function (k) {
      html += '<li><button class="bar-row' + (k === state.monthlySel ? " active" : "") + '" data-action="pick-month" data-month="' + k + '">' +
        '<span class="bar-label">' + esc(monthLabelShort(k)) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.max(2, (totals[k] / max) * 100).toFixed(1) + '%"></span></span>' +
        '<span class="bar-val">' + fmtMoney(totals[k]) + "</span></button></li>";
    });
    html += "</ul></section>";

    var sel = state.monthlySel;
    var selList = inMonth(sel);
    var selTotal = totals[sel];
    var prevTotal = totals[shiftMonth(sel, -1)] || 0;
    var change = "";
    if (prevTotal > 0) {
      var pct = ((selTotal - prevTotal) / prevTotal) * 100;
      change = '<span class="' + (pct > 0 ? "up" : pct < 0 ? "down" : "flat") + '">' + (pct > 0 ? "▲" : pct < 0 ? "▼" : "•") + " " + Math.abs(pct).toFixed(1) + "%</span> " +
        '<span class="muted">vs ' + esc(monthLabel(shiftMonth(sel, -1))) + " (" + fmtMoney(prevTotal) + ")</span>";
    } else {
      change = '<span class="muted">No data for the previous month to compare</span>';
    }
    html += '<section class="card"><div class="summary"><span class="muted">Total spent in ' + esc(monthLabel(sel)) + "</span><b>" + fmtMoney(selTotal) + "</b><div>" + change + "</div></div>" +
      "<h2>By field of expense</h2><ul class=\"bars\">";
    totalsByField(selList).forEach(function (r) {
      html += '<li class="bar-row static"><span class="bar-label">' + tag(r.field) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.max(2, (r.total / selTotal) * 100).toFixed(1) + "%;background:" + esc(r.field.color) + '"></span></span>' +
        '<span class="bar-val">' + fmtMoney(r.total) + " · " + Math.round((r.total / selTotal) * 100) + "%</span></li>";
    });
    return html + '</ul><p class="muted small">' + selList.length + " spend" + (selList.length === 1 ? "" : "s") + ' in this month · <a class="link" href="daily.html" data-action="goto-daily" data-month="' + sel + '">View daily spends →</a></p></section>';
  };

  /* EXPENSE FIELDS */
  pages.fields = function () {
    var mk = monthKey(new Date());
    var monthTotals = {}, allTotals = {}, counts = {};
    expenses.forEach(function (e) {
      allTotals[e.field] = (allTotals[e.field] || 0) + e.amount;
      counts[e.field] = (counts[e.field] || 0) + 1;
      if (e.date.slice(0, 7) === mk) monthTotals[e.field] = (monthTotals[e.field] || 0) + e.amount;
    });
    var html = "<h1>Fields of Expense</h1>" +
      '<section class="card"><h2>Add a new field</h2><form id="addFieldForm" class="inline-form" novalidate>' +
      '<label>Name<input id="newName" type="text" maxlength="24" placeholder="e.g. Rent"></label>' +
      '<label>Colour<input id="newColor" type="color" value="#0ea5e9" class="color-input"></label>' +
      '<button class="btn" type="submit">Add field</button></form><span class="err" id="fieldErr"></span></section>' +
      '<section class="card"><div class="card-head"><h2>Your fields</h2><span class="muted small">Totals for ' + esc(monthLabel(mk)) + " and all time</span></div><ul class=\"list\">";
    fields.forEach(function (f) {
      html += "<li>" + tag(f) + '<span class="grow"><span class="note">' + fmtMoney(monthTotals[f.id] || 0) + ' this month</span><small class="muted">' + fmtMoney(allTotals[f.id] || 0) + " all time · " + (counts[f.id] || 0) + " spend" + ((counts[f.id] || 0) === 1 ? "" : "s") + "</small></span>" +
        '<button class="icon-btn" data-action="edit-field" data-id="' + esc(f.id) + '" aria-label="Edit ' + esc(f.name) + '" title="Edit">✏️</button>' +
        '<button class="icon-btn danger" data-action="del-field" data-id="' + esc(f.id) + '" aria-label="Delete ' + esc(f.name) + '" title="Delete">🗑</button></li>';
    });
    return html + "</ul></section>";
  };

  /* ---------- 6. RENDER + NAV ---------- */
  var pageName = document.body.getAttribute("data-page");

  function renderNav() {
    var top = document.getElementById("topbar");
    if (!top) return;
    var links = [["home", "index.html", "Home"], ["daily", "daily.html", "Daily Spends"], ["monthly", "monthly.html", "Monthly Total"], ["fields", "fields.html", "Expense Fields"]];
    top.innerHTML = '<div class="top-inner"><a class="brand" href="index.html">💰 Spend Tracker</a>' +
      '<button class="btn btn-light" data-action="add">+ Add Expense</button></div>' +
      '<nav class="nav" aria-label="Pages">' +
      links.map(function (l) { return '<a href="' + l[1] + '"' + (l[0] === pageName ? ' class="active" aria-current="page"' : "") + ">" + l[2] + "</a>"; }).join("") + "</nav>";
  }
  function render() {
    var main = document.getElementById("main");
    if (main && pages[pageName]) main.innerHTML = pages[pageName]();
  }

  /* ---------- 7. EVENTS ---------- */
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  document.addEventListener("change", function (e) {
    if (e.target.id === "monthPick") {
      state.dailyMonth = e.target.value || monthKey(new Date());
      render();
    }
  });

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");
    var id = el.getAttribute("data-id");

    if (action === "add") openAddExpense();
    else if (action === "close") closeModal();
    else if (action === "sample") {
      expenses = buildSample().concat(expenses);
      save(); render();
    } else if (action === "del") {
      var ex = expenses.filter(function (x) { return x.id === id; })[0];
      if (ex && window.confirm("Delete this spend?\n" + fmtMoney(ex.amount) + " · " + fmtShort(ex.date))) {
        expenses = expenses.filter(function (x) { return x.id !== id; });
        save(); render();
      }
    } else if (action === "pick-month") {
      state.monthlySel = el.getAttribute("data-month");
      render();
    } else if (action === "goto-daily") {
      try { sessionStorage.setItem("spend.dailyMonth", el.getAttribute("data-month")); } catch (err) { /* ignore */ }
    } else if (action === "edit-field") {
      var f = fieldById(id);
      openModal("Edit Field",
        '<form id="editFieldForm" data-id="' + esc(id) + '" novalidate><label>Name<input id="eName" type="text" maxlength="24" value="' + esc(f.name) + '"></label>' +
        '<label>Colour<input id="eColor" type="color" class="color-input" value="' + esc(f.color) + '"></label><span class="err" data-for="name"></span>' +
        '<div class="row end"><button type="button" class="btn btn-ghost" data-action="close">Cancel</button><button type="submit" class="btn">Save changes</button></div></form>');
    } else if (action === "del-field") {
      var fld = fieldById(id);
      if (fields.length <= 1) { window.alert("You need at least one field of expense."); return; }
      var used = expenses.filter(function (x) { return x.field === id; }).length;
      if (used === 0) {
        if (window.confirm('Delete the field "' + fld.name + '"?')) {
          fields = fields.filter(function (x) { return x.id !== id; });
          save(); render();
        }
      } else {
        var opts = fields.filter(function (x) { return x.id !== id; })
          .map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + "</option>"; }).join("");
        openModal("Delete field",
          '<form id="reassignForm" data-id="' + esc(id) + '"><p class="muted"><b>' + esc(fld.name) + "</b> has " + used + " spend" + (used === 1 ? "" : "s") + ". Choose a field to move them to before deleting.</p>" +
          '<label>Move spends to<select id="moveTo">' + opts + "</select></label>" +
          '<div class="row end"><button type="button" class="btn btn-ghost" data-action="close">Cancel</button><button type="submit" class="btn btn-danger">Move and delete</button></div></form>');
      }
    }
  });

  document.addEventListener("submit", function (e) {
    var form = e.target;
    e.preventDefault();

    if (form.id === "addForm") {
      var amount = parseFloat(form.querySelector("#fAmount").value);
      var field = form.querySelector("#fField").value;
      var date = form.querySelector("#fDate").value;
      var note = form.querySelector("#fNote").value.trim();
      setErr(form, "amount", amount > 0 ? "" : "Enter an amount greater than 0");
      setErr(form, "field", field ? "" : "Please choose a field of expense");
      setErr(form, "date", date ? "" : "Pick a date");
      if (!(amount > 0) || !field || !date) return;
      expenses.unshift({ id: uid(), amount: Math.round(amount * 100) / 100, field: field, date: date, note: note.slice(0, 120) });
      save(); closeModal(); render();
    }

    if (form.id === "addFieldForm") {
      var name = form.querySelector("#newName").value.trim();
      var err = document.getElementById("fieldErr");
      var msg = "";
      if (!name) msg = "Field name is required";
      else if (fields.some(function (f) { return f.name.toLowerCase() === name.toLowerCase(); })) msg = "A field with this name already exists";
      if (msg) { err.textContent = msg; return; }
      fields.push({ id: "f-" + uid(), name: name, color: form.querySelector("#newColor").value });
      save(); render();
    }

    if (form.id === "editFieldForm") {
      var fid = form.getAttribute("data-id");
      var newName = form.querySelector("#eName").value.trim();
      var clash = fields.some(function (f) { return f.id !== fid && f.name.toLowerCase() === newName.toLowerCase(); });
      if (!newName) { setErr(form, "name", "Field name is required"); return; }
      if (clash) { setErr(form, "name", "A field with this name already exists"); return; }
      fields = fields.map(function (f) { return f.id === fid ? { id: f.id, name: newName, color: form.querySelector("#eColor").value } : f; });
      save(); closeModal(); render();
    }

    if (form.id === "reassignForm") {
      var oldId = form.getAttribute("data-id");
      var target = form.querySelector("#moveTo").value;
      expenses = expenses.map(function (x) { return x.field === oldId ? { id: x.id, amount: x.amount, field: target, date: x.date, note: x.note } : x; });
      fields = fields.filter(function (f) { return f.id !== oldId; });
      save(); closeModal(); render();
    }
  });

  /* ---------- 8. START ---------- */
  try {
    var jump = sessionStorage.getItem("spend.dailyMonth");
    if (jump && pageName === "daily") state.dailyMonth = jump;
    sessionStorage.removeItem("spend.dailyMonth");
  } catch (err) { /* ignore */ }

  renderNav();
  render();
})();
