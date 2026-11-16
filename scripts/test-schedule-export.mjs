import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const target = new URL('../src/modules/classSchedule/live/scheduleExport.ts', import.meta.url);
assert.ok(existsSync(target), 'export implementation exists');
const { scheduleWorkbook, occupancyCategory, exportRows } = await import(target.href);
assert.equal(occupancyCategory(0, 0, 'scheduled'), 'Vacía (0%)');
assert.equal(occupancyCategory(4, 10, 'scheduled'), 'Media (40-74%)');
assert.equal(occupancyCategory(3, 4, 'scheduled'), 'Alta (75-99%)');
assert.equal(occupancyCategory(5, 4, 'scheduled'), 'Llena');
assert.equal(occupancyCategory(0, 4, 'cancelled'), 'Cancelada');
const records = ['scheduled','cancelled','completed'].map((status,i)=>({id:'fictional-'+i,starts_at:'2026-11-20T02:10:00Z',title:i?'Clase ficticia':'=HYPERLINK("bad") & <Prueba>',coach:'teacher-a',resource:'room-a',booked_count:i===0?0:3,capacity:i===0?0:4,status}));
const rows=exportRows(records,()=> 'Profesora ficticia Ángela',()=> 'Salón ficticio', 'America/Bogota');
assert.equal(rows[0].date,46345); assert.equal(rows[0].time,'9:10 p. m.');
assert.equal(rows[0].title,records[0].title); assert.equal(rows[1].status,'Cancelada'); assert.equal(rows[2].status,'Finalizada');
assert.throws(()=>exportRows([{...records[0],starts_at:'not-a-date'}],()=>'',()=>'','America/Bogota'));
assert.throws(()=>exportRows([{...records[0],booked_count:undefined}],()=>'',()=>'','America/Bogota'));
assert.throws(()=>exportRows([{...records[0],status:'unknown'}],()=>'',()=>'','America/Bogota'));
assert.throws(()=>exportRows(Array(5000).fill(records[0]),()=>'',()=>'','America/Bogota'));
function unpack(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), files={};let at=0;const dec=new TextDecoder();
  while(v.getUint32(at,true)===0x04034b50){
    assert.equal(v.getUint16(at+8,true),0); const size=v.getUint32(at+18,true),nameLength=v.getUint16(at+26,true),extra=v.getUint16(at+28,true),name=dec.decode(bytes.slice(at+30,at+30+nameLength)),start=at+30+nameLength+extra,body=bytes.slice(start,start+size);
    assert.equal(crc32(body),v.getUint32(at+14,true));files[name]=dec.decode(body);at=start+size;
  }
  assert.equal(v.getUint32(at,true),0x02014b50);assert.equal(v.getUint32(bytes.length-22,true),0x06054b50);assert.equal(v.getUint16(bytes.length-12,true),6);
  return files;
}
for (const n of [0,1,500]) {
  const f=unpack(scheduleWorkbook(Array.from({length:n},(_,i)=>rows[i%3])));assert.equal(Object.keys(f).length,6);const sheet=f['xl/worksheets/sheet1.xml'];assert.match(sheet,new RegExp(`dimension ref="A1:J${n+1}"`));assert.equal((sheet.match(/<row /g)||[]).length,n+1);assert.equal(sheet.includes('<conditionalFormatting'),n>0);
}
const parsed=unpack(scheduleWorkbook(rows));assert.match(parsed['xl/worksheets/sheet1.xml'],/t="inlineStr"><is><t xml:space="preserve">=HYPERLINK\(&quot;bad&quot;\) &amp; &lt;Prueba&gt;/);assert.ok(!Object.keys(parsed).some(n=>/external|vba/i.test(n)));
assert.match(parsed['xl/worksheets/sheet1.xml'],/<f>IF\(G2=0,0,F2\/G2\)<\/f><v>0<\/v>/);

const out=scheduleWorkbook(rows); writeFileSync('/tmp/hoy-schedule-fictional.xlsx',out);
const page=readFileSync(new URL('../src/modules/classSchedule/live/LiveSchedulePage.tsx',import.meta.url),'utf8');
assert.match(page,/q\.current/); assert.match(page,/!q\.loading && !q\.error/);
console.log('schedule export contracts PASS; fictional workbook /tmp/hoy-schedule-fictional.xlsx');
