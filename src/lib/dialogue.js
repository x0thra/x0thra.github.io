const INNER_WIDTH = 58;
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

function formatKeyValue(key, value) {
  const content = `  ${key.padEnd(KEY_WIDTH, ' ')} :  ${value}`;
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

export const DIALOGUE_STRINGS = {
  connectPrompt: 'click anywhere or press any key',
  rootQuestion: 'What are you looking for?',
  securityCheck: 'Hold on, checking something...',
  untrustedPrompt: "I don't trust you.",
  untrustedWhyResponse: 'I think you know the reason better than I do.',
  aboutContent: buildAboutPanel(),
  isThisAllResponse: 'For now, yes. Maybe more info will be here later.',
  whatIsThisPlaceContent: [
    "It's just my personal website. There's no real system behind this screen, just a simple page I put together.",
    '',
    'Just so you know, your IP gets checked once when you enter to keep bots, proxies, and weirdos out. Other than that, nothing about you is saved.'
  ].join('\n'),
  lookingAroundResponse: "Sure. Feel free to stare at an empty black screen for a bit. I'll wait.",
  dontKnowResponse: "If you don't even know what you're doing here, then you shouldn't be here.",
  options: {
    whosX0thra: "Who's x0thra?",
    justLooking: 'Just looking around',
    whatIsThis: 'What is this place?',
    dontKnow: "I don't know",
    isThisAll: 'Is this all?',
    why: 'Why?',
    goBack: 'Go back'
  }
};
