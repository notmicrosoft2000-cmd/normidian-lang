#!/usr/bin/env python3
"""translator_cli.py — the Normidian translator in your terminal.

A standard-library-only port of the in-browser engine. It reads the real
dictionary (normidian_dictionary.json) from this repo and translates
English <-> Normidian.

Usage:
    python translator_cli.py "the king sees the wolf"
    python translator_cli.py --rev "ðse cyniðg ġeseohƿues ðse wulf"
    python translator_cli.py              # interactive REPL (to Normidian)
    echo "hello, wolf" | python translator_cli.py
"""

import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

ARTICLES = {"living": "ðse", "dead": "ðsaþ", "object": "ðnes",
            "possessor": "ðœþ", "recipient": "þœn"}
VERB_SUFFIX = "ƿues"
NEG = "ne-"
PRONOUNS = {"i": "I", "you": "ðu", "he": "þses", "she": "ƿhes",
            "it": "þt", "we": "Þæ", "they": "ðhœy"}
SKIP = {"the", "a", "an"}
VERB_ENDINGS = ["ƿues", "ies", "ðus", "as", "es"]
ARTICLE_TOKENS = {"ðse", "ðnes", "ðsaþ", "ðœþ", "þœn", "ðse2", "ðsaþ2"}

CATS = ["nouns_living", "nouns_dead", "verbs", "adjectives",
        "prepositions", "adverbs", "conjunctions"]

CAT_LABEL = {
    "nouns_living": "living noun", "nouns_dead": "dead noun",
    "verbs": "verb", "adjectives": "adjective", "prepositions": "preposition",
    "adverbs": "adverb", "conjunctions": "conjunction",
}


def load_dict():
    path = os.path.join(HERE, "normidian_dictionary.json")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


class Engine:
    def __init__(self, data):
        self.D = data or {}
        self.REVERSE = {}
        for cat in CATS:
            words = self.D.get(cat) or {}
            for en, entry in words.items():
                root = str(entry.get("Root", ""))
                key = root.lower()
                if key and key not in self.REVERSE:
                    self.REVERSE[key] = {
                        "en": en, "cat": cat, "root": root,
                        "meaning": entry.get("Meaning") or "",
                    }

    def find(self, word):
        for cat in CATS:
            words = self.D.get(cat)
            if words and word in words:
                return {"cat": cat, "root": words[word].get("Root", ""),
                        "en": word, "meaning": words[word].get("Meaning") or ""}
        return None

    def stemmed(self, w):
        if self.find(w):
            return w
        tries = []
        if len(w) > 4 and w.endswith("ies"):
            tries.append(w[:-3] + "y")
        if len(w) > 4 and w.endswith("es"):
            tries.append(w[:-2])
        if len(w) > 3 and w.endswith("s"):
            tries.append(w[:-1])
        if len(w) > 3 and w.endswith("ed"):
            tries.append(w[:-2])
        if len(w) > 4 and w.endswith("ing"):
            tries.append(w[:-3])
        if len(w) > 3 and w.endswith("d"):
            tries.append(w[:-1])
        for t in tries:
            if self.find(t):
                return t
        return w

    def to_normidian(self, text):
        if not text.strip():
            return []
        words = re.findall(r"[a-z']+", text.lower())
        out = []
        negate_next = False
        for w in words:
            if w == "not":
                negate_next = True
                continue
            if w in SKIP:
                continue
            hit = self.find(self.stemmed(w))
            if not hit:
                if w in PRONOUNS:
                    out.append({"span": "pron", "root": PRONOUNS[w], "tip": "pronoun"})
                else:
                    out.append({"span": "unk", "root": "[" + w + "]",
                                "tip": "no Normidian root yet"})
                continue
            cat = hit["cat"]
            if cat == "nouns_living":
                out.append({"span": "noun", "root": ARTICLES["living"] + " " + hit["root"],
                            "tip": hit["meaning"]})
            elif cat == "nouns_dead":
                out.append({"span": "noun", "root": ARTICLES["dead"] + " " + hit["root"],
                            "tip": hit["meaning"]})
            elif cat == "verbs":
                root = hit["root"]
                if negate_next:
                    root = NEG + root
                    negate_next = False
                out.append({"span": "verb", "root": root + VERB_SUFFIX, "tip": hit["meaning"]})
            else:
                span = {"adjectives": "adj", "prepositions": "prep",
                        "adverbs": "adv", "conjunctions": "conj"}.get(cat, cat)
                out.append({"span": span, "root": hit["root"], "tip": hit["meaning"]})
        return out

    def reverse_hit(self, token):
        t = token.lower()
        if t in self.REVERSE:
            return self.REVERSE[t]
        negated = False
        if t.startswith(NEG):
            t = t[len(NEG):]
            negated = True
        for e in VERB_ENDINGS:
            if len(t) > len(e) + 1 and t.endswith(e):
                stem = t[:-len(e)]
                hit = self.REVERSE.get(stem)
                if hit:
                    return {"en": ("not " if negated else "") + hit["en"],
                            "cat": hit["cat"], "root": token, "meaning": hit["meaning"]}
        if t in self.REVERSE:
            return self.REVERSE[t]
        return None

    def to_english(self, text):
        if not text.strip():
            return []
        tokens = re.findall(r"\S+", text)
        out = []
        for tok in tokens:
            bare = re.sub(r'[.,!?;:"\'\u00bb\u00ab]+', "", tok)
            if not bare:
                continue
            low = bare.lower()
            if low in ARTICLE_TOKENS:
                continue
            hit = self.reverse_hit(bare)
            if not hit:
                out.append({"span": "unk", "root": "[" + tok + "]", "tip": "no English root yet"})
                continue
            if hit["cat"] in ("nouns_living", "nouns_dead"):
                span = "noun"
            else:
                span = hit["cat"]
            out.append({"span": span, "root": hit["en"], "tip": hit["meaning"]})
        return out


def render(res):
    return " ".join(r["root"] for r in res)


def main():
    ap = argparse.ArgumentParser(description="Normidian translator (terminal)")
    ap.add_argument("text", nargs="*", help="text to translate; omit for a REPL")
    ap.add_argument("--rev", "-r", action="store_true",
                    help="translate Normidian -> English instead")
    ap.add_argument("--count", action="store_true", help="print how many words the dictionary holds")
    args = ap.parse_args()

    engine = Engine(load_dict())

    if args.count:
        total = sum(len(engine.D.get(c) or {}) for c in CATS)
        print("{} words in normidian_dictionary.json".format(total))
        return

    if args.text:
        text = " ".join(args.text)
        print(render(engine.to_english(text) if args.rev else engine.to_normidian(text)))
        return

    # piped stdin?
    if not sys.stdin.isatty():
        text = sys.stdin.read().strip()
        if text:
            print(render(engine.to_english(text) if args.rev else engine.to_normidian(text)))
            return

    label = "NORMI DIAN <- ENGLISH" if args.rev else "ENGLISH -> NORMI DIAN"
    print("Normidian translator REPL — {}  (type 'exit' to leave)".format(label))
    while True:
        try:
            line = input("> ")
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if line.strip() in ("exit", "quit"):
            return
        if not line.strip():
            continue
        print(render(engine.to_english(line) if args.rev else engine.to_normidian(line)))


if __name__ == "__main__":
    main()
