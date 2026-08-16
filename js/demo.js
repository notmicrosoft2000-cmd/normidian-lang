/* Normidian demo translator — a lightweight port of the real engine's rules,
   running fully in the browser against the real 761-word dictionary. */

(function () {
  var D = window.NORMIDIAN_DICT || {};
  var CATS = ["nouns_living", "nouns_dead", "verbs", "adjectives", "prepositions", "adverbs", "conjunctions"];
  var ARTICLES = { living: "ðse", dead: "ðsaþ", object: "ðnes", possessor: "ðœþ", recipient: "þœn" };
  var VERB_SUFFIX = "ƿues";
  var NEG = "ne-";
  var PRONOUNS = { i: "I", you: "ðu", he: "þses", she: "ƿhes", it: "þt", we: "Þæ", they: "ðhœy" };
  var SKIP = { "the": 1, "a": 1, "an": 1 };

  function find(word) {
    for (var i = 0; i < CATS.length; i++) {
      var cat = CATS[i];
      if (D[cat] && Object.prototype.hasOwnProperty.call(D[cat], word)) {
        return { cat: cat, root: D[cat][word].Root };
      }
    }
    return null;
  }

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
        out.push({ span: "unk", root: "[" + w + "]" });
        continue;
      }
      if (hit.cat === "nouns_living") {
        out.push({ span: "noun", root: ARTICLES.living + " " + hit.root });
      } else if (hit.cat === "nouns_dead") {
        out.push({ span: "noun", root: ARTICLES.dead + " " + hit.root });
      } else if (hit.cat === "verbs") {
        var root = hit.root;
        if (negateNext) { root = NEG + root; negateNext = false; }
        out.push({ span: "verb", root: root + VERB_SUFFIX });
      } else if (hit.cat === "adjectives") {
        out.push({ span: "adj", root: hit.root });
      } else if (hit.cat === "prepositions") {
        out.push({ span: "prep", root: hit.root });
      } else if (hit.cat === "adverbs") {
        out.push({ span: "adv", root: hit.root });
      } else if (hit.cat === "conjunctions") {
        out.push({ span: "conj", root: hit.root });
      } else if (PRONOUNS[w]) {
        out.push({ span: "pron", root: PRONOUNS[w] });
      } else {
        out.push({ span: "unk", root: "[" + w + "]" });
      }
    }
    return out;
  };

  window.normidianLookup = function (word) {
    return find(String(word || "").toLowerCase().trim());
  };
})();
