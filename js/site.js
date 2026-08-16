(function () {
  var inp = document.getElementById("demoIn");
  var out = document.getElementById("demoOut");
  if (!inp || !out) return;

  var SPANS = {
    noun: "noun", verb: "verb", adj: "adj", prep: "prep",
    adv: "adv", conj: "conj", pron: "pron", unk: "unk"
  };

  function render() {
    var res = window.normidianTranslate(inp.value);
    if (!res.length) {
      out.innerHTML = '<span class="dim">þ your words will gather here</span>';
      return;
    }
    out.innerHTML = "";
    for (var i = 0; i < res.length; i++) {
      var s = document.createElement("span");
      s.className = SPANS[res[i].span] || "unk";
      s.textContent = res[i].root;
      out.appendChild(s);
      out.appendChild(document.createTextNode(" "));
    }
  }

  inp.addEventListener("input", render);
  render();
})();
