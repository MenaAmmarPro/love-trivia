# How well do you know us? — love-trivia

A little quiz for Mena: **twelve-ish questions about the two of us**, four
options each, a gentle per-question timer, a score, a high score and a
shareable challenge link. The question bank is editable, so it can grow with us.

Live: https://menaammarpro.github.io/love-trivia/

## How it works

- Pick a **category** and **how many questions** (5 / 8 / 12 / all), then start.
- Each question has **four options** and about **20 seconds**. The bar turns
  warm red as time runs out. Tap the answer you think is right.
- You see the truth straight away — right in green, a miss in pink — then move
  on. At the end you get a score, a percentage and a little line from Ammar.
- **Share my score** / **Copy a challenge link** produce a link with
  `?score=NN&total=MM`, so the other person opens the same quiz with your score
  to beat.

## Editing the questions

The **Our questions** panel is the bank: every question is listed with its
category and correct answer. Delete any with the `×`, add new ones with the
form (category, question, four options, correct answer), or press **Reset to
originals** to bring back the shipped set. Store the ones you love.

## Storage key

- `mena-trivia` — `{ best, bestTotal, bestPct, plays, questions[] }`

Everything lives in `localStorage`; nothing is sent anywhere.

## Local checks

```powershell
node --check js/app.js
node test/harness.js
```

The harness builds a tiny fake DOM + `localStorage` and asserts the pure logic
(52 assertions): the shipped bank, question sanitising, categories and
filtering, question picking, scoring, the timer maths, share/deep-link parsing,
bank mutations and persistence.

## Files

```
index.html  css/app.css  js/app.js  test/harness.js
theme.css  main.js  effects.js      (shared love theme, copied in)
manifest.webmanifest  sw.js  assets/icon.svg
robots.txt  sitemap.xml  LICENSE  .gitignore  .nojekyll
```

Made with love, just for you ♥
