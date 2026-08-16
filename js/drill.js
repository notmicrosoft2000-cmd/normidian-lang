/* Normidian drills — four-choice quiz against the live dictionary. */

(function () {
  var wrap = document.getElementById("drill");
  if (!wrap || !window.normidianSearch) return;

  var POOL = window.normidianSearch("").filter(function (r) { return r.meaning; });

  var modeBtnRoot = document.getElementById("dmodeRoot");
  var modeBtnEn = document.getElementById("dmodeEn");
  var promptEl = document.getElementById("drillPrompt");
  var wordEl = document.getElementById("drillWord");
  var catEl = document.getElementById("drillCat");
  var optsEl = document.getElementById("drillOpts");
  var scoreEl = document.getElementById("dScore");
  var bestEl = document.getElementById("dBest");

  var mode = "root"; /* "root" = root → meaning, "en" = meaning → root */
  var score = 0;
  var best = 0;
  var streak = 0;
  var current = null;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickOptions(correct, transform) {
    var seen = {};
    var opts = [];
    var guard = 0;
    while (opts.length < 4 && guard++ < 500) {
      var c = POOL[Math.floor(Math.random() * POOL.length)];
      var t = transform(c);
      if (!seen[t]) {
        seen[t] = 1;
        opts.push(c);
      }
    }
    if (opts.indexOf(correct) === -1) opts[opts.length - 1] = correct;
    return shuffle(opts);
  }

  function nextQ() {
    current = POOL[Math.floor(Math.random() * POOL.length)];
    var label = (window.NORMIDIAN_CAT_LABEL || {})[current.cat] || current.cat;
    var opts;
    if (mode === "root") {
      promptEl.textContent = "WHICH MEANING FITS THIS ROOT?";
      wordEl.textContent = current.root;
      opts = pickOptions(current, function (c) { return c.meaning; });
    } else {
      promptEl.textContent = "WHICH ROOT MEANS THIS?";
      wordEl.textContent = current.en;
      opts = pickOptions(current, function (c) { return c.root; });
    }
    catEl.textContent = label;
    wordEl.classList.remove("flash");
    void wordEl.offsetWidth;
    wordEl.classList.add("flash");
    optsEl.innerHTML = "";
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "qopt";
      b.textContent = mode === "root" ? o.meaning : o.root;
      b.addEventListener("click", function () { answer(o, b); });
      optsEl.appendChild(b);
    });
  }

  function answer(chosen, btn) {
    if (!current || current._done) return;
    current._done = true;
    var right = (mode === "root" ? chosen.meaning : chosen.root) === (mode === "root" ? current.meaning : current.root);
    if (right) {
      score++;
      streak++;
      if (streak > best) best = streak;
      btn.classList.add("right");
    } else {
      streak = 0;
      btn.classList.add("wrong");
      var target = mode === "root" ? current.meaning : current.root;
      Array.prototype.forEach.call(optsEl.querySelectorAll(".qopt"), function (b) {
        if (b.textContent === target) b.classList.add("right");
      });
    }
    if (scoreEl) scoreEl.textContent = score;
    if (bestEl) bestEl.textContent = best;
    setTimeout(nextQ, right ? 750 : 1500);
  }

  function setMode(m) {
    mode = m;
    modeBtnRoot.classList.toggle("active", m === "root");
    modeBtnEn.classList.toggle("active", m === "en");
    nextQ();
  }

  if (modeBtnRoot) modeBtnRoot.addEventListener("click", function () { setMode("root"); });
  if (modeBtnEn) modeBtnEn.addEventListener("click", function () { setMode("en"); });

  nextQ();
})();
