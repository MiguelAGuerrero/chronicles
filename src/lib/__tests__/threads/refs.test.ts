import { test } from 'node:test';

// Moment references (specs/moment-references, decision 0125): a note mentions other moments with @.

test('RF2: a reference is a token in the note\'s body, and nothing else is written', { todo: 'test first' }, () => {});
test('RF3: the editor shows a reference as words, removes it whole, and saving keeps every one the text still holds', { todo: 'test first' }, () => {});
test('RF5: a reference to a moment no longer kept reads so and opens nothing; the text around it is unchanged', { todo: 'test first' }, () => {});
test('RF6: plain text reads every reference as words, never a raw token, for a placeless and a deleted moment too', { todo: 'test first' }, () => {});
test('RF7: what mentions a moment is read from notes, ordered by date, never by count', { todo: 'test first' }, () => {});
test('RF8: deleting a referenced moment never edits the note; deleting the note takes its references', { todo: 'test first' }, () => {});
