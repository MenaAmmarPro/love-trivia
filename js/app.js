"use strict";

/*
 * love-trivia — "How well do you know us?"
 *
 * A little quiz for Mena: a bank of questions about the two of us, four
 * options each, a gentle per-question timer, a score, a high score and a
 * shareable challenge link.
 *
 * All the thinking lives in pure functions exposed on window.MenaTrivia so the
 * Node harness can test them without a browser.
 */

(function (root) {
  var LS = "mena-trivia";
  var QUESTION_LIMIT_MS = 20000;
  var MIN_OPTIONS = 4;

  /* ---------- the bank we ship with ---------- */

  var DEFAULT_QUESTIONS = [
    {
      id: "q-meet",
      category: "Us",
      q: "What did we meet on?",
      options: ["Free Fire", "A classroom", "A football match", "A book club"],
      answer: 0
    },
    {
      id: "q-where-mena",
      category: "Us",
      q: "Which country is Mena from?",
      options: ["Romania", "Pakistan", "Italy", "Bulgaria"],
      answer: 0
    },
    {
      id: "q-where-ammar",
      category: "Us",
      q: "Which country is Ammar from?",
      options: ["Pakistan", "Romania", "India", "Turkey"],
      answer: 0
    },
    {
      id: "q-since",
      category: "Us",
      q: "How long have we been us?",
      options: ["Since forever", "Exactly one year", "Since last week", "Since 2019"],
      answer: 0
    },
    {
      id: "q-colour",
      category: "Favourites",
      q: "What is Mena's favourite colour?",
      options: ["White", "Black", "Red", "Green"],
      answer: 0
    },
    {
      id: "q-food",
      category: "Favourites",
      q: "Mena's favourite food is\u2026",
      options: ["Pizza", "Sushi", "Burgers", "Pasta"],
      answer: 0
    },
    {
      id: "q-art",
      category: "Favourites",
      q: "What does Mena love most of all?",
      options: ["Art", "Cars", "Chess", "Coding"],
      answer: 0
    },
    {
      id: "q-nature",
      category: "Favourites",
      q: "Which of these does Mena love the most?",
      options: ["Nature", "Busy cities", "Shopping malls", "Traffic"],
      answer: 0
    },
    {
      id: "q-city-mena",
      category: "Places",
      q: "Which city is Mena's side?",
      options: ["Bucharest", "Budapest", "Belgrade", "Bratislava"],
      answer: 0
    },
    {
      id: "q-city-ammar",
      category: "Places",
      q: "Which city is Ammar's side?",
      options: ["Karachi", "Lahore", "Islamabad", "Peshawar"],
      answer: 0
    },
    {
      id: "q-clocks",
      category: "Places",
      q: "How far apart are our clocks?",
      options: ["About 2 hours", "About 5 hours", "About 12 hours", "No difference"],
      answer: 0
    },
    {
      id: "q-distance",
      category: "Places",
      q: "Roughly how far is Karachi from Bucharest?",
      options: ["About 4,000 km", "About 400 km", "About 12,000 km", "About 900 km"],
      answer: 0
    },
    {
      id: "q-hearts",
      category: "Little things",
      q: "What do we sprinkle on everything?",
      options: ["Hearts", "Stardust", "Confetti", "Sprinkles"],
      answer: 0
    },
    {
      id: "q-us",
      category: "Little things",
      q: "Who wins every single argument?",
      options: ["Both of us", "Nobody", "Ammar", "Mena"],
      answer: 0
    }
  ];

  /* ---------- tiny helpers ---------- */

  function asArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]" ? value : [];
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
  }

  function makeId(prefix, rand) {
    var r = typeof rand === "function" ? rand() : Math.random();
    return (prefix || "q") + "-" + Math.floor(r * 1e9).toString(36);
  }

  /* ---------- pure logic ---------- */

  // Keep only well-formed questions: 4+ options, non-empty text, valid answer.
  function sanitizeQuestion(raw) {
    if (!raw || typeof raw !== "object") return null;
    var q = normalizeText(raw.q);
    var options = asArray(raw.options).map(normalizeText).filter(function (o) {
      return o.length > 0;
    });
    if (!q || options.length < MIN_OPTIONS) return null;
    var answer = raw.answer | 0;
    if (answer < 0 || answer >= options.length) answer = 0;
    var id = normalizeText(raw.id) || makeId("q");
    return {
      id: id,
      category: normalizeText(raw.category) || "Us",
      q: q,
      options: options.slice(0, 4),
      answer: answer
    };
  }

  function bankQuestions(state) {
    var list = asArray(state && state.questions)
      .map(sanitizeQuestion)
      .filter(Boolean);
    return list.length ? list : DEFAULT_QUESTIONS.map(sanitizeQuestion);
  }

  function categories(questions) {
    var seen = {};
    var out = [];
    asArray(questions).forEach(function (item) {
      var c = normalizeText(item && item.category) || "Us";
      if (!seen[c]) {
        seen[c] = true;
        out.push(c);
      }
    });
    return out;
  }

  function filterByCategory(questions, category) {
    var list = asArray(questions);
    if (!category || category === "all") return list.slice();
    return list.filter(function (item) {
      return (normalizeText(item && item.category) || "Us") === category;
    });
  }

  // Deterministic Fisher–Yates when a rand() is supplied.
  function shuffle(list, rand) {
    var r = typeof rand === "function" ? rand : Math.random;
    var out = asArray(list).slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(r() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function pickQuestions(list, count, rand) {
    var pool = asArray(list).slice();
    var n = count | 0;
    if (n <= 0 || n >= pool.length) return shuffle(pool, rand);
    return shuffle(pool, rand).slice(0, n);
  }

  function scorePct(score, total) {
    var t = total | 0;
    if (t <= 0) return 0;
    return Math.round(((score | 0) / t) * 100);
  }

  function scoreLabel(pct) {
    var p = pct | 0;
    if (p >= 100) return "Perfect \u2014 you know us by heart \u2665";
    if (p >= 80) return "You really do pay attention \u2665";
    if (p >= 60) return "Good \u2014 a few little surprises left!";
    if (p >= 40) return "Not bad \u2014 we should talk more \u266a";
    return "We need a long call, my love \u2665";
  }

  function timeLeft(startedAt, limitMs, now) {
    var limit = limitMs || QUESTION_LIMIT_MS;
    var elapsed = (now | 0) - (startedAt | 0);
    var left = limit - elapsed;
    return left > 0 ? left : 0;
  }

  function isTimeout(startedAt, limitMs, now) {
    return timeLeft(startedAt, limitMs, now) <= 0;
  }

  /* ---------- bank mutations (return new state) ---------- */

  function addQuestion(state, raw) {
    var next = cloneState(state);
    var clean = sanitizeQuestion(raw);
    if (clean) next.questions.push(clean);
    return next;
  }

  function updateQuestion(state, id, patch) {
    var next = cloneState(state);
    next.questions = next.questions.map(function (item) {
      if (item.id !== id) return item;
      var merged = Object.assign({}, item, patch || {});
      return sanitizeQuestion(merged) || item;
    });
    return next;
  }

  function removeQuestion(state, id) {
    var next = cloneState(state);
    next.questions = next.questions.filter(function (item) {
      return item.id !== id;
    });
    return next;
  }

  function resetBank(state) {
    var next = cloneState(state);
    next.questions = DEFAULT_QUESTIONS.map(function (q) {
      return sanitizeQuestion(q);
    });
    return next;
  }

  function recordScore(state, score, total) {
    var next = cloneState(state);
    next.plays = (next.plays | 0) + 1;
    var pct = scorePct(score, total);
    if (next.best == null || score > next.best) {
      next.best = score | 0;
      next.bestTotal = total | 0;
    }
    if (next.bestPct == null || pct > next.bestPct) next.bestPct = pct;
    return next;
  }

  function cloneState(state) {
    var src = state && typeof state === "object" ? state : {};
    return {
      best: src.best == null ? null : src.best | 0,
      bestTotal: src.bestTotal == null ? null : src.bestTotal | 0,
      bestPct: src.bestPct == null ? null : src.bestPct | 0,
      plays: src.plays | 0,
      questions: bankQuestions(src).map(function (q) {
        return Object.assign({}, q);
      })
    };
  }

  /* ---------- share text ---------- */

  function shareText(score, total) {
    return "I scored " + (score | 0) + "/" + (total | 0) + " on \"How well do you know us?\" \u2665";
  }

  function challengeText(score, total, url) {
    return shareText(score, total) + " Beat me: " + url;
  }

  function challengeUrl(base, score, total) {
    return base + "?score=" + (score | 0) + "&total=" + (total | 0);
  }

  function parseShare(search) {
    var s = String(search == null ? "" : search).replace(/^\?/, "");
    if (!s) return null;
    var parts = s.split("&");
    var out = { score: null, total: null };
    for (var i = 0; i < parts.length; i += 1) {
      var pair = parts[i].split("=");
      var key = decodeURIComponent(pair[0] || "");
      var val = decodeURIComponent((pair[1] || "").replace(/\+/g, " "));
      if (key === "score" && /^\d+$/.test(val)) out.score = parseInt(val, 10);
      if (key === "total" && /^\d+$/.test(val)) out.total = parseInt(val, 10);
    }
    if (out.score == null && out.total == null) return null;
    return out;
  }

  /* ---------- storage ---------- */

  function load() {
    var raw = null;
    try {
      raw = root.localStorage.getItem(LS);
    } catch (e) {
      raw = null;
    }
    var parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parsed = null;
      }
    }
    return cloneState(parsed);
  }

  function save(state) {
    try {
      root.localStorage.setItem(LS, JSON.stringify(state));
    } catch (e) {
      /* storage full or blocked — the quiz still works for this visit */
    }
    return state;
  }

  /* ---------- export ---------- */

  var api = {
    LS: LS,
    QUESTION_LIMIT_MS: QUESTION_LIMIT_MS,
    DEFAULT_QUESTIONS: DEFAULT_QUESTIONS,
    normalizeText: normalizeText,
    makeId: makeId,
    sanitizeQuestion: sanitizeQuestion,
    bankQuestions: bankQuestions,
    categories: categories,
    filterByCategory: filterByCategory,
    shuffle: shuffle,
    pickQuestions: pickQuestions,
    scorePct: scorePct,
    scoreLabel: scoreLabel,
    timeLeft: timeLeft,
    isTimeout: isTimeout,
    addQuestion: addQuestion,
    updateQuestion: updateQuestion,
    removeQuestion: removeQuestion,
    resetBank: resetBank,
    recordScore: recordScore,
    cloneState: cloneState,
    shareText: shareText,
    challengeText: challengeText,
    challengeUrl: challengeUrl,
    parseShare: parseShare,
    load: load,
    save: save
  };

  root.MenaTrivia = api;

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
