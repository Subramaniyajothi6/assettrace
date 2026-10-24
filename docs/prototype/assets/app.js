/* AssetTrace prototype — core: store, lifecycle rules, helpers, router, layout, controls. */
(function () {
  var KEY = "assettrace-proto-v3";
  var AT = window.AT = { routes: [], acts: {}, forms: {}, ui: {}, after: [] };

  /* ---------- store ---------- */
  function load() { try { var raw = localStorage.getItem(KEY); if (raw) { var s = JSON.parse(raw); if (s && s.v === 3) return s; } } catch (e) {} return null; }
  AT.S = load() || window.ATSeed();
  AT.S.session = AT.S.session || { userId: null, skin: "warm", mode: "light" };
  AT.save = function () { try { localStorage.setItem(KEY, JSON.stringify(AT.S)); } catch (e) {} };
  AT.reset = function () { var sess = AT.S.session; AT.S = window.ATSeed(); AT.S.session = sess; AT.save(); AT.toast("Demo data reset"); AT.render(); };

  function by(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  AT.user = function () { return by(AT.S.users, AT.S.session.userId); };
  AT.emp = function (id) { return by(AT.S.employees, id); };
  AT.asset = function (id) { return by(AT.S.assets, id); };
  AT.dept = function (id) { return by(AT.S.departments, id) || { name: "—" }; };
  AT.loc = function (id) { return by(AT.S.locations, id) || { name: "—" }; };
  AT.cat = function (id) { return by(AT.S.categories, id) || { name: "—", code: "OTH" }; };
  AT.vendor = function (id) { return by(AT.S.vendors, id) || { name: "—" }; };
  AT.by = by;
  AT.role = function () { var u = AT.user(); return u ? u.role : null; };
  AT.myEmp = function () { var u = AT.user(); return u ? AT.emp(u.empId) : null; };
  AT.scopeDepts = function () {
    var u = AT.user(); if (!u) return [];
    if (u.role === "ADMIN") return AT.S.departments.map(function (d) { return d.id; });
    if (u.role === "MANAGER") return AT.S.departments.filter(function (d) { return d.managers.indexOf(u.id) >= 0; }).map(function (d) { return d.id; });
    return [];
  };
  AT.inScope = function (a) {
    var u = AT.user(); if (!u || !a) return false;
    if (u.role === "EMPLOYEE") return a.holderId === u.empId;
    return AT.scopeDepts().indexOf(a.deptId) >= 0;
  };
  AT.scopedAssets = function () { return AT.S.assets.filter(AT.inScope); };
  AT.activeAsg = function (assetId) { return AT.S.assignments.filter(function (g) { return g.assetId === assetId && g.active; })[0] || null; };
  AT.next = function (key, pad) { AT.S.seq[key] = (AT.S.seq[key] || 0) + 1; return key + "-" + String(AT.S.seq[key]).padStart(pad || 4, "0"); };
  AT.now = function () { return new Date().toISOString(); };
  AT.hist = function (assetId, event, text) { var u = AT.user(); AT.S.history.unshift({ id: "h" + Date.now() + Math.random(), assetId: assetId, at: AT.now(), event: event, text: text, by: u ? u.name : "System" }); };
  AT.notify = function (userIds, type, title, text, link) {
    [].concat(userIds).filter(Boolean).forEach(function (uid) { AT.S.notifications.unshift({ id: "n" + Date.now() + Math.random(), userId: uid, type: type, title: title, text: text, link: link, at: AT.now(), read: false }); });
  };
  AT.userOfEmp = function (empId) { var u = AT.S.users.filter(function (x) { return x.empId === empId; })[0]; return u ? u.id : null; };
  AT.managersOf = function (asset) { var d = AT.dept(asset.deptId); var ids = (d.managers || []).slice(); AT.S.users.forEach(function (u) { if (u.role === "ADMIN" && ids.indexOf(u.id) < 0) ids.push(u.id); }); return ids; };

  /* lifecycle: allowed status changes (mirrors docs/ARCHITECTURE.md §4) */
  AT.TRANSITIONS = {
    AVAILABLE: ["ASSIGNED", "RESERVED", "UNDER_MAINTENANCE", "LOST", "DAMAGED", "RETIRED"],
    RESERVED: ["ASSIGNED", "AVAILABLE"],
    ASSIGNED: ["ASSIGNED", "UNDER_MAINTENANCE", "RETURNED", "LOST", "DAMAGED"],
    UNDER_MAINTENANCE: ["AVAILABLE", "ASSIGNED", "DAMAGED", "RETIRED"],
    RETURNED: ["AVAILABLE", "UNDER_MAINTENANCE", "DAMAGED", "RETIRED"],
    DAMAGED: ["UNDER_MAINTENANCE", "RETIRED"],
    LOST: ["AVAILABLE", "RETIRED"],
    RETIRED: []
  };
  AT.setStatus = function (a, to, why) {
    if (a.status === to) return true;
    if ((AT.TRANSITIONS[a.status] || []).indexOf(to) < 0) { AT.toast("Can't change " + AT.label(a.status) + " → " + AT.label(to) + (why ? ": " + why : ""), true); return false; }
    var from = a.status; a.status = to; AT.hist(a.id, "STATUS_CHANGED", AT.label(from) + " → " + AT.label(to)); return true;
  };

  /* ---------- formatting ---------- */
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  AT.date = function (iso) { if (!iso) return "—"; var d = new Date(iso); return String(d.getDate()).padStart(2, "0") + " " + MON[d.getMonth()] + " " + d.getFullYear(); };
  AT.time = function (iso) { var d = new Date(iso); var h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0"); return ((h % 12) || 12) + ":" + m + " " + (h < 12 ? "AM" : "PM"); };
  AT.dt = function (iso) { return iso ? AT.date(iso) + ", " + AT.time(iso) : "—"; };
  AT.ago = function (iso) {
    if (!iso) return "—"; var days = Math.round((startOf(new Date()) - startOf(new Date(iso))) / 864e5);
    if (days === 0) return "Today, " + AT.time(iso); if (days === 1) return "Yesterday"; if (days > 1 && days < 7) return days + " days ago"; return AT.date(iso);
  };
  function startOf(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
  AT.daysUntil = function (iso) { return Math.round((startOf(new Date(iso)) - startOf(new Date())) / 864e5); };
  AT.rupee = function (n) { return "₹" + Math.round(n || 0).toLocaleString("en-IN"); };
  AT.short = function (n) { return n >= 1e7 ? "₹" + (n / 1e7).toFixed(2) + " Cr" : n >= 1e5 ? "₹" + (n / 1e5).toFixed(1) + " L" : AT.rupee(n); };
  AT.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var LABELS = { AVAILABLE: "Available", ASSIGNED: "Assigned", UNDER_MAINTENANCE: "Under maintenance", RESERVED: "Reserved", LOST: "Lost", DAMAGED: "Damaged", RETURNED: "Returned", RETIRED: "Retired",
    NEW: "New", GOOD: "Good", FAIR: "Fair", POOR: "Poor", PENDING: "Pending", CONFIRMED: "Signed", DISPUTED: "Disputed",
    REQUESTED: "Requested", APPROVED: "Approved", REJECTED: "Rejected", COMPLETED: "Completed", CANCELLED: "Cancelled", IN_PROGRESS: "In progress", SCHEDULED: "Scheduled",
    REPORTED: "Reported", UNDER_REVIEW: "Under review", MAINTENANCE: "Maintenance", RESOLVED: "Resolved", CLOSED: "Closed", RECEIVED: "Awaiting inspection", INSPECTED: "Inspected",
    HARDWARE: "Hardware", SOFTWARE: "Software", PHYSICAL_DAMAGE: "Physical damage", PERFORMANCE: "Performance", BATTERY: "Battery", NETWORK: "Network", OTHER: "Other",
    LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical", URGENT: "Urgent", ISSUE: "Issue", REPLACEMENT: "Replacement", RETURN: "Return", NEW_ASSET: "New asset",
    REPAIR: "Repair", PREVENTIVE: "Preventive", UPGRADE: "Upgrade", WARRANTY_CLAIM: "Warranty claim", ADMIN: "Admin", MANAGER: "Manager", EMPLOYEE: "Employee" };
  AT.label = function (k) { return LABELS[k] || k; };
  var TONE = { PENDING: "wait", CONFIRMED: "ok", DISPUTED: "bad", REQUESTED: "wait", APPROVED: "info", REJECTED: "bad", COMPLETED: "ok", CANCELLED: "mute", IN_PROGRESS: "info", SCHEDULED: "wait",
    REPORTED: "wait", UNDER_REVIEW: "vio", MAINTENANCE: "info", RESOLVED: "ok", CLOSED: "mute", RECEIVED: "info", INSPECTED: "mute" };
  AT.pill = function (k, text) { var cls = LABELS[k] && /^[A-Z_]+$/.test(k) && !TONE[k] ? "s-" + k : "s-" + (TONE[k] || "mute"); return '<span class="pill ' + cls + '">' + AT.esc(text || AT.label(k)) + "</span>"; };
  AT.initials = function (name) { return String(name || "?").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); };
  var AVC = ["#DDE6F4", "#DCEFE2", "#F6D3E3", "#FBEBD2", "#EDE7F6", "#E3EBF7", "#CFE3DF"];
  AT.av = function (name, sm) { var c = AVC[(name || "").length % AVC.length]; return '<span class="av' + (sm ? " sm" : "") + '" style="background:' + c + ';color:#141414">' + AT.initials(name) + "</span>"; };

  /* ---------- icons ---------- */
  var IC = {
    dash: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z", laptop: "M4 5h16v11H4zM2 19h20", plus: "M12 5v14M5 12h14", qr: "M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M7 12h10",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4", warn: "M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    out: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10", bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0", moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
    sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    user: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21c.6-3.5 3-5.5 6-5.5s5.4 2 6 5.5", ok: "M5 12l5 5 9-10", trf: "M4 8h15l-3-3M20 16H5l3 3",
    fix: "M15 4a5 5 0 0 0-4.6 6.9L4 17.3V20h2.7l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3z", ret: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
    shield: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z", mon: "M3 4h18v12H3zM8 20h8M12 16v4", phone: "M7 2h10v20H7zM11 18h2", head: "M3 14v-2a9 9 0 0 1 18 0v2M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z",
    box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10", home: "M3 11l9-7 9 7v9H3z", clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", chart: "M5 20V10M12 20V4M19 20v-7",
    sign: "M3 17c3-4 5-4 7 0s4 4 7 0 3-3 4-2", gear: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4", lock: "M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3", back: "M15 6l-6 6 6 6",
    users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21c.6-3.5 3-5.5 6-5.5s5.4 2 6 5.5M16 4.5a3.5 3.5 0 0 1 0 7"
  };
  AT.ic = function (k, s) { return '<svg width="' + (s || 19) + '" height="' + (s || 19) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (IC[k] || k) + '"></path></svg>'; };
  AT.catIcon = function (code) { return { LAP: "laptop", DES: "laptop", MON: "mon", MOB: "phone", TAB: "phone", HEA: "head" }[code] || "box"; };

  /* ---------- toast ---------- */
  AT.toast = function (msg, bad) {
    var box = document.getElementById("toasts"); if (!box) return;
    var t = document.createElement("div"); t.className = "toast" + (bad ? " bad" : ""); t.setAttribute("role", "status"); t.textContent = msg; box.appendChild(t);
    setTimeout(function () { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 400); }, 3200);
  };

  /* ---------- router ---------- */
  AT.route = function (pattern, roles, fn, opts) { AT.routes.push({ re: new RegExp("^" + pattern.replace(/:(\w+)/g, "([^/]+)") + "$"), keys: (pattern.match(/:(\w+)/g) || []).map(function (k) { return k.slice(1); }), roles: roles, fn: fn, opts: opts || {} }); };
  AT.go = function (hash) { if (location.hash === hash) AT.render(); else location.hash = hash; };
  AT.home = function () { var r = AT.role(); return r === "EMPLOYEE" ? "#/home" : r ? "#/dashboard" : "#/login"; };
  AT.parse = function () { var h = (location.hash || "").replace(/^#/, "") || "/"; var q = {}; var i = h.indexOf("?"); if (i >= 0) { h.slice(i + 1).split("&").forEach(function (p) { var kv = p.split("="); q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ""); }); h = h.slice(0, i); } return { path: h, q: q }; };

  AT.render = function () {
    var p = AT.parse(), u = AT.user();
    document.documentElement.setAttribute("data-skin", AT.S.session.skin);
    document.documentElement.setAttribute("data-mode", AT.S.session.mode);
    document.body.classList.toggle("emp", AT.role() === "EMPLOYEE");
    if (p.path === "/" || p.path === "") { location.replace(u ? AT.home() : "#/login"); return; }
    var match = null, params = {};
    for (var i = 0; i < AT.routes.length; i++) { var m = AT.routes[i].re.exec(p.path); if (m) { match = AT.routes[i]; match.keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); }); break; } }
    var app = document.getElementById("app"), html;
    if (!match) html = AT.layout(AT.notFound(), "");
    else if (match.roles && !u) { location.replace("#/login?next=" + encodeURIComponent(p.path)); return; }
    else if (match.roles && match.roles.indexOf(u.role) < 0) html = AT.layout(AT.denied(), "");
    else { var out = match.fn(params, p.q); html = match.opts.bare ? out : AT.layout(out, match.opts.nav || ""); }
    app.innerHTML = html;
    document.title = (match && match.opts.title ? match.opts.title + " · " : "") + "AssetTrace";
    var fns = AT.after; AT.after = []; fns.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
    window.scrollTo(0, 0);
    AT.renderCtl();
  };
  AT.rerender = function () {
    var y = window.scrollY, keep = {}, focus = document.activeElement && document.activeElement.id;
    document.querySelectorAll("#app input[id], #app textarea[id], #app select[id]").forEach(function (el) { if (el.type !== "file" && el.type !== "hidden" && el.type !== "checkbox") keep[el.id] = el.value; else if (el.type === "checkbox") keep[el.id] = el.checked; });
    AT.render();
    Object.keys(keep).forEach(function (id) { var el = document.getElementById(id); if (!el || el.dataset.change) return; if (el.type === "checkbox") el.checked = keep[id]; else el.value = keep[id]; });
    if (focus) { var f = document.getElementById(focus); if (f && f.focus) f.focus({ preventScroll: true }); }
    window.scrollTo(0, y);
  };

  AT.notFound = function () { return '<div class="card pad empty view"><b>Page not found</b><span>That link doesn\'t lead anywhere in AssetTrace.</span><a class="btn pri" href="' + AT.home() + '">Go home</a></div>'; };
  AT.denied = function () { return '<div class="card pad empty view">' + AT.ic("lock", 34) + '<b>You don\'t have access to this page</b><span>Your role can\'t open it. Switch role from the Prototype controls to explore it.</span><a class="btn pri" href="' + AT.home() + '">Back to my home</a></div>'; };

  /* ---------- layout ---------- */
  var NAV = {
    MANAGER: [["Dashboard", "#/dashboard", "dashboard"], ["Assets", "#/assets", "assets"], ["Assignments", "#/assignments", "assignments"], ["Transfers", "#/transfers", "transfers"], ["Requests", "#/requests", "requests"], ["Maintenance", "#/maintenance", "maintenance"], ["Returns", "#/returns", "returns"], ["Reports", "#/reports", "reports"]],
    ADMIN: [["Dashboard", "#/dashboard", "dashboard"], ["Assets", "#/assets", "assets"], ["Employees", "#/employees", "employees"], ["Requests", "#/requests", "requests"], ["Reports", "#/reports", "reports"], ["Users", "#/admin/users", "users"], ["Master data", "#/admin/master", "master"], ["Settings", "#/admin/settings", "settings"]],
    EMPLOYEE: [["Home", "#/home", "home"], ["My assets", "#/my-assets", "myassets"], ["Report issue", "#/report-issue", "report"], ["My requests", "#/my-requests", "myrequests"], ["History", "#/my-history", "history"]]
  };
  function counts() {
    var A = AT.scopedAssets(), ids = A.map(function (a) { return a.id; });
    var inA = function (x) { return ids.indexOf(x.assetId) >= 0; };
    var me = AT.myEmp();
    return {
      assignments: AT.S.assignments.filter(function (g) { return g.active && g.handover !== "CONFIRMED" && inA(g); }).length,
      transfers: AT.S.transfers.filter(function (t) { return t.status === "REQUESTED" && inA(t); }).length,
      requests: AT.S.requests.filter(function (r) { return (r.status === "PENDING" || r.status === "IN_PROGRESS") && (AT.role() === "ADMIN" || !r.assetId || ids.indexOf(r.assetId) >= 0 || AT.scopeDepts().indexOf((AT.emp(r.empId) || {}).deptId) >= 0); }).length,
      maintenance: AT.S.maintenance.filter(function (m) { return m.status !== "COMPLETED" && m.status !== "CANCELLED" && inA(m); }).length,
      returns: AT.S.returns.filter(function (r) { return (r.status === "REQUESTED" || r.status === "RECEIVED") && inA(r); }).length,
      myassets: me ? AT.S.assignments.filter(function (g) { return g.active && g.empId === me.id && g.handover === "PENDING"; }).length : 0
    };
  }
  AT.counts = counts;
  AT.layout = function (content, active) {
    var u = AT.user(); if (!u) return '<div class="page bare">' + content + "</div>";
    var c = counts(), unread = AT.S.notifications.filter(function (n) { return n.userId === u.id && !n.read; }).length;
    var nav = NAV[u.role].map(function (n) { var k = c[n[2]]; return '<a href="' + n[1] + '"' + (n[2] === active ? ' aria-current="page"' : "") + ">" + n[0] + (k ? ' <span class="badge">' + k + "</span>" : "") + "</a>"; }).join("");
    var emp = u.role === "EMPLOYEE";
    var rail = emp
      ? [["Scan QR code", "#/scan", "qr"], ["Report issue", "#/report-issue", "warn"], ["New request", "#/my-requests?new=1", "plus"], ["Notifications", "#/notifications", "bell"]]
      : [["Search assets", "#/assets", "search"], ["Register asset", "#/assets/new", "plus"], ["Scan QR code", "#/scan", "qr"], ["Issues", "#/issues", "warn"]];
    var dark = AT.S.session.mode === "dark", canDark = ["warm", "corporate", "nordic"].indexOf(AT.S.session.skin) >= 0;
    var railHtml = rail.map(function (r) { return '<a href="' + r[1] + '" data-tip="' + r[0] + '" aria-label="' + r[0] + '">' + AT.ic(r[2]) + "</a>"; }).join("") + "<hr>" +
      (canDark ? '<button type="button" data-act="mode" data-tip="' + (dark ? "Light theme" : "Dark theme") + '" aria-label="' + (dark ? "Light theme" : "Dark theme") + '">' + AT.ic(dark ? "sun" : "moon") + "</button>" : "") +
      '<a href="#/logout" data-tip="Sign out" aria-label="Sign out">' + AT.ic("out") + "</a>";
    var e = AT.emp(u.empId);
    var sub = u.role === "MANAGER" ? AT.S.settings.orgName + " · " + AT.scopeDepts().map(function (id) { return AT.dept(id).name; }).join(", ") : u.role === "ADMIN" ? AT.S.settings.orgName + " · all departments" : AT.S.settings.orgName + " · " + (e ? AT.dept(e.deptId).name : "");
    var mnav = emp ? '<nav class="mnav" aria-label="Main">' + [["Home", "#/home", "home", "home"], ["My assets", "#/my-assets", "laptop", "myassets"], ["Scan QR", "#/scan", "qr", "scan"], ["My requests", "#/my-requests", "plus", "myrequests"], ["History", "#/my-history", "clock", "history"]].map(function (t) { return '<a href="' + t[1] + '" aria-label="' + t[0] + '"' + (t[3] === active ? ' aria-current="page"' : "") + ">" + AT.ic(t[2], 20) + "</a>"; }).join("") + "</nav>" : "";
    return '<nav class="rail" aria-label="Quick actions">' + railHtml + "</nav>" +
      '<div class="page"><header class="top rise">' +
      '<a class="brand" href="' + AT.home() + '"><span class="logo">' + AT.ic("M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18", 22) + "</span><span><b>AssetTrace</b><small>" + AT.esc(sub) + "</small></span></a>" +
      '<nav class="nav" aria-label="Main">' + nav + "</nav>" +
      '<div class="tright"><a class="iconbtn" href="#/notifications" aria-label="Notifications, ' + unread + ' unread">' + AT.ic("bell") + (unread ? '<span class="dot"></span>' : "") + "</a>" +
      '<a class="me" href="#/profile" aria-label="Profile">' + AT.av(u.name) + "<span>" + AT.esc(u.name) + "<small>" + AT.label(u.role) + "</small></span></a></div>" +
      '</header><main class="view" style="display:flex;flex-direction:column;gap:20px">' + content + "</main></div>" + mnav;
  };

  /* ---------- prototype controls (style switcher) ---------- */
  AT.SKINS = [
    ["warm", "Warm pill", ["#F2F1EE", "#141414", "#C3D5F0"]], ["corporate", "Corporate", ["#F4F6F9", "#0F172A", "#1D4ED8"]],
    ["ledger", "Ledger", ["#F6F1E7", "#1B1A17", "#8C2F2B"]], ["midnight", "Midnight ops", ["#0B1020", "#121933", "#5EEAD4"]],
    ["bento", "Bento", ["#E5DDF7", "#D6F0E0", "#FCE1CF"]], ["swiss", "Swiss", ["#FFFFFF", "#000000", "#D81E14"]],
    ["brutal", "Neo-brutal", ["#FFE45C", "#111111", "#6CB8FF"]], ["nordic", "Nordic calm", ["#EEF2EE", "#2F5D4E", "#DCEADF"]]
  ];
  AT.ctlOpen = false;
  AT.renderCtl = function () {
    var box = document.getElementById("ctl"); if (!box) return;
    var s = AT.S.session, cur = AT.SKINS.filter(function (k) { return k[0] === s.skin; })[0] || AT.SKINS[0];
    var u = AT.user();
    var html = '<button type="button" data-act="ctl" aria-expanded="' + AT.ctlOpen + '"><span class="sw" style="background:' + cur[2][1] + '"></span>Style: ' + cur[1] + "</button>";
    if (AT.ctlOpen) {
      html += '<div class="ctlp" role="dialog" aria-label="Prototype controls"><h3>DESIGN STYLE</h3><div class="skins">' +
        AT.SKINS.map(function (k) { return '<button type="button" class="skin" data-act="skin" data-v="' + k[0] + '" aria-pressed="' + (k[0] === s.skin) + '"><span>' + k[2].map(function (c) { return '<i style="background:' + c + ';border:1px solid #0001"></i>'; }).join("") + "</span>" + k[1] + "</button>"; }).join("") + "</div>" +
        (["warm", "corporate", "nordic"].indexOf(s.skin) >= 0 ? '<h3>MODE</h3><div class="modes"><button type="button" data-act="mode" data-v="light" aria-pressed="' + (s.mode === "light") + '">Light</button><button type="button" data-act="mode" data-v="dark" aria-pressed="' + (s.mode === "dark") + '">Dark</button></div>' : "") +
        '<h3>VIEW AS</h3><div class="roles">' + [["u-admin", "Admin"], ["u-mgr", "Manager"], ["u-emp", "Employee"]].map(function (r) { return '<button type="button" data-act="as" data-v="' + r[0] + '" aria-pressed="' + (u && u.id === r[0]) + '">' + r[1] + "</button>"; }).join("") + "</div>" +
        "<small>Everything you click changes the demo data and is saved in this browser.</small>" +
        '<button type="button" class="reset" data-act="reset">Reset demo data</button></div>';
    }
    box.innerHTML = html;
  };

  /* ---------- global actions ---------- */
  AT.acts.ctl = function () { AT.ctlOpen = !AT.ctlOpen; AT.renderCtl(); };
  AT.acts.skin = function (el) { AT.S.session.skin = el.dataset.v; if (["warm", "corporate", "nordic"].indexOf(el.dataset.v) < 0) AT.S.session.mode = "light"; AT.save(); document.documentElement.setAttribute("data-skin", el.dataset.v); document.documentElement.setAttribute("data-mode", AT.S.session.mode); AT.renderCtl(); };
  AT.acts.mode = function (el) { AT.S.session.mode = el.dataset.v || (AT.S.session.mode === "dark" ? "light" : "dark"); AT.save(); AT.rerender(); };
  AT.acts.as = function (el) { AT.S.session.userId = el.dataset.v; AT.save(); AT.ctlOpen = false; AT.toast("Viewing as " + AT.user().name + " (" + AT.label(AT.role()) + ")"); location.hash = AT.home(); AT.render(); };
  AT.acts.reset = function () { AT.ctlOpen = false; AT.reset(); };

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (el && AT.acts[el.dataset.act]) { e.preventDefault(); AT.acts[el.dataset.act](el, e); return; }
    if (AT.ctlOpen && !e.target.closest("#ctl")) { AT.ctlOpen = false; AT.renderCtl(); }
  });
  document.addEventListener("submit", function (e) {
    var f = e.target.closest("form[data-form]"); if (!f) return; e.preventDefault();
    var fd = {}; new FormData(f).forEach(function (v, k) { if (fd[k] !== undefined) fd[k] = [].concat(fd[k], v); else fd[k] = v; });
    if (e.submitter && e.submitter.name) fd[e.submitter.name] = e.submitter.value;
    var fn = AT.forms[f.dataset.form]; if (fn) fn(fd, f);
  });
  document.addEventListener("input", function (e) { var el = e.target.closest("[data-live]"); if (el && AT.acts[el.dataset.live]) AT.acts[el.dataset.live](el, e); });
  document.addEventListener("change", function (e) { var el = e.target.closest("[data-change]"); if (el && AT.acts[el.dataset.change]) AT.acts[el.dataset.change](el, e); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && AT.ctlOpen) { AT.ctlOpen = false; AT.renderCtl(); } });
  window.addEventListener("hashchange", AT.render);
  window.addEventListener("DOMContentLoaded", AT.render);
})();
