/* Gridlet — daily mini crossword. No ads, no IAP, works offline. */
(function () {
  'use strict';

  // ---------- storage (Safari private mode safe) ----------
  var store = {
    get: function (k, d) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  var KEY_PROGRESS = 'gridlet:progress:v1', KEY_THEME = 'gridlet:theme', KEY_SEEN = 'gridlet:seenHelp';

  var PUZZLES = window.GRIDLET_PUZZLES || [];
  var EPOCH = { y: 2026, m: 10, d: 1 }; // Nov 1, 2026 = Gridlet #1 (local time)
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // ---------- dates ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function keyOf(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
  function parseKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayKey() { return keyOf(new Date()); }
  function dayIndex(k) {
    var p = k.split('-');
    return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(EPOCH.y, EPOCH.m, EPOCH.d)) / 864e5);
  }
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
  function puzzleFor(k) {
    var i = dayIndex(k), n = PUZZLES.length;
    return PUZZLES[((i % n) + n) % n];
  }
  function niceDate(k, long) {
    var d = parseKey(k);
    return long ? DOW[d.getDay()] + 'day, ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
                : DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate();
  }
  function fmt(ms) {
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    return h ? h + ':' + pad(m % 60) + ':' + pad(s % 60) : m + ':' + pad(s % 60);
  }

  // ---------- puzzle model ----------
  function build(p) {
    var cells = [], words = [], n = 0;
    for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) {
      var ch = p.rows[r][c];
      cells.push({ i: r * 5 + c, r: r, c: c, block: ch === '#', ans: ch === '#' ? '' : ch.toUpperCase(), num: 0, a: -1, d: -1 });
    }
    function open(r, c) { return r >= 0 && r < 5 && c >= 0 && c < 5 && !cells[r * 5 + c].block; }
    cells.forEach(function (cell) {
      if (cell.block) return;
      var sa = !open(cell.r, cell.c - 1) && open(cell.r, cell.c + 1);
      var sd = !open(cell.r - 1, cell.c) && open(cell.r + 1, cell.c);
      if (sa || sd) cell.num = ++n;
    });
    var clueMap = { A: {}, D: {} };
    (p.across || []).forEach(function (x) { clueMap.A[x[0]] = x[2]; });
    (p.down || []).forEach(function (x) { clueMap.D[x[0]] = x[2]; });
    ['A', 'D'].forEach(function (dir) {
      cells.forEach(function (cell) {
        if (cell.block || !cell.num) return;
        var dr = dir === 'D' ? 1 : 0, dc = dir === 'A' ? 1 : 0;
        if (open(cell.r - dr, cell.c - dc) || !open(cell.r + dr, cell.c + dc)) return;
        var w = { dir: dir, num: cell.num, cells: [], clue: clueMap[dir][cell.num] || '' };
        var r = cell.r, c = cell.c;
        while (open(r, c)) { w.cells.push(r * 5 + c); r += dr; c += dc; }
        w.ans = w.cells.map(function (i) { return cells[i].ans; }).join('');
        w.id = words.length;
        words.push(w);
        w.cells.forEach(function (i) { cells[i][dir === 'A' ? 'a' : 'd'] = w.id; });
      });
    });
    return { src: p, cells: cells, words: words };
  }

  // ---------- state ----------
  var all = store.get(KEY_PROGRESS, {}) || {};
  var P = null, S = null, curKey = null;
  var sel = { i: 0, dir: 'A' };
  var running = false, lastTick = 0, manualPause = false, fullWarned = false;

  function blankState() { return { g: Array(25).fill(''), t: 0, rev: [], ok: [], bad: [], started: false, solved: false, assisted: false, checked: false }; }
  function save() { all[curKey] = S; store.set(KEY_PROGRESS, all); }

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var board = $('board'), cellEls = [];

  function renderBoard() {
    board.innerHTML = '';
    cellEls = P.cells.map(function (cell) {
      var el = document.createElement('div');
      el.className = 'cell' + (cell.block ? ' block' : '');
      el.style.setProperty('--i', cell.r + cell.c);
      if (!cell.block) {
        el.innerHTML = (cell.num ? '<span class="num">' + cell.num + '</span>' : '') + '<span class="ltr"></span>';
        el.addEventListener('pointerdown', function (e) { e.preventDefault(); tapCell(cell.i); });
      }
      board.appendChild(el);
      return el;
    });
    var al = $('acrossList'), dl = $('downList');
    al.innerHTML = ''; dl.innerHTML = '';
    P.words.forEach(function (w) {
      var li = document.createElement('li');
      li.innerHTML = '<b>' + w.num + '</b><span></span>';
      li.lastChild.textContent = w.clue;
      li.addEventListener('click', function () { if (!S.solved) { selectWord(w, true); } });
      w.li = li;
      (w.dir === 'A' ? al : dl).appendChild(li);
    });
  }

  function word(dir, i) { var id = P.cells[i][dir === 'A' ? 'a' : 'd']; return id >= 0 ? P.words[id] : null; }
  function curWord() { return word(sel.dir, sel.i) || word(sel.dir === 'A' ? 'D' : 'A', sel.i); }
  function locked(i) { return S.rev.indexOf(i) >= 0 || S.ok.indexOf(i) >= 0 || S.solved; }

  function paint(popIdx) {
    var w = curWord(), other = word(sel.dir === 'A' ? 'D' : 'A', sel.i);
    P.cells.forEach(function (cell, i) {
      if (cell.block) return;
      var el = cellEls[i], L = S.g[i];
      el.classList.toggle('sel', !S.solved && i === sel.i);
      el.classList.toggle('word', !S.solved && !!w && w.cells.indexOf(i) >= 0 && i !== sel.i);
      el.classList.toggle('wrong', S.bad.indexOf(i) >= 0);
      el.classList.toggle('checked', S.ok.indexOf(i) >= 0 && S.rev.indexOf(i) < 0);
      el.classList.toggle('revealed', S.rev.indexOf(i) >= 0);
      var lt = el.querySelector('.ltr');
      if (lt.textContent !== L) {
        lt.textContent = L;
        if (i === popIdx && L) { lt.classList.remove('pop'); void lt.offsetWidth; lt.classList.add('pop'); }
      }
    });
    P.words.forEach(function (x) {
      x.li.classList.toggle('active', !S.solved && x === w);
      x.li.classList.toggle('cross', !S.solved && x === other);
      x.li.classList.toggle('done', x.cells.every(function (i) { return S.g[i]; }));
    });
    if (S.solved) {
      $('cbNum').textContent = '';
      $('cbClue').textContent = 'Solved in ' + fmt(S.t) + '. Nice work!';
    } else if (w) {
      $('cbNum').textContent = w.num + (w.dir === 'A' ? 'A' : 'D');
      $('cbClue').textContent = w.clue;
    }
  }

  // ---------- selection & typing ----------
  function tapCell(i) {
    if (S.solved || P.cells[i].block) return;
    ensureRunning();
    if (i === sel.i) toggleDir();
    else { sel.i = i; if (!word(sel.dir, i)) sel.dir = sel.dir === 'A' ? 'D' : 'A'; }
    paint();
  }
  function toggleDir() {
    var nd = sel.dir === 'A' ? 'D' : 'A';
    if (word(nd, sel.i)) sel.dir = nd;
    paint();
  }
  function firstEmpty(w) { for (var k = 0; k < w.cells.length; k++) if (!S.g[w.cells[k]]) return w.cells[k]; return -1; }
  function selectWord(w, preferEmpty) {
    sel.dir = w.dir;
    var e = preferEmpty ? firstEmpty(w) : -1;
    sel.i = e >= 0 ? e : w.cells[0];
    ensureRunning();
    paint();
  }
  function orderedWords() { return P.words.slice(); } // across first, then down (build order)
  function stepWord(delta, needEmpty) {
    var list = orderedWords(), w = curWord(), idx = list.indexOf(w);
    for (var k = 1; k <= list.length; k++) {
      var cand = list[(idx + delta * k + list.length * 2) % list.length];
      if (!needEmpty || firstEmpty(cand) >= 0) { selectWord(cand, true); return true; }
    }
    return false;
  }
  function typeLetter(ch) {
    if (S.solved) return;
    ensureRunning();
    var i = sel.i, w = curWord(), wasFilled = !!S.g[i];
    if (!locked(i)) {
      S.g[i] = ch;
      S.bad = S.bad.filter(function (x) { return x !== i; });
    }
    var pos = w.cells.indexOf(i);
    if (wasFilled) {
      if (pos < w.cells.length - 1) sel.i = w.cells[pos + 1];
    } else {
      var next = -1;
      for (var k = pos + 1; k < w.cells.length; k++) if (!S.g[w.cells[k]]) { next = w.cells[k]; break; }
      if (next < 0) for (k = 0; k < pos; k++) if (!S.g[w.cells[k]]) { next = w.cells[k]; break; }
      if (next >= 0) sel.i = next;
      else if (!stepWord(1, true) && pos < w.cells.length - 1) sel.i = w.cells[pos + 1];
    }
    afterChange(i);
  }
  function backspace() {
    if (S.solved) return;
    ensureRunning();
    var i = sel.i, w = curWord(), pos = w.cells.indexOf(i);
    if (S.g[i] && !locked(i)) { S.g[i] = ''; }
    else {
      if (pos > 0) sel.i = w.cells[pos - 1];
      else { stepWord(-1, false); var pw = curWord(); sel.i = pw.cells[pw.cells.length - 1]; }
      if (!locked(sel.i)) S.g[sel.i] = '';
    }
    S.bad = S.bad.filter(function (x) { return x !== sel.i && x !== i; });
    afterChange(-1);
  }
  function move(dr, dc) {
    if (S.solved) return;
    var dir = dc ? 'A' : 'D';
    if (sel.dir !== dir && word(dir, sel.i)) { sel.dir = dir; paint(); return; }
    var r = P.cells[sel.i].r, c = P.cells[sel.i].c;
    for (var k = 0; k < 5; k++) {
      r += dr; c += dc;
      if (r < 0 || r > 4 || c < 0 || c > 4) return;
      if (!P.cells[r * 5 + c].block) { sel.i = r * 5 + c; if (!word(sel.dir, sel.i)) sel.dir = dir; paint(); return; }
    }
  }
  function afterChange(popIdx) {
    S.started = true;
    paint(popIdx);
    var full = P.cells.every(function (c, i) { return c.block || S.g[i]; });
    if (full) {
      var right = P.cells.every(function (c, i) { return c.block || S.g[i] === c.ans; });
      if (right) { solve(); return; }
      if (!fullWarned) { fullWarned = true; toast('So close! A few squares aren\u2019t right yet.'); shake(); }
    } else fullWarned = false;
    save();
  }
  function shake() { board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake'); }

  // ---------- check / reveal ----------
  function targetCells(scope) {
    if (scope === 'letter') return [sel.i];
    if (scope === 'word') return curWord().cells.slice();
    return P.cells.filter(function (c) { return !c.block; }).map(function (c) { return c.i; });
  }
  function doAction(act) {
    closeMenu();
    if (act === 'clear') {
      if (S.solved) return;
      P.cells.forEach(function (c, i) { if (!locked(i)) S.g[i] = ''; });
      S.bad = []; paint(); save(); return;
    }
    if (S.solved) return;
    ensureRunning();
    var parts = act.split('-'), kind = parts[0], cells = targetCells(parts[1]), wrong = 0;
    cells.forEach(function (i) {
      var ans = P.cells[i].ans;
      if (kind === 'check') {
        S.checked = true;
        if (!S.g[i]) return;
        if (S.g[i] === ans) { if (S.ok.indexOf(i) < 0) S.ok.push(i); }
        else { wrong++; if (S.bad.indexOf(i) < 0) S.bad.push(i); }
      } else {
        if (S.g[i] !== ans) { S.g[i] = ans; if (S.rev.indexOf(i) < 0) S.rev.push(i); S.assisted = true; }
        if (S.ok.indexOf(i) < 0) S.ok.push(i);
        S.bad = S.bad.filter(function (x) { return x !== i; });
      }
    });
    if (kind === 'check') toast(wrong ? wrong + (wrong === 1 ? ' square needs' : ' squares need') + ' another look' : 'Looking good!');
    afterChange(-1);
  }

  // ---------- timer ----------
  function ensureRunning() {
    if (S.solved || running || manualPause || overlayOpen()) return;
    if (!S.started) { S.started = true; save(); }
    running = true; lastTick = Date.now();
  }
  function pauseTimer() { if (running) { S.t += Date.now() - lastTick; running = false; save(); } }
  function tick() {
    if (running) { var now = Date.now(); S.t += now - lastTick; lastTick = now; }
    $('timerText').textContent = fmt(S ? S.t : 0);
    updateCountdown();
  }
  function setManualPause(on) {
    manualPause = on;
    document.body.classList.toggle('paused', on);
    if (on) pauseTimer(); else ensureRunning();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { pauseTimer(); }
    else if (S && S.started && !S.solved && !manualPause && !overlayOpen()) ensureRunning();
  });
  window.addEventListener('pagehide', function () { pauseTimer(); });

  // ---------- solve ----------
  function solve() {
    pauseTimer();
    S.solved = true; S.solvedOn = todayKey(); S.daily = (S.solvedOn === curKey);
    running = false;
    save();
    board.classList.add('solved');
    $('btnTimer').classList.add('done');
    paint();
    updateStreakChip(true);
    chime(); haptic();
    burst();
    setTimeout(showSolved, 1100);
  }
  function showSolved() {
    var st = computeStats();
    $('solvedTime').textContent = fmt(S.t);
    $('solvedHead').textContent = pickCheer();
    $('solvedMsg').textContent = (curKey === todayKey() ? 'Gridlet #' : 'Archive Gridlet #') + (dayIndex(curKey) + 1) + ' \u00b7 ' + niceDate(curKey) +
      (S.assisted ? ' \u00b7 with a little help' : ' \u00b7 no hints!');
    $('sStreak').textContent = st.streak;
    $('sBest').textContent = st.best != null ? fmt(st.best) : '\u2013';
    $('sSolved').textContent = st.solved;
    openOverlay('solvedOverlay');
  }
  function pickCheer() {
    var t = S.t / 1000;
    if (S.assisted) return 'Solved!';
    if (t < 45) return 'Lightning fast!';
    if (t < 90) return 'Brilliant!';
    if (t < 180) return 'Nicely done!';
    return 'You got it!';
  }

  // ---------- stats ----------
  function computeStats() {
    var keys = Object.keys(all), played = 0, solved = 0, times = [], dailySolved = {};
    keys.forEach(function (k) {
      var s = all[k];
      if (!s || !s.started) return;
      played++;
      if (s.solved) { solved++; if (!s.assisted) times.push(s.t); if (s.daily) dailySolved[k] = 1; }
    });
    // current streak: consecutive days solved on their own day, ending today (or yesterday if today not yet solved)
    var t = todayKey(), k = dailySolved[t] ? t : addDays(t, -1), streak = 0;
    while (dailySolved[k]) { streak++; k = addDays(k, -1); }
    var ds = Object.keys(dailySolved).sort(), max = 0, run = 0, prev = null;
    ds.forEach(function (d) { run = (prev && addDays(prev, 1) === d) ? run + 1 : 1; if (run > max) max = run; prev = d; });
    var avg = times.length ? times.reduce(function (a, b) { return a + b; }, 0) / times.length : null;
    var best = times.length ? Math.min.apply(null, times) : null;
    return { played: played, solved: solved, pct: played ? Math.round(solved * 100 / played) : 0, streak: streak, max: Math.max(max, streak), avg: avg, best: best, times: times };
  }
  function renderStats() {
    var st = computeStats();
    $('stPlayed').textContent = st.played; $('stPct').textContent = st.pct; $('stStreak').textContent = st.streak; $('stMax').textContent = st.max;
    $('stAvg').textContent = st.avg != null ? fmt(st.avg) : '\u2013'; $('stBest').textContent = st.best != null ? fmt(st.best) : '\u2013';
    var buckets = [['< 30s', 0, 30], ['30\u201360s', 30, 60], ['1\u20132m', 60, 120], ['2\u20133m', 120, 180], ['3\u20135m', 180, 300], ['5m +', 300, 1e9]];
    var counts = buckets.map(function (b) { return st.times.filter(function (t) { return t / 1000 >= b[1] && t / 1000 < b[2]; }).length; });
    var mx = Math.max.apply(null, counts.concat([1]));
    var mine = S && S.solved && !S.assisted ? S.t / 1000 : -1;
    var d = $('dist'); d.innerHTML = '';
    buckets.forEach(function (b, k) {
      var row = document.createElement('div');
      row.className = 'bar-row' + (mine >= b[1] && mine < b[2] ? ' hi' : '');
      row.innerHTML = '<span class="lbl">' + b[0] + '</span><span class="bar" style="width:0">' + counts[k] + '</span>';
      d.appendChild(row);
      var pct = 8 + 92 * counts[k] / mx;
      requestAnimationFrame(function () { requestAnimationFrame(function () { row.lastChild.style.width = 'calc(' + pct + '% - 60px)'; }); });
    });
  }
  function updateStreakChip(bump) {
    var st = computeStats(), chip = $('streakChip');
    $('streakNum').textContent = st.streak;
    chip.classList.toggle('zero', !st.streak);
    if (bump) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
  }

  // ---------- share ----------
  function shareText() {
    var st = computeStats(), n = dayIndex(curKey) + 1;
    var shape = P.src.rows.map(function (r) { return r.split('').map(function (ch) { return ch === '#' ? '\u2b1b' : '\ud83d\udfe8'; }).join(''); }).join('\n');
    var lines = ['Gridlet #' + n + ' \u00b7 ' + niceDate(curKey), '\u23f1\ufe0f Solved in ' + fmt(S.t) + (S.assisted ? ' (with help)' : S.checked ? '' : ' \u2728 no hints')];
    if (st.streak && S.daily) lines.push('\ud83d\udd25 ' + st.streak + '-day streak');
    lines.push(shape);
    return lines.join('\n');
  }
  function copy(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.fontSize = '16px';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta); return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }
  function share() {
    var text = shareText();
    copy(text).then(function (ok) {
      if (ok) toast('Results copied to clipboard');
      else if (navigator.share) navigator.share({ text: text }).catch(function () {});
      else toast('Could not copy, sorry!');
    });
  }

  // ---------- overlays ----------
  function overlayOpen() { return !!document.querySelector('.overlay.show'); }
  function openOverlay(id) {
    pauseTimer();
    if (id === 'statsOverlay') renderStats();
    if (id === 'archiveOverlay') renderArchive();
    document.querySelectorAll('.overlay.show').forEach(function (o) { o.classList.remove('show'); });
    $(id).classList.add('show');
  }
  function closeOverlays() {
    document.querySelectorAll('.overlay.show').forEach(function (o) { o.classList.remove('show'); });
    if (S && S.started && !S.solved && !manualPause) ensureRunning();
  }
  document.querySelectorAll('.overlay').forEach(function (o) {
    o.addEventListener('click', function (e) {
      if (o.id === 'startOverlay') return;
      if (e.target === o || (e.target.closest && e.target.closest('[data-close]'))) closeOverlays();
    });
  });

  // ---------- archive ----------
  var archMonth = null;
  function renderArchive() {
    var t = parseKey(todayKey());
    if (!archMonth) archMonth = { y: t.getFullYear(), m: t.getMonth() };
    var minY = EPOCH.y, minM = EPOCH.m;
    $('archMonth').textContent = MONTHS[archMonth.m] + ' ' + archMonth.y;
    $('archPrev').disabled = archMonth.y * 12 + archMonth.m <= minY * 12 + minM;
    $('archNext').disabled = archMonth.y * 12 + archMonth.m >= t.getFullYear() * 12 + t.getMonth();
    $('archPrev').style.opacity = $('archPrev').disabled ? .3 : 1; $('archNext').style.opacity = $('archNext').disabled ? .3 : 1;
    var g = $('archGrid'); g.innerHTML = '';
    'SMTWTFS'.split('').forEach(function (d) { var e = document.createElement('div'); e.className = 'dow'; e.textContent = d; g.appendChild(e); });
    var first = new Date(archMonth.y, archMonth.m, 1), days = new Date(archMonth.y, archMonth.m + 1, 0).getDate(), tk = todayKey();
    for (var k = 0; k < first.getDay(); k++) { var off = document.createElement('div'); off.className = 'aday off'; g.appendChild(off); }
    for (var d = 1; d <= days; d++) {
      var key = archMonth.y + '-' + pad(archMonth.m + 1) + '-' + pad(d), b = document.createElement('button');
      b.className = 'aday'; b.textContent = d;
      var s = all[key];
      if (dayIndex(key) < 0) b.classList.add('off');
      else if (key > tk) b.classList.add('future');
      else {
        if (s && s.solved) b.classList.add('solved'); else if (s && s.started) b.classList.add('prog');
        if (key === tk) b.classList.add('today');
        b.title = 'Gridlet #' + (dayIndex(key) + 1);
        (function (kk) { b.addEventListener('click', function () { closeOverlays(); load(kk, true); }); })(key);
      }
      g.appendChild(b);
    }
  }
  $('archPrev').addEventListener('click', function () { archMonth.m--; if (archMonth.m < 0) { archMonth.m = 11; archMonth.y--; } renderArchive(); });
  $('archNext').addEventListener('click', function () { archMonth.m++; if (archMonth.m > 11) { archMonth.m = 0; archMonth.y++; } renderArchive(); });

  // ---------- countdown & rollover ----------
  var loadedDay = todayKey();
  function updateCountdown() {
    var now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var s = Math.max(0, Math.floor((next - now) / 1000));
    var txt = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
    document.querySelectorAll('.countdown').forEach(function (e) { e.textContent = txt; });
    var tk = todayKey();
    if (tk !== loadedDay) {
      var wasToday = curKey === loadedDay;
      loadedDay = tk;
      updateStreakChip();
      if (wasToday && (S.solved || !S.started)) { closeOverlays(); load(tk, false); toast('A fresh Gridlet just dropped!'); }
      else toast('A new Gridlet is ready in the archive');
    }
  }

  // ---------- load ----------
  function load(k, fromArchive) {
    if (S && running) pauseTimer();
    parts = [];
    curKey = k;
    P = build(puzzleFor(k));
    S = all[k] || blankState();
    if (!S.bad) S.bad = [];
    manualPause = false; document.body.classList.remove('paused');
    fullWarned = false;
    board.classList.remove('solved', 'shake');
    $('btnTimer').classList.toggle('done', !!S.solved);
    renderBoard();
    var w0 = P.words[0];
    sel = { i: firstEmpty(w0) >= 0 ? firstEmpty(w0) : w0.cells[0], dir: w0.dir };
    paint();
    if (S.solved) board.classList.add('solved');
    var isToday = k === todayKey();
    $('puzzleTitle').textContent = isToday ? 'Today' : 'Gridlet #' + (dayIndex(k) + 1);
    $('puzzleDate').textContent = niceDate(k);
    $('startDate').textContent = niceDate(k, true) + ' \u00b7 #' + (dayIndex(k) + 1);
    $('btnPlay').textContent = S.started ? 'Continue' : 'Play';
    $('startFoot').textContent = S.started ? 'Paused at ' + fmt(S.t) : (isToday ? 'Your streak is waiting. \ud83d\udd25' : 'Archive puzzle');
    tick();
    if (!S.solved) openOverlay('startOverlay');
    else if (fromArchive) toast('Already solved in ' + fmt(S.t));
  }

  // ---------- keyboard ----------
  var KB = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  function buildKbd() {
    var k = $('kbd');
    KB.forEach(function (row, ri) {
      var r = document.createElement('div'); r.className = 'krow';
      if (ri === 2) r.appendChild(makeKey('\u21c4', 'dir', 'wide', 'Switch direction'));
      row.split('').forEach(function (ch) { r.appendChild(makeKey(ch, ch)); });
      if (ri === 2) r.appendChild(makeKey('<svg viewBox="0 0 24 24"><path d="M9 6h11v12H9l-6-6z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>', 'back', 'wide', 'Backspace'));
      k.appendChild(r);
    });
  }
  function makeKey(label, val, cls, aria) {
    var b = document.createElement('button');
    b.className = 'key' + (cls ? ' ' + cls : ''); b.innerHTML = label; b.dataset.k = val;
    if (aria) b.setAttribute('aria-label', aria);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); b.classList.add('down'); press(val); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { b.classList.remove('down'); }); });
    return b;
  }
  function press(v) {
    if (overlayOpen() || manualPause) return;
    if (v === 'back') backspace();
    else if (v === 'dir') toggleDir();
    else typeLetter(v);
  }
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') { closeMenu(); if (overlayOpen() && !$('startOverlay').classList.contains('show')) closeOverlays(); return; }
    if (overlayOpen()) { if (e.key === 'Enter' && $('startOverlay').classList.contains('show')) { e.preventDefault(); startPlay(); } return; }
    if (manualPause) return;
    var k = e.key;
    if (/^[a-zA-Z]$/.test(k)) { e.preventDefault(); typeLetter(k.toUpperCase()); }
    else if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); backspace(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); move(0, -1); }
    else if (k === 'ArrowRight') { e.preventDefault(); move(0, 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); move(-1, 0); }
    else if (k === 'ArrowDown') { e.preventDefault(); move(1, 0); }
    else if (k === 'Tab') { e.preventDefault(); stepWord(e.shiftKey ? -1 : 1, false); }
    else if (k === 'Enter') { e.preventDefault(); stepWord(1, false); }
    else if (k === ' ') { e.preventDefault(); toggleDir(); }
  });

  // ---------- menus & buttons ----------
  function closeMenu() { $('menuCheck').classList.remove('open'); }
  $('btnCheck').addEventListener('click', function (e) { e.stopPropagation(); $('menuCheck').classList.toggle('open'); });
  $('menuCheck').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) doAction(b.dataset.act); });
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest('.menu-wrap')) closeMenu(); });
  $('cbText').addEventListener('click', function () { if (!S.solved) toggleDir(); });
  $('cbPrev').addEventListener('click', function () { if (!S.solved) stepWord(-1, false); });
  $('cbNext').addEventListener('click', function () { if (!S.solved) stepWord(1, false); });
  $('btnTimer').addEventListener('click', function () { if (!S.solved && S.started) setManualPause(!manualPause); });
  $('btnResume').addEventListener('click', function () { setManualPause(false); });
  $('btnStats').addEventListener('click', function () { openOverlay('statsOverlay'); });
  $('btnArchive').addEventListener('click', function () { archMonth = null; openOverlay('archiveOverlay'); });
  $('btnHelp').addEventListener('click', function () { openOverlay('helpOverlay'); });
  $('btnShare').addEventListener('click', share);
  $('btnSolvedStats').addEventListener('click', function () { openOverlay('statsOverlay'); });
  $('btnSolvedArchive').addEventListener('click', function () { archMonth = null; openOverlay('archiveOverlay'); });
  function startPlay() {
    $('startOverlay').classList.remove('show');
    unlockAudio();
    if (!store.get(KEY_SEEN, false)) { store.set(KEY_SEEN, true); }
    ensureRunning(); paint();
  }
  $('btnPlay').addEventListener('click', startPlay);

  // ---------- theme ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'dark' ? '#0f0d2b' : '#f4f1ff');
  }
  var theme = store.get(KEY_THEME, null);
  if (!theme) { try { theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { theme = 'light'; } }
  applyTheme(theme);
  $('btnTheme').addEventListener('click', function () { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(theme); store.set(KEY_THEME, theme); });

  // ---------- toast ----------
  var toastT = 0;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }

  // ---------- celebration: confetti + chime ----------
  var fx = $('fx'), ctx = fx.getContext('2d'), parts = [], fxOn = false;
  function sizeFx() { var dpr = Math.min(window.devicePixelRatio || 1, 2); fx.width = innerWidth * dpr; fx.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  window.addEventListener('resize', sizeFx); sizeFx();
  var COLORS = ['#ffd166', '#ffb703', '#ff8a5b', '#ef476f', '#6c5ce7', '#00b4d8', '#2fbf71', '#ffffff'];
  function burst() {
    var r = board.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var k = 0; k < 160; k++) {
      var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, g: .18 + Math.random() * .1, s: 5 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, c: COLORS[k % COLORS.length], life: 0, max: 140 + Math.random() * 80, shape: k % 3 });
    }
    for (k = 0; k < 90; k++) {
      parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .5, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, g: .04, s: 6 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, c: COLORS[k % COLORS.length], life: 0, max: 260, shape: k % 3 });
    }
    if (!fxOn) { fxOn = true; requestAnimationFrame(frame); }
  }
  function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(function (p) { return p.life < p.max && p.y < innerHeight + 40; });
    parts.forEach(function (p) {
      p.life++; p.vx *= .99; p.vy = p.vy * .99 + p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.globalAlpha = Math.min(1, (p.max - p.life) / 40); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.shape === 0) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.s / 3, 0, 7); ctx.fill(); }
      else { ctx.beginPath(); for (var j = 0; j < 5; j++) { var an = j * 1.2566 - 1.5708; ctx.lineTo(Math.cos(an) * p.s / 2, Math.sin(an) * p.s / 2); ctx.lineTo(Math.cos(an + .628) * p.s / 5, Math.sin(an + .628) * p.s / 5); } ctx.fill(); }
      ctx.restore();
    });
    if (parts.length) requestAnimationFrame(frame); else { fxOn = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  var actx = null;
  function unlockAudio() { try { if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } if (actx && actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; } }
  function chime() {
    if (!actx) return;
    try {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, k) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + k * .09;
        o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.12, t0 + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + .6);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + .65);
      });
    } catch (e) { /* ignore */ }
  }
  function haptic() { try { if (navigator.vibrate) navigator.vibrate([30, 40, 60]); } catch (e) { /* ignore */ } }

  // ---------- boot ----------
  if (!PUZZLES.length) { document.body.innerHTML = '<p style="padding:20px">Puzzles failed to load.</p>'; return; }
  buildKbd();
  updateStreakChip();
  load(todayKey(), false);
  setInterval(tick, 250);
  // tiny read-only hook for automated tests
  window.Gridlet = { today: todayKey, puzzleFor: puzzleFor, count: PUZZLES.length, state: function () { return S; } };
})();
