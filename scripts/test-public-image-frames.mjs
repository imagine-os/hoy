import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(p, 'utf8');
const arch = read('src/components/molecule/ClassArch/ClassArch.css');
const photo = read('src/modules/website/photography.css');
assert.match(arch, /\.classarch-arch\.natural-photo\s*\{[^}]*background-size:cover/);
assert.doesNotMatch(arch, /background-size:contain/);
assert.match(photo, /\.site-teacher \.mediaslot-media\s*\{[^}]*object-fit:cover; object-position:50% 35%/);
assert.match(photo, /\.teacher-studio-photo \.mediaslot-media\s*\{ object-position:center/);
assert.doesNotMatch(photo, /\.site-teacher \.mediaslot img/);
assert.match(photo, /\.photo-booking-banner img\s*\{[^}]*object-fit:cover/);
// These are complete compositions, not fixed photo frames.
assert.match(photo, /\.option1-finale-portraits img\s*\{[^}]*height:auto/);
const teachers = read('src/modules/website/pages/TeachersPage.tsx');
assert.match(teachers, /te\.photo_url \|\| teacherStudioPhoto/);
console.log('PASS public photo frame CSS, consistent edition crop rules, complete-artwork and CMS priority guards');
