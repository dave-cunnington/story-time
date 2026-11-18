'use strict';
// Bobblehead Lincoln: a little buddy in the corner who cheers the reader on.
// app.js calls Buddy.on('<moment>') at the right moments; everything else lives here.

const Buddy = (() => {
  const SKIN = '#fde0cf';
  const HAIR = '#e9a54b';
  const HAIR_LIGHT = '#f6c779';
  const GOLD = '#fcb514';
  const BLACK = '#0a0a0a';
  const FRECKLES = [[100, 101], [88, 106], [94, 110], [106, 110], [112, 106], [82, 111], [118, 111], [72, 107], [128, 107], [64, 103], [136, 103], [77, 115], [123, 115]];

  const eye = (x) => `<ellipse cx="${x}" cy="92" rx="12" ry="13.5" fill="#fff" stroke="#c9a08c" stroke-width="1.5"/>
    <circle cx="${x}" cy="93" r="8.5" fill="#4f9bd9"/><circle cx="${x}" cy="93" r="4.2" fill="#12283a"/>
    <circle cx="${x + 3}" cy="89.5" r="2.6" fill="#fff"/>`;

  const HEAD = `
      <circle cx="39" cy="94" r="12" fill="${SKIN}" stroke="#e3b29b" stroke-width="2"/>
      <circle cx="161" cy="94" r="12" fill="${SKIN}" stroke="#e3b29b" stroke-width="2"/>
      <ellipse cx="100" cy="88" rx="62" ry="60" fill="${SKIN}" stroke="#e3b29b" stroke-width="2"/>
      <path d="M39 80 Q36 28 100 25 Q164 28 161 80 Q154 58 138 50 Q104 62 64 46 Q46 58 39 80 Z" fill="${HAIR}"/>
      <path d="M58 50 Q66 10 118 12 Q150 14 156 46 Q132 28 106 36 Q86 42 76 58 Z" fill="${HAIR_LIGHT}" stroke="${HAIR}" stroke-width="2"/>
      <path d="M64 75 q11 -7 22 -1" fill="none" stroke="#d39a4d" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M114 74 q11 -6 22 1" fill="none" stroke="#d39a4d" stroke-width="3.5" stroke-linecap="round"/>
      ${eye(76)}${eye(124)}
      <circle cx="58" cy="113" r="11" fill="#f8a996" opacity=".55"/>
      <circle cx="142" cy="113" r="11" fill="#f8a996" opacity=".55"/>
      ${FRECKLES.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#d58a5f"/>`).join('')}
      <path d="M96 103 q4 5 8 0" fill="none" stroke="#dc9d80" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M76 119 Q100 127 124 119 Q117 141 100 141 Q83 141 76 119 Z" fill="#8a2c2c" stroke="#6d1f1f" stroke-width="2" stroke-linejoin="round"/>
      <path d="M79 122 Q100 129 121 122 L119 128 Q100 134 81 128 Z" fill="#fff"/>
      <path d="M91 137 Q100 132 109 137 Q100 142 91 137 Z" fill="#e2777a"/>
  `;

  const SVG = `<svg viewBox="0 0 200 270" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="100" cy="254" rx="62" ry="13" fill="${BLACK}"/>
    <ellipse cx="100" cy="249" rx="62" ry="13" fill="${GOLD}" stroke="${BLACK}" stroke-width="3"/>
    <g class="b-body">
      <path d="M48 176 L36 244 L14 247" fill="none" stroke="#c79a5b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="78" y="212" width="18" height="30" rx="6" fill="${BLACK}"/>
      <rect x="104" y="212" width="18" height="30" rx="6" fill="${BLACK}"/>
      <ellipse cx="84" cy="243" rx="15" ry="7" fill="#fff" stroke="${BLACK}" stroke-width="3"/>
      <ellipse cx="116" cy="243" rx="15" ry="7" fill="#fff" stroke="${BLACK}" stroke-width="3"/>
      <path d="M72 174 L50 204" stroke="${BLACK}" stroke-width="17" stroke-linecap="round"/>
      <circle cx="48" cy="207" r="10" fill="${GOLD}" stroke="${BLACK}" stroke-width="3"/>
      <g class="b-arm">
        <path d="M128 174 L154 150" stroke="${BLACK}" stroke-width="17" stroke-linecap="round"/>
        <circle cx="158" cy="146" r="10" fill="${GOLD}" stroke="${BLACK}" stroke-width="3"/>
      </g>
      <path d="M68 166 Q100 154 132 166 L128 220 Q100 228 72 220 Z" fill="${BLACK}"/>
      <path d="M70.6 203 Q100 211 129.4 203 L128.8 211 Q100 219 71.2 211 Z" fill="${GOLD}"/>
      <path d="M82 162 Q100 172 118 162" fill="none" stroke="${GOLD}" stroke-width="4"/>
      <text x="100" y="198" text-anchor="middle" font-family="system-ui, sans-serif" font-size="25" font-weight="900" font-style="italic" fill="${GOLD}">87</text>
      <path d="M91 160 l18 -4 l-18 -4 l18 -4" fill="none" stroke="#9aa0a6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <g class="b-head">${HEAD}</g>
  </svg>`;

  // {name} is swapped for the reader's name.
  const LINES = {
    home: ['Hi {name}! Ready to read?', 'Hey {name}! Let’s drop the puck.', 'Welcome back, {name}!', 'Game on, {name}! Pick a book.'],
    book: ['The gold one is next!', 'Which chapter today?', 'One chapter at a time, champ.'],
    chapter: ['You’ve got this, {name}!', 'Stuck on a word? Just tap it.', 'Tap a word twice to hear what it means.', 'Red dot means stop and take a breath.', 'Take your time. Good readers do.', 'Let’s go, {name}!'],
    word: ['Smart move, tapping that one.', 'Now you know a new word!', 'That’s how readers get stronger.', 'Tricky word. Nice work!'],
    halfway: ['Halfway there!', 'You’re flying, {name}!', 'Keep going. This is great reading!'],
    end: ['You made it! Quiz time?', 'Whole chapter done. Nice!', 'Ready to show what you know?'],
    quiz: ['Think back to the story.', 'You read it. You know it!', 'No rush, {name}.'],
    right: ['GOAL!', 'Yes, {name}!', 'Nailed it!', 'Top shelf!', 'What a shot!'],
    wrong: ['Shake it off. Next one!', 'Even Sid misses sometimes.', 'No worries. Keep going!'],
    star: ['A new star! That makes {n}.', 'Star number {n}, {name}!', 'Another star for my collection: {n}!'],
    pass: ['You did it, {name}!', 'What a reader!', 'Chapter in the net!'],
    perfect: ['PERFECT! Five for five!', 'Wow, {name}! Every single one!'],
    fail: ['So close! Let’s read it again.', 'Practice makes champions.', 'You’ll get it next time, {name}.'],
    finished: ['A WHOLE BOOK, {name}! Amazing!', 'You won the cup!'],
    tap: ['Bobble, bobble!', 'Readers are leaders!', 'Hee hee! That tickles.', 'I’m your biggest fan, {name}!', 'Go, {name}, go!', 'Look! I am holding {n} star{s} for you.', 'We have {n} star{s} so far!', 'Did you know? Pucks are frozen before a game.'],
  };
  const EXCITED = new Set(['right', 'star', 'pass', 'perfect', 'finished', 'tap', 'end']);

  const root = document.createElement('div');
  root.id = 'buddy';
  root.innerHTML = `<div class="bubble" role="status" aria-live="polite" hidden></div>
    <button class="figure" aria-label="Your reading buddy">${SVG}
      <svg class="stars" viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="50,4 65.3,31 95.6,37.2 74.7,60 78.2,90.8 50,78 21.8,90.8 25.3,60 4.4,37.2 34.7,31"
          fill="${GOLD}" stroke="${BLACK}" stroke-width="6" stroke-linejoin="round"/>
        <text x="50" y="65" text-anchor="middle" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="${BLACK}">0</text>
      </svg>
    </button>`;
  document.body.append(root);

  // The tab icon is just his head.
  const icon = document.getElementById('favicon') || document.head.appendChild(document.createElement('link'));
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg viewBox="20 4 160 152" xmlns="http://www.w3.org/2000/svg">${HEAD}</svg>`);

  const starBadge = root.querySelector('.stars');
  let stars = 0;
  // Show how many stars he is holding. With pop = true the star bounces (a new one was earned).
  function setStars(n, pop = false) {
    stars = n;
    const label = starBadge.querySelector('text');
    label.textContent = n;
    label.setAttribute('font-size', n > 99 ? 24 : n > 9 ? 30 : 34);
    if (pop) {
      starBadge.classList.remove('pop');
      void starBadge.getBoundingClientRect(); // restart the animation
      starBadge.classList.add('pop');
    }
  }
  const bubble = root.querySelector('.bubble');

  let name = 'friend';
  let hideTimer;
  let calmTimer;
  const last = {};

  function pick(moment) {
    const options = LINES[moment];
    let i;
    do i = Math.floor(Math.random() * options.length); while (options.length > 1 && i === last[moment]);
    last[moment] = i;
    return options[i].replace('{name}', name).replace('{n}', stars).replace('{s}', stars === 1 ? '' : 's');
  }

  function on(moment) {
    if (!LINES[moment]) return;
    bubble.textContent = pick(moment);
    bubble.hidden = false;
    root.classList.add('up');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(quiet, 4500);
    if (EXCITED.has(moment)) {
      root.classList.add('excited');
      clearTimeout(calmTimer);
      calmTimer = setTimeout(() => root.classList.remove('excited'), 1800);
    }
  }

  function quiet() {
    bubble.hidden = true;
    root.classList.remove('up');
  }

  root.querySelector('.figure').addEventListener('click', () => on('tap'));

  return { on, quiet, setStars, setName: (n) => { name = n; } };
})();
