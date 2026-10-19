"use strict";

/*
 * love-trivia — dependency-free Node harness.
 *
 * Builds a minimal fake DOM + localStorage, loads js/app.js in a sandbox and
 * asserts the pure logic on window.MenaTrivia. Run: node test/harness.js
 */

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const store = {};

const el = () => ({
  style: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  dataset: {},
  appendChild() {},
  addEventListener() {},
  removeEventListener() {},
  setAttribute() {},
  removeAttribute() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  focus() {},
  remove() {},
  reset() {},
  innerHTML: "",
  textContent: "",
  value: "",
  hidden: false,
  disabled: false
});

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  JSON,
  Intl,
  Object,
  Array,
  String,
  Number,
  parseInt,
  parseFloat,
  isNaN,
  RegExp,
  Error,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  document: {
    readyState: "complete",
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    createElement: () => el(),
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
    documentElement: { classList: { add() {}, remove() {}, toggle() {} } }
  },
  navigator: { language: "en", clipboard: { writeText: async () => {} } },
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} })
};

sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const files = process.argv.slice(2);
for (const f of (files.length ? files : ["js/app.js"])) {
  vm.runInContext(fs.readFileSync(path.resolve(f), "utf8"), sandbox, { filename: f });
}

const T = sandbox.window.MenaTrivia;

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL: " + msg);
    failures += 1;
  } else {
    console.log("ok - " + msg);
  }
}
function eq(a, b, msg) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) console.error("   expected " + JSON.stringify(b) + ", got " + JSON.stringify(a));
  assert(ok, msg);
}

/* ---------- namespace ---------- */

assert(!!T, "namespace window.MenaTrivia exposed");
assert(T.LS === "mena-trivia", "storage key is mena-trivia");

/* ---------- shipped bank ---------- */

assert(Array.isArray(T.DEFAULT_QUESTIONS) && T.DEFAULT_QUESTIONS.length >= 8,
  "ships at least 8 default questions");
assert(T.DEFAULT_QUESTIONS.every((q) => q.options.length === 4),
  "every default question has exactly 4 options");
assert(T.DEFAULT_QUESTIONS.every((q) => q.answer >= 0 && q.answer < q.options.length),
  "every default answer index is in range");
assert(T.DEFAULT_QUESTIONS.every((q) => q.q && q.category),
  "every default question has text and a category");

/* ---------- sanitizeQuestion ---------- */

assert(T.sanitizeQuestion(null) === null, "sanitizeQuestion rejects null");
assert(T.sanitizeQuestion({ q: "Hi", options: ["a", "b", "c"], answer: 0 }) === null,
  "sanitizeQuestion rejects fewer than 4 options");
assert(T.sanitizeQuestion({ q: "", options: ["a", "b", "c", "d"], answer: 0 }) === null,
  "sanitizeQuestion rejects an empty question");

const clean = T.sanitizeQuestion({ q: "  What   us?  ", category: "", options: ["a", "b", "c", "d"], answer: 9 });
assert(clean.q === "What us?", "sanitizeQuestion collapses whitespace");
assert(clean.category === "Us", "sanitizeQuestion defaults the category");
assert(clean.answer === 0, "sanitizeQuestion clamps an out-of-range answer");
assert(typeof clean.id === "string" && clean.id.length > 0, "sanitizeQuestion mints an id");

/* ---------- categories + filter ---------- */

const cats = T.categories(T.DEFAULT_QUESTIONS);
assert(cats.indexOf("Us") !== -1, "categories include 'Us'");
assert(new Set(cats).size === cats.length, "categories are unique");

const usOnly = T.filterByCategory(T.DEFAULT_QUESTIONS, "Us");
assert(usOnly.length > 0 && usOnly.every((q) => q.category === "Us"), "filterByCategory keeps one category");
eq(T.filterByCategory(T.DEFAULT_QUESTIONS, "all").length, T.DEFAULT_QUESTIONS.length,
  "filterByCategory('all') keeps everything");

/* ---------- pickQuestions ---------- */

let seed = 42;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

const picked = T.pickQuestions(T.DEFAULT_QUESTIONS, 5, rand);
eq(picked.length, 5, "pickQuestions returns the requested count");
eq(new Set(picked.map((q) => q.id)).size, 5, "pickQuestions returns unique questions");
eq(T.pickQuestions(T.DEFAULT_QUESTIONS, 0, rand).length, T.DEFAULT_QUESTIONS.length,
  "pickQuestions(0) returns all");
eq(T.pickQuestions(T.DEFAULT_QUESTIONS, 999, rand).length, T.DEFAULT_QUESTIONS.length,
  "pickQuestions over count returns all (shuffled)");

/* ---------- scoring ---------- */

eq(T.scorePct(3, 5), 60, "scorePct rounds the percentage");
eq(T.scorePct(0, 0), 0, "scorePct guards divide-by-zero");
assert(T.scoreLabel(100).indexOf("Perfect") === 0, "scoreLabel(100) is the perfect line");
assert(typeof T.scoreLabel(0) === "string" && T.scoreLabel(0).length > 0, "scoreLabel returns a line");

/* ---------- timer ---------- */

eq(T.timeLeft(1000, 20000, 6000), 15000, "timeLeft counts down");
eq(T.timeLeft(1000, 20000, 99000), 0, "timeLeft never goes negative");
eq(T.isTimeout(1000, 20000, 21001), true, "isTimeout fires after the limit");
eq(T.isTimeout(1000, 20000, 5000), false, "isTimeout is false before the limit");

/* ---------- share text + deep link ---------- */

assert(T.shareText(3, 5).indexOf("3/5") !== -1, "shareText includes the score");
eq(T.challengeUrl("https://x/y/", 3, 5), "https://x/y/?score=3&total=5", "challengeUrl builds ?score= link");
assert(T.challengeText(3, 5, "https://x/y/?score=3&total=5").indexOf("https://x/y/") !== -1,
  "challengeText includes the url");
eq(T.parseShare("?score=7&total=12"), { score: 7, total: 12 }, "parseShare reads a deep link");
eq(T.parseShare(""), null, "parseShare returns null when empty");
eq(T.parseShare("?note=1"), null, "parseShare returns null without a score");

/* ---------- state mutations ---------- */

const fresh = T.load();
assert(fresh.best === null, "fresh state has no best score");
eq(fresh.questions.length, T.DEFAULT_QUESTIONS.length, "fresh state is seeded with the defaults");

const added = T.addQuestion(fresh, { category: "Test", q: "New one?", options: ["a", "b", "c", "d"], answer: 2 });
eq(added.questions.length, fresh.questions.length + 1, "addQuestion appends");
eq(added.questions[added.questions.length - 1].answer, 2, "addQuestion keeps the answer index");

const newId = added.questions[added.questions.length - 1].id;
const removed = T.removeQuestion(added, newId);
eq(removed.questions.length, fresh.questions.length, "removeQuestion drops one");

const patched = T.updateQuestion(fresh, fresh.questions[0].id, { q: "Changed?" });
eq(patched.questions[0].q, "Changed?", "updateQuestion patches a field");
eq(fresh.questions[0].q === "Changed?", false, "updateQuestion does not mutate the input state");

const reset = T.resetBank(removed);
eq(reset.questions.length, T.DEFAULT_QUESTIONS.length, "resetBank restores the originals");

/* ---------- scores ---------- */

const s1 = T.recordScore(fresh, 3, 5);
eq(s1.plays, 1, "recordScore counts a play");
eq(s1.best, 3, "recordScore stores the best score");
eq(s1.bestPct, 60, "recordScore stores the best percentage");
const s2 = T.recordScore(s1, 2, 5);
eq(s2.best, 3, "recordScore keeps the higher best");
eq(s2.plays, 2, "recordScore keeps counting plays");
const s3 = T.recordScore(s2, 4, 5);
eq(s3.best, 4, "recordScore records a new best");

/* ---------- persistence round-trip ---------- */

T.save(s3);
const reloaded = T.load();
eq(reloaded.best, 4, "load reads the saved best");
eq(reloaded.plays, 3, "load reads the saved play count");

/* ---------- boot is safe with a bare DOM ---------- */

let bootThrew = false;
try {
  T.boot();
} catch (e) {
  bootThrew = true;
  console.error("   boot threw: " + e && e.message);
}
assert(!bootThrew, "boot() runs without throwing against the fake DOM");

if (failures) {
  console.error("\n" + failures + " assertion(s) failed");
  process.exitCode = 1;
} else {
  console.log("\nall assertions passed");
}
