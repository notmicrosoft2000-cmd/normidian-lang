(function () {
  var inp = document.getElementById("demoIn");
  var out = document.getElementById("demoOut");
  var dirLabel = document.getElementById("dirLabel");
  var swapBtn = document.getElementById("swapDir");
  var copyBtn = document.getElementById("copyOut");
  var speakBtn = document.getElementById("speakOut");
  var statEl = document.getElementById("tStat");
  var dictInput = document.getElementById("dictSearch");
  var dictList = document.getElementById("dictList");
  var dictCount = document.getElementById("dictCount");

  var MODE = "toNormidian"; /* or "toEnglish" */

  var SPANS = {
    noun: "noun", verb: "verb", adj: "adj", prep: "prep",
    adv: "adv", conj: "conj", pron: "pron", unk: "unk"
  };

  var EN_EXAMPLE = "the king sees the wolf quickly and the wolf never sleeps";
  var NM_EXAMPLE = "ðse cyniðg ġeseohƿues ðse wulf hræðe ond ðse wulf næfre slæpƿues";

  function fmtDir() {
    return MODE === "toNormidian" ? "ENGLISH\u00a0\u2192\u00a0NORMI\u00a0DIAN" : "NORMI\u00a0DIAN\u00a0\u2192\u00a0ENGLISH";
  }

  function render() {
    var res = MODE === "toNormidian"
      ? window.normidianTranslate(inp.value)
      : window.normidianTranslateRev(inp.value);
    if (!res.length) {
      out.innerHTML = '<span class="dim">þ your words will gather here</span>';
      if (statEl) statEl.textContent = "";
      return;
    }
    out.innerHTML = "";
    var known = 0;
    for (var i = 0; i < res.length; i++) {
      var s = document.createElement("span");
      var cls = SPANS[res[i].span] || "unk";
      s.className = cls + " w";
      s.style.setProperty("--i", String(i));
      s.textContent = res[i].root;
      if (res[i].tip) s.title = res[i].tip;
      if (cls !== "unk") known++;
      out.appendChild(s);
      out.appendChild(document.createTextNode(" "));
    }
    if (statEl) {
      var unk = res.length - known;
      statEl.textContent = res.length + " words \u00b7 " + known + " known \u00b7 " + unk + " waiting in [brackets]";
    }
  }

  function setMode(mode) {
    MODE = mode;
    dirLabel.textContent = fmtDir();
    inp.value = mode === "toNormidian" ? EN_EXAMPLE : NM_EXAMPLE;
    render();
  }

  if (swapBtn) {
    swapBtn.addEventListener("click", function () {
      setMode(MODE === "toNormidian" ? "toEnglish" : "toNormidian");
    });
  }

  if (inp) inp.addEventListener("input", render);
  if (inp) inp.addEventListener("focus", function () { inp.select(); });

  function outText() {
    var words = [];
    out.querySelectorAll(".w").forEach(function (n) { words.push(n.textContent); });
    return words.join(" ");
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var t = outText();
      if (!t) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(function () { flashCopy(); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = t;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); flashCopy(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
    function flashCopy() {
      copyBtn.textContent = "[ COPIED ]";
      setTimeout(function () { copyBtn.textContent = "[ COPY ]"; }, 1200);
    }
  }

  if (speakBtn) {
    speakBtn.addEventListener("click", function () {
      var t = outText();
      if (!t || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(t);
      u.rate = 0.95;
      u.lang = MODE === "toNormidian" ? "en-US" : "en-US";
      window.speechSynthesis.speak(u);
      speakBtn.textContent = "[ SPEAKING... ]";
      u.onend = function () { speakBtn.textContent = "[ SPEAK ]"; };
    });
  }

  /* ---- dictionary browser ---- */
  var ROW_CAP = 80;
  function renderDict(q) {
    if (!dictList) return;
    var res = window.normidianSearch(q || "");
    var total = res.length;
    var shown = res.slice(0, ROW_CAP);
    dictList.innerHTML = "";
    shown.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "dict-row dcat-" + r.cat;
      var en = document.createElement("span");
      en.className = "d-en";
      en.textContent = r.en;
      var root = document.createElement("span");
      root.className = "d-root";
      root.textContent = r.root;
      var cat = document.createElement("span");
      cat.className = "d-cat";
      cat.textContent = (window.NORMIDIAN_CAT_LABEL || {})[r.cat] || r.cat;
      var mean = document.createElement("span");
      mean.className = "d-mean";
      mean.textContent = r.meaning;
      row.appendChild(en);
      row.appendChild(root);
      row.appendChild(cat);
      row.appendChild(mean);
      dictList.appendChild(row);
    });
    if (dictCount) {
      dictCount.textContent = total + " words" + (total > ROW_CAP ? " \u00b7 showing " + ROW_CAP + " \u2014 narrow the search" : "");
    }
  }

  if (dictInput) {
    dictInput.addEventListener("input", function () {
      renderDict(dictInput.value);
    });
  }
  renderDict("");

  /* ---- smooth scroll reveal ---- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el, i) {
    el.style.setProperty("--d", String((i % 4) * 0.06) + "s");
    revealIO.observe(el);
  });

  render();
})();
