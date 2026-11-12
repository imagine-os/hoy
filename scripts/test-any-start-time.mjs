// Hoy 12 Nov (owner): classes may start at any minute (the real timetable starts at :10 and 9:30). The Class schedule
// screen no longer refuses a start that isn't on the hour, and its copy no longer promises ":00 to :50".
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let failed = 0;
const test = async (name, fn) => { try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); } };

const ops = await readFile(new URL('../src/modules/classSchedule/live/scheduleOps.ts', import.meta.url), 'utf8');
const strings = await readFile(new URL('../src/modules/classSchedule/live/strings.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/modules/classSchedule/live/LiveSchedulePage.tsx', import.meta.url), 'utf8');

await test('no on-the-hour rule is left in the schedule checks', () => {
  assert.doesNotMatch(ops, /on_the_hour/, 'scheduleOps still names on_the_hour');
  assert.doesNotMatch(ops, /endsWith\(':00'\)/, 'scheduleOps still requires :00');
});
await test('the screen copy no longer says classes run from :00 to :50, in es and en', () => {
  assert.doesNotMatch(strings, /:00 a :50|:00 to :50/);
  assert.doesNotMatch(strings, /live\.problem\.on_the_hour/, 'the refusal copy for the removed rule is gone');
});
await test('the start field steps by the minute, not the hour (a :10 start is not a native step mismatch)', () => {
  const field = page.match(/<Input id=\{id\} type="time"[^>]*start_time[^>]*>/);
  assert.ok(field, 'the start time input is found');
  assert.doesNotMatch(field[0], /step=\{3600\}/, 'step 3600 makes 07:10 invalid');
  assert.match(field[0], /step=\{60\}/, 'one-minute steps');
});
await test('classes still last 50 minutes, said in both languages', () => {
  assert.match(strings, /'live\.intro':\s*\{\s*es:\s*'[^']*50 minutos/);
  assert.match(strings, /en:\s*'[^']*50 minutes/);
});

console.log(failed ? `\n${failed} start-time check(s) failed` : '\nstart-time checks passed');
process.exitCode = failed ? 1 : 0;
