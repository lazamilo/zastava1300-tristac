import { SplitText } from './gsap.js';

const wordSplits = new Map();
const lineSplits = new Map();

// Splits every word statement once; line splits are created on demand by their owners.
export function initSplit(root = document) {
  root.querySelectorAll('[data-words]').forEach((el) => {
    if (wordSplits.has(el)) return;
    wordSplits.set(el, SplitText.create(el, { type: 'words', wordsClass: 'split-word', aria: 'auto' }));
  });
  document.documentElement.classList.add('is-split');
  return { words: wordSplits, lines: lineSplits };
}

export function getWords(el) {
  return wordSplits.get(el)?.words ?? [];
}

// Splits a heading into masked lines and re-splits on width changes.
// `build(lines)` returns the reveal animation so progress survives a re-split.
export function splitLines(el, build) {
  lineSplits.get(el)?.revert();
  const split = SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'split-line',
    aria: 'auto',
    autoSplit: true,
    onSplit: (self) => build(self.lines)
  });
  lineSplits.set(el, split);
  return split;
}
