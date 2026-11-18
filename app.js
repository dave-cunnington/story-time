'use strict';

const READER = 'Lincoln'; // whose app this is
const JERSEY = '87';
const PASS_MARK = 4; // correct answers out of 5 needed to finish a chapter
const STORE_KEY = 'storytime.v1';
const FONT_SIZES = [20, 24, 28, 32, 38];

const view = document.getElementById('view');
const heading = document.getElementById('heading');
const backBtn = document.getElementById('back');
const wordbar = document.getElementById('wordbar');
const wordbarWord = document.getElementById('wordbar-word');

// ---------- saved progress (kept on this tablet only) ----------

function loadState() {
  const blank = { font: 1, theme: 'day', progress: {}, words: {}, meanings: {} };
  try {
    return Object.assign(blank, JSON.parse(localStorage.getItem(STORE_KEY)) || {});
  } catch {
    return blank;
  }
}
const state = loadState();
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch { /* private mode or storage full: keep going without saving */ }
}
const chapterProgress = (bookId, n) => (state.progress[bookId] || {})[n];
const isDone = (bookId, n) => !!chapterProgress(bookId, n)?.passed;
const isOpen = (bookId, n) => n === 1 || isDone(bookId, n - 1);

function applyLook() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.style.setProperty('--read-size', FONT_SIZES[state.font] + 'px');
  document.getElementById('theme').textContent = state.theme === 'night' ? '☀️' : '🌙';
}

// ---------- book data ----------

const cache = {};
async function getJSON(path) {
  if (!cache[path]) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Could not load ' + path);
    cache[path] = await res.json();
  }
  return cache[path];
}
const getLibrary = () => getJSON('books/library.json');
const getBook = (id) => getJSON(`books/${id}.json`);
const getQuiz = (id) => getJSON(`books/${id}.quiz.json`);

// Kid-friendly meanings for the words in the books, keyed by the lower-case word.
let meanings = {};
getJSON('books/meanings.json').then((m) => { meanings = m; }).catch(() => {});

// ---------- speech ----------

// Each word and each meaning has a recorded clip in audio/ (made by tools/tts/record.py).
// If a clip is missing or will not play, the tablet's own built-in voice is used instead.

// Old-fashioned spellings and short forms that the built-in voice would stumble on.
let sayAs = {};
getJSON('books/say-as.json').then((m) => { sayAs = m; }).catch(() => {});

const canSpeak = 'speechSynthesis' in window;
let voice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  voice = voices.find((v) => /^en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
}
if (canSpeak) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}
function speak(text, rate = 0.8) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(sayAs[text.toLowerCase()] || text);
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : 'en-US';
  u.rate = rate;
  speechSynthesis.speak(u);
}

// File name for a word's clip. Must match slug() in tools/tts/record.py.
const clipName = (key) => key.replace(/[^a-z0-9-]/g, (c) => '_' + c.codePointAt(0).toString(16));

let clip = null;
function hush() {
  if (clip) { clip.onerror = null; clip.pause(); clip = null; }
  if (canSpeak) speechSynthesis.cancel();
}
// kind is 'words' or 'meanings'. fallbackText is spoken by the built-in voice if there is no clip.
function playClip(kind, key, fallbackText, fallbackRate) {
  hush();
  const mine = new Audio(`audio/${kind}/${clipName(key)}.mp3`);
  clip = mine;
  const fallback = () => { if (clip === mine) { clip = null; speak(fallbackText, fallbackRate); } };
  mine.onerror = fallback;
  mine.play().catch(fallback);
}
const sayWord = (word) => playClip('words', word.toLowerCase(), word, 0.8);

// ---------- tappable words ----------

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Wrap each word in a span so it can be tapped. Spaces and long dashes stay outside.
// Punctuation after a word becomes a traffic light: red means stop, yellow means slow down.
const ABBREVIATIONS = /^(ms|mr|mrs|dr|st)$/i;
function tappable(text) {
  return text
    .split(/(\s+|—)/)
    .map((part) => {
      if (part === '' || /^(\s+|—)$/.test(part)) return esc(part);
      const [, lead, core, trail] = part.match(/^([^A-Za-z0-9']*)(.*?)([^A-Za-z0-9']*)$/s);
      const lights = ABBREVIATIONS.test(core) ? esc(trail) : [...trail].map((c) =>
        ('.!?'.includes(c) ? `<span class="stop">${c}</span>` : ',;:'.includes(c) ? `<span class="slow">${c}</span>` : esc(c))).join('');
      return esc(lead) + (core ? `<span class="w">${esc(core)}</span>` : '') + lights;
    })
    .join('');
}

// "“Hark!”" -> "Hark"; keeps the apostrophes in "don't" and "Unc'".
const cleanWord = (raw) => raw.replace(/[“”‘’"]/g, '').replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '');

const DOUBLE_TAP_MS = 500;
const wordbarMeaning = document.getElementById('wordbar-meaning');
let lit = null;
let wordTaps = 0;
let lastTap = { span: null, at: 0 };

function closeWordbar() {
  wordbar.hidden = true;
  document.body.classList.remove('wordbar-open');
  lit?.classList.remove('on');
  lit = null;
}

// Keep the buddy standing on top of the word bar, however tall it is.
const liftBuddy = () => document.body.style.setProperty('--bar-h', wordbar.offsetHeight + 'px');

// Second tap on a word (or the Meaning button): show and say what it means.
function tellMeaning() {
  const word = wordbarWord.textContent;
  const key = word.toLowerCase();
  const meaning = meanings[key] || 'I don’t know that one yet. Ask a grown-up what it means!';
  wordbarMeaning.textContent = meaning;
  wordbarMeaning.hidden = false;
  liftBuddy();
  if (meanings[key]) playClip('meanings', key, meaning, 0.9);
  else speak(meaning, 0.9);
  if (meanings[key]) {
    state.meanings[key] = (state.meanings[key] || 0) + 1;
    save();
  }
}

view.addEventListener('click', (e) => {
  const span = e.target.closest('.w');
  if (!span) return;
  const word = cleanWord(span.textContent);
  if (!word) return;
  const now = Date.now();
  const again = span === lastTap.span && now - lastTap.at < DOUBLE_TAP_MS && !wordbar.hidden;
  lastTap = { span, at: again ? 0 : now };
  if (again) return tellMeaning();

  lit?.classList.remove('on');
  lit = span;
  span.classList.add('on');
  wordbarWord.textContent = word;
  wordbarMeaning.hidden = true;
  wordbar.hidden = false;
  document.body.classList.add('wordbar-open');
  liftBuddy();
  sayWord(word);
  if (++wordTaps % 3 === 1) Buddy.on('word');
  // Remember which words were tapped, so a grown-up can see the tricky ones later.
  const key = word.toLowerCase();
  state.words[key] = (state.words[key] || 0) + 1;
  save();
});
document.getElementById('wordbar-again').addEventListener('click', () => sayWord(wordbarWord.textContent));
document.getElementById('wordbar-means').addEventListener('click', tellMeaning);
document.getElementById('wordbar-close').addEventListener('click', closeWordbar);

// ---------- screens ----------

// While a chapter is open, cheer at the halfway point and at the end.
let scrollWatcher = null;
function stopWatchingScroll() {
  if (scrollWatcher) window.removeEventListener('scroll', scrollWatcher);
  scrollWatcher = null;
}
function watchScroll() {
  const said = { halfway: false, end: false };
  scrollWatcher = () => {
    const room = document.documentElement.scrollHeight - window.innerHeight;
    if (room < 200) return;
    const done = window.scrollY / room;
    if (done > 0.97 && !said.end) { said.end = said.halfway = true; Buddy.on('end'); }
    else if (done > 0.5 && !said.halfway) { said.halfway = true; Buddy.on('halfway'); }
  };
  window.addEventListener('scroll', scrollWatcher, { passive: true });
}

function show(title, backTo, html, screen = '') {
  closeWordbar();
  Buddy.quiet();
  document.body.dataset.screen = screen;
  stopWatchingScroll();
  hush();
  heading.textContent = title;
  backBtn.hidden = backTo === null;
  backBtn.onclick = () => { location.hash = backTo; };
  view.innerHTML = html;
  window.scrollTo(0, 0);
}

const totalStars = () => Object.keys(state.progress).reduce((sum, id) => sum + finishedIn(id), 0);
const finishedIn = (bookId) => Object.values(state.progress[bookId] || {}).filter((c) => c.passed).length;

// A puck sliding along the ice toward the net.
function rink(done, total) {
  const pct = Math.round((done / total) * 100);
  return `<div class="rink"><div class="fill" style="width:${pct}%"></div><span class="puck" style="left:${pct}%"></span></div>
    <p class="count">${done === total ? 'Finished! 🏆' : `${done} of ${total} chapters`}</p>`;
}

async function showLibrary() {
  const books = await getLibrary();
  const stars = totalStars();
  const hello = stars
    ? `You have ${stars} star${stars === 1 ? '' : 's'}! ⭐ Read a chapter to win one more.`
    : 'Read a chapter and win your first star! ⭐';
  show(`${READER}’s Story Time`, null, `<section class="hero">
      <h2 class="sporty">Hi ${READER}!</h2><p>${hello}</p><span class="jersey">${JERSEY}</span>
    </section>` + books.map((b) => `<button class="book" data-go="#/book/${b.id}">
      <span class="cover">${b.emoji}</span>
      <span class="info"><h2>${esc(b.title)}</h2><p>${esc(b.blurb)}</p>${rink(finishedIn(b.id), b.chapters)}</span>
    </button>`).join(''));
  Buddy.on('home');
}

async function showBook(id) {
  const book = await getBook(id);
  const items = book.chapters.map((c) => {
    const done = isDone(id, c.number);
    const open = isOpen(id, c.number);
    const cls = done ? 'done' : open ? 'next' : '';
    const badge = done ? '⭐' : open ? '<span class="tag">Read ▶</span>' : '🔒';
    return `<li><button class="chapter ${cls}" data-go="#/read/${id}/${c.number}" ${open ? '' : 'disabled'}>
      <span class="num">${done ? '✓' : c.number}</span>
      <span class="name">${esc(c.title)}</span><span>${badge}</span>
    </button></li>`;
  }).join('');
  show(book.title, '#/', `<div class="bookhead"><h2>${esc(book.title)}</h2>
      ${rink(finishedIn(id), book.chapters.length)}</div><ul class="chapters">${items}</ul>`);
  Buddy.on('book');
}

async function showChapter(id, n) {
  const book = await getBook(id);
  const chapter = book.chapters[n - 1];
  if (!chapter || !isOpen(id, n)) return void (location.hash = `#/book/${id}`);
  const body = chapter.paragraphs
    .map((p) => (p.verse ? `<p class="verse">${tappable(p.verse)}</p>` : `<p>${tappable(p)}</p>`))
    .join('');
  show(book.title, `#/book/${id}`, `<article class="reader">
      <p class="kicker">Chapter ${n} of ${book.chapters.length}</p>
      <h2>${tappable(chapter.title)}</h2>
      ${body}
    </article>
    <p class="note">Tap a word to hear it. Tap it twice to hear what it means.</p>
    <button class="btn" data-go="#/quiz/${id}/${n}">I finished! Quiz time 🏒</button>`, 'read');
  Buddy.on('chapter');
  watchScroll();
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CHEERS = ['Goal! 🚨', 'He shoots, he scores!', 'Top shelf!', 'Great shot!', 'What a play!'];
const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

function celebrate() {
  const box = document.createElement('div');
  box.className = 'confetti';
  const colours = ['#fcb514', '#0a0a0a', '#ffffff', '#fcb514'];
  for (let i = 0; i < 60; i++) {
    const bit = document.createElement('i');
    bit.style.left = Math.random() * 100 + '%';
    bit.style.background = colours[i % colours.length];
    bit.style.animationDuration = 1.6 + Math.random() * 1.8 + 's';
    bit.style.animationDelay = Math.random() * 0.5 + 's';
    box.append(bit);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 4200);
}

async function showQuiz(id, n) {
  const [book, quiz] = await Promise.all([getBook(id), getQuiz(id)]);
  const questions = quiz[n];
  if (!questions || !isOpen(id, n)) return void (location.hash = `#/book/${id}`);
  let index = 0;
  let score = 0;
  const marks = []; // true or false for each question answered so far

  function ask() {
    const [question, options] = questions[index];
    const correct = options[0]; // first option in the file is always the right one
    show(`Quiz · Chapter ${n}`, `#/read/${id}/${n}`, `<section class="quiz">
        <div class="pucks" aria-label="Question ${index + 1} of ${questions.length}">${questions.map((_, i) =>
          `<span class="${i < marks.length ? (marks[i] ? 'hit' : 'miss') : i === index ? 'now' : ''}">${i < marks.length ? (marks[i] ? '✓' : '✕') : i + 1}</span>`).join('')}</div>
        <p class="question">${tappable(question)}</p>
        ${shuffle(options).map((o) => `<button class="option">${esc(o)}</button>`).join('')}
        <p class="feedback" aria-live="polite"></p>
      </section>`, 'quiz');
    if (index === 0) Buddy.on('quiz');
    const buttons = [...view.querySelectorAll('.option')];
    buttons.forEach((btn) => {
      btn.onclick = () => {
        const right = btn.textContent === correct;
        if (right) score++;
        marks.push(right);
        Buddy.on(right ? 'right' : 'wrong');
        buttons.forEach((b) => {
          b.disabled = true;
          if (b.textContent === correct) b.classList.add('right');
        });
        if (!right) btn.classList.add('wrong');
        const fb = view.querySelector('.feedback');
        fb.textContent = right ? cheer() : 'Off the post! The green one is the answer.';
        fb.classList.add(right ? 'right' : 'wrong');
        const next = document.createElement('button');
        next.className = 'btn';
        next.textContent = index + 1 < questions.length ? 'Next question' : 'See my score';
        next.onclick = () => (++index < questions.length ? ask() : finish());
        view.querySelector('.quiz').append(next);
        next.scrollIntoView({ block: 'nearest' });
      };
    });
  }

  function finish() {
    const passed = score >= PASS_MARK;
    const before = chapterProgress(id, n) || { tries: 0, best: 0, passed: false };
    (state.progress[id] ||= {})[n] = {
      tries: before.tries + 1,
      best: Math.max(before.best, score),
      passed: before.passed || passed,
    };
    save();
    const last = n === book.chapters.length;
    const total = questions.length;
    const board = `<div class="scoreboard"><small>YOUR SCORE</small><b>${score}/${total}</b></div>`;
    let html;
    if (passed && last) {
      html = `<p class="big">🏆</p>${board}<h2 class="sporty">You won the cup!</h2><p>You finished the whole book, ${READER}!</p>
        <button class="btn" data-go="#/">Back to my books</button>`;
    } else if (passed) {
      html = `${board}<h2 class="sporty">${score === total ? 'Perfect game! 🚨' : 'You win! ⭐'}</h2>
        <p>Great reading, ${READER}. Chapter ${n} is done.</p>
        <button class="btn" data-go="#/read/${id}/${n + 1}">Read chapter ${n + 1}</button>
        <button class="btn quiet" data-go="#/book/${id}">All chapters</button>`;
    } else {
      html = `${board}<h2 class="sporty">So close!</h2>
        <p>You need ${PASS_MARK} to win. Every great player practises. Read it once more and try again.</p>
        <button class="btn" data-go="#/read/${id}/${n}">Read chapter ${n} again</button>`;
    }
    show(`Quiz · Chapter ${n}`, `#/book/${id}`, `<section class="result">${html}</section>`);
    if (passed) celebrate();
    const newStar = passed && !before.passed;
    if (newStar) Buddy.setStars(totalStars(), true);
    Buddy.on(!passed ? 'fail' : last ? 'finished' : score === total ? 'perfect' : newStar ? 'star' : 'pass');
  }

  ask();
}

// ---------- navigation ----------

view.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go && !go.disabled) location.hash = go.dataset.go;
});

async function route() {
  const [, page, id, n] = location.hash.split('/');
  try {
    if (page === 'book') await showBook(id);
    else if (page === 'read') await showChapter(id, Number(n));
    else if (page === 'quiz') await showQuiz(id, Number(n));
    else await showLibrary();
  } catch (err) {
    show('Story Time', '#/', `<p class="note">Something went wrong: ${esc(err.message)}</p>`);
  }
}
window.addEventListener('hashchange', route);

document.getElementById('smaller').onclick = () => { state.font = Math.max(0, state.font - 1); save(); applyLook(); };
document.getElementById('bigger').onclick = () => { state.font = Math.min(FONT_SIZES.length - 1, state.font + 1); save(); applyLook(); };
document.getElementById('theme').onclick = () => { state.theme = state.theme === 'night' ? 'day' : 'night'; save(); applyLook(); };

// Full screen in the browser (e.g. Amazon Kids, which can't add a home-screen app).
// Opened from the home screen, the manifest already makes it full screen, so the button hides.
const fsBtn = document.getElementById('fullscreen');
const root = document.documentElement;
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsAvailable = (document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
  !matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
function syncFullscreen() {
  const on = !!fsElement();
  fsBtn.textContent = on ? '🗗' : '⛶';
  fsBtn.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen');
}
if (fsAvailable) {
  fsBtn.hidden = false;
  fsBtn.onclick = () => {
    if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (root.requestFullscreen || root.webkitRequestFullscreen).call(root)?.catch?.(() => {});
  };
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);
  syncFullscreen();
}

Buddy.setName(READER);
Buddy.setStars(totalStars());
applyLook();
route();
