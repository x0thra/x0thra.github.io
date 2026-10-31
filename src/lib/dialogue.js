const INNER_WIDTH = 60;
const KEY_WIDTH = 12;

function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxWidth) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function makeBorder(label = '') {
  if (!label) {
    return `+${'-'.repeat(INNER_WIDTH)}+`;
  }
  const tag = `-[ ${label} ]`;
  return `+${tag}${'-'.repeat(INNER_WIDTH - tag.length)}+`;
}

function makeEmptyLine() {
  return `|${' '.repeat(INNER_WIDTH)}|`;
}

function formatKeyValue(key, value, keyWidth = KEY_WIDTH) {
  const content = `  ${key.padEnd(keyWidth, ' ')} :  ${value}`;
  return `|${content.padEnd(INNER_WIDTH, ' ')}|`;
}

function formatCenteredLine(text) {
  const leftPad = Math.max(0, Math.floor((INNER_WIDTH - text.length) / 2));
  const content = `${' '.repeat(leftPad)}${text}`;
  return `|${content.padEnd(INNER_WIDTH, ' ')}|`;
}

function formatBlockText(text) {
  const maxWidth = INNER_WIDTH - 4;
  return wrapText(text, maxWidth).map((line) => {
    const content = `  ${line}`;
    return `|${content.padEnd(INNER_WIDTH, ' ')}|`;
  });
}

function buildAboutPanel() {
  const empty = makeEmptyLine();

  const lines = [
    makeBorder('x0thra'),
    empty,
    formatKeyValue('Name', 'x0thra'),
    formatKeyValue('Age', '19'),
    formatKeyValue('Sign', 'Cancer'),
    formatKeyValue('Personality', 'ISFP-T 9w1'),
    formatKeyValue('Music taste', 'Metal, Rock'),
    empty,
    makeBorder('likes'),
    empty,
    ...formatBlockText(
      'Listening to music, night walks, gaming, coding stuff, computers and electronics, touching grass (unlike you)'
    ),
    empty,
    makeBorder('not a fan of'),
    empty,
    ...formatBlockText(
      'Liars, one-on-one conversations, complex topics, over-the-top "woke"'
    ),
    empty,
    makeBorder()
  ];

  return lines.join('\n');
}

function buildSystemInfoPanel() {
  const empty = makeEmptyLine();
  const sysKeyWidth = 17;

  const lines = [
    makeBorder('system info'),
    empty,
    formatKeyValue('Host', 'x0thra.github.io / x0thra.lol', sysKeyWidth),
    formatKeyValue('Technologies Used', 'Svelte 5, Vite, Tailwind CSS', sysKeyWidth),
    formatKeyValue('Source Code', 'github.com/x0thra/x0thra.github.io', sysKeyWidth),
    empty,
    formatCenteredLine('Made by x0thra'),
    empty,
    makeBorder()
  ];

  return lines.join('\n');
}

export const DIALOGUE_STRINGS = {
  connectPrompt: '[ click or press any key to start the connection ]',
  bootSteps: [
    { text: 'connecting to server...', delay: 550 },
    { text: 'gathering info...', delay: 650 }
  ],
  bootConnected: 'connected.',
  bootAborted: 'connection aborted.',
  mobileWarningLines: [
    'warning: mobile device detected.',
    'this website is designed for desktop screens and may look cramped here.',
    'continue anyway?'
  ],
  rootQuestion: 'What are you looking for?',
  securityCheck: 'Hold on, checking something...',
  untrustedPrompt: "I don't trust you.",
  untrustedWhyResponse: 'I think you know the reason better than I do.',
  aboutContent: buildAboutPanel(),
  systemInfoContent: buildSystemInfoPanel(),
  sourceRepoUrl: 'https://github.com/x0thra/x0thra.github.io',
  isThisAllResponse: 'For now, yes. Maybe more info will be here later.',
  whatIsThisPlaceContent: [
    "It's just my personal website. There's no real system behind this screen, just a simple page I put together.",
    '',
    'Just so you know, your IP gets checked once when you enter to keep bots, proxies, and weirdos out. Other than that, nothing about you is saved.'
  ].join('\n'),
  lookingAroundIntro: 'Alright. Go ahead and look around.',
  lookLeftResponse: 'Nothing there. Just darkness.',
  lookRightResponse: 'Still nothing. What did you expect to find?',
  lookBehindSuspense: '...',
  lookBehindFollowup: "Just kidding. Let's get back to the point.",
  dontKnowResponse: "If you don't even know what you're doing here, then you shouldn't be here.",
  options: {
    whosX0thra: "Who's x0thra?",
    justLooking: 'Just looking around',
    whatIsThis: 'What is this place?',
    systemInfo: 'System info',
    viewSource: 'View source code (GitHub)',
    dontKnow: "I don't know",
    isThisAll: 'Is this all?',
    why: 'Why?',
    goBack: 'Go back',
    lookLeft: 'Look left',
    lookRight: 'Look right',
    lookBehind: 'Look behind you'
  }
};
