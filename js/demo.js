/* Normidian translator — a lightweight port of the real engine's rules,
   running fully in the browser against the real 761-word dictionary.
   Two directions: English → Normidian and Normidian → English. */

(function () {
  var D = window.NORMIDIAN_DICT || {};
  var CATS = ["nouns_living", "nouns_dead", "verbs", "adjectives", "prepositions", "adverbs", "conjunctions"];
  var ARTICLES = { living: "ðse", dead: "ðsaþ", object: "ðnes", possessor: "ðœþ", recipient: "þœn" };
  var VERB_SUFFIX = "ƿues";
  var NEG = "ne-";
  var PRONOUNS = { i: "I", you: "ðu", he: "þses", she: "ƿhes", it: "þt", we: "Þæ", they: "ðhœy" };
  var SKIP = { "the": 1, "a": 1, "an": 1 };
  var VERB_ENDINGS = ["ƿues", "ies", "ðus", "as", "es"];
  var ARTICLE_TOKENS = ["ðse", "ðnes", "ðsaþ", "ðœþ", "þœn", "ðse2", "ðsaþ2"];

  var CAT_LABEL = {
    nouns_living: "living noun",
    nouns_dead: "dead noun",
    verbs: "verb",
    adjectives: "adjective",
    prepositions: "preposition",
    adverbs: "adverb",
    conjunctions: "conjunction"
  };

  function find(word) {
    for (var i = 0; i < CATS.length; i++) {
      var cat = CATS[i];
      if (D[cat] && Object.prototype.hasOwnProperty.call(D[cat], word)) {
        return { cat: cat, root: D[cat][word].Root, en: word, meaning: D[cat][word].Meaning || "" };
      }
    }
    return null;
  }

  /* ---- reverse index: Normidian root → English ---- */
  var REVERSE = {};
  CATS.forEach(function (cat) {
    var words = D[cat] || {};
    Object.keys(words).forEach(function (en) {
      var root = words[en].Root;
      var key = String(root).toLowerCase();
      if (!REVERSE[key]) {
        REVERSE[key] = { en: en, cat: cat, root: root, meaning: words[en].Meaning || "" };
      }
    });
  });

  /* Inflections aren't in the dictionary — stem common endings and retry. */
  function stemmed(w) {
    if (find(w)) return w;
    var tries = [];
    if (w.length > 4 && w.slice(-3) === "ies") tries.push(w.slice(0, -3) + "y");
    if (w.length > 4 && w.slice(-2) === "es") tries.push(w.slice(0, -2));
    if (w.length > 3 && w.slice(-1) === "s") tries.push(w.slice(0, -1));
    if (w.length > 3 && w.slice(-2) === "ed") tries.push(w.slice(0, -2));
    if (w.length > 4 && w.slice(-3) === "ing") tries.push(w.slice(0, -3));
    if (w.length > 3 && w.slice(-1) === "d") tries.push(w.slice(0, -1));
    for (var i = 0; i < tries.length; i++) {
      if (find(tries[i])) return tries[i];
    }
    return w;
  }

  function reverseHit(token) {
    var t = String(token).toLowerCase();
    if (REVERSE[t]) return REVERSE[t];
    var negated = false;
    if (t.slice(0, NEG.length) === NEG) { t = t.slice(NEG.length); negated = true; }
    for (var i = 0; i < VERB_ENDINGS.length; i++) {
      var e = VERB_ENDINGS[i];
      if (t.length > e.length + 1 && t.slice(-e.length) === e) {
        var stem = t.slice(0, -e.length);
        if (REVERSE[stem]) {
          var hit = REVERSE[stem];
          return { en: (negated ? "not " : "") + hit.en, cat: hit.cat, root: token, meaning: hit.meaning };
        }
      }
    }
    if (REVERSE[t]) return REVERSE[t];
    return null;
  }

  /* ---- English → Normidian ---- */
  window.normidianTranslate = function (text) {
    if (!text.trim()) return [];
    var words = text.toLowerCase().match(/[a-z']+/g) || [];
    var out = [];
    var negateNext = false;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w === "not") { negateNext = true; continue; }
      if (SKIP[w]) continue;
      var hit = find(stemmed(w));
      if (!hit) {
        out.push({ span: "unk", root: "[" + w + "]", tip: "no Normidian root yet" });
        continue;
      }
      if (hit.cat === "nouns_living") {
        out.push({ span: "noun", root: ARTICLES.living + " " + hit.root, tip: hit.meaning });
      } else if (hit.cat === "nouns_dead") {
        out.push({ span: "noun", root: ARTICLES.dead + " " + hit.root, tip: hit.meaning });
      } else if (hit.cat === "verbs") {
        var root = hit.root;
        if (negateNext) { root = NEG + root; negateNext = false; }
        out.push({ span: "verb", root: root + VERB_SUFFIX, tip: hit.meaning });
      } else if (hit.cat === "adjectives") {
        out.push({ span: "adj", root: hit.root, tip: hit.meaning });
      } else if (hit.cat === "prepositions") {
        out.push({ span: "prep", root: hit.root, tip: "preposition" });
      } else if (hit.cat === "adverbs") {
        out.push({ span: "adv", root: hit.root, tip: "adverb" });
      } else if (hit.cat === "conjunctions") {
        out.push({ span: "conj", root: hit.root, tip: "conjunction" });
      } else if (PRONOUNS[w]) {
        out.push({ span: "pron", root: PRONOUNS[w], tip: "pronoun" });
      } else {
        out.push({ span: "unk", root: "[" + w + "]", tip: "no Normidian root yet" });
      }
    }
    return out;
  };

  /* ---- Normidian → English ---- */
  window.normidianTranslateRev = function (text) {
    if (!text.trim()) return [];
    var tokens = String(text).match(/[\S]+/g) || [];
    var out = [];
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      var bare = tok.replace(/[.,!?;:""''»«]/g, "");
      var punct = tok.slice(bare.length);
      if (!bare) continue;
      var low = bare.toLowerCase();
      if (ARTICLE_TOKENS.indexOf(low) !== -1) continue;
      var hit = reverseHit(bare);
      if (!hit) {
        out.push({ span: "unk", root: "[" + tok + "]", tip: "no English root yet" });
        continue;
      }
      out.push({ span: hit.cat === "nouns_living" || hit.cat === "nouns_dead" ? "noun" : hit.cat, root: hit.en + punct, tip: hit.meaning });
    }
    return out;
  };

  /* ---- search the dictionary (both directions) ---- */
  window.normidianSearch = function (q) {
    var query = String(q || "").toLowerCase().trim();
    var results = [];
    if (!query) {
      CATS.forEach(function (cat) {
        Object.keys(D[cat] || {}).forEach(function (en) {
          results.push({ en: en, root: D[cat][en].Root, cat: cat, meaning: D[cat][en].Meaning || "" });
        });
      });
      return results;
    }
    var seen = {};
    CATS.forEach(function (cat) {
      Object.keys(D[cat] || {}).forEach(function (en) {
        var root = D[cat][en].Root;
        var enHit = en.toLowerCase().indexOf(query) !== -1;
        var rootHit = root.toLowerCase().indexOf(query) !== -1;
        if (enHit || rootHit) {
          var key = en + "\u0001" + root;
          if (!seen[key]) {
            seen[key] = 1;
            results.push({ en: en, root: root, cat: cat, meaning: D[cat][en].Meaning || "" });
          }
        }
      });
    });
    return results;
  };

  window.normidianLookup = function (word) {
    return find(String(word || "").toLowerCase().trim());
  };
  window.NORMIDIAN_CAT_LABEL = CAT_LABEL;
})();
