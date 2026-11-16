/** Narrow, dependency-free OOXML export. No API calls, external links, macros, shared strings or executable user formulas. */
export interface ScheduleExportRow { date: number; time: string; title: string; teacher: string; room: string; booked: number; capacity: number; status: string; category: string }
type Row = Record<string, unknown>;
const statuses: Record<string,string> = { scheduled: 'Activa', cancelled: 'Cancelada', completed: 'Finalizada' };
export function occupancyCategory(booked: number, capacity: number, status: string): string {
  const rate = capacity === 0 ? 0 : booked / capacity;
  return status === 'cancelled' ? 'Cancelada' : rate >= 1 ? 'Llena' : rate >= .75 ? 'Alta (75-99%)' : rate >= .4 ? 'Media (40-74%)' : rate > 0 ? 'Baja (1-39%)' : 'Vacía (0%)';
}
/** Only occurrence snapshots, never schedule/template capacity or assignments. Invalid/incomplete data fails closed. */
export function exportRows(rows: Row[], teacher: (id: unknown)=>string, room: (id: unknown)=>string, timeZone: string): ScheduleExportRow[] {
  if (rows.length >= 5000) throw new Error('export_incomplete'); // queryAll's hard cap is not proof of completeness.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hourCycle:'h23' });
  return rows.map(row => {
    const start = new Date(typeof row.starts_at === 'string' ? row.starts_at : '');
    const booked = row.booked_count, capacity = row.capacity, status = typeof row.status === 'string' ? row.status : '';
    if (!Number.isFinite(start.getTime()) || typeof booked !== 'number' || !Number.isInteger(booked) || booked < 0 || typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 0 || !statuses[status]) throw new Error('export_invalid');
    const p: Record<string,number> = {}; for (const part of parts.formatToParts(start)) if (part.type !== 'literal') p[part.type] = Number(part.value);
    const date = Math.round((Date.UTC(p.year,p.month-1,p.day)-Date.UTC(1899,11,30))/86400000);
    return { date, time:`${p.hour % 12 || 12}:${String(p.minute).padStart(2,'0')} ${p.hour < 12 ? 'a. m.' : 'p. m.'}`, title:typeof row.title === 'string' ? row.title : '', teacher:teacher(row.coach), room:room(row.resource), booked, capacity, status:statuses[status], category:occupancyCategory(booked,capacity,status) };
  });
}
const esc = (v: string) => v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const xml = (s: string) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+s;
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const colors = ['92D050','E5B8B7','FFFF00','FF0000','EDEDED']; // source workbook's whole-row fills; cancellation neutral.
const categoryColors = ['92D050','FFE699','C6E0B4','DDEBF7','EDEDED','BFBFBF'];
function styles() {
  const fill = (c:string) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fonts='<fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts>';
  const fills=`<fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fill('1F4E78')}${colors.map(fill).join('')}</fills>`;
  const border=(color:string)=>`<border>${['left','right','top','bottom'].map(side=>`<${side} style="thin"><color rgb="FF${color}"/></${side}>`).join('')}<diagonal/></border>`;
  const xf = (fillId:number,numFmtId:number,align:string,fontId=0,borderId=1)=>`<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${align}" vertical="${fontId?'center':'bottom'}" wrapText="1"/></xf>`;
  const cellXfs=`<cellXfs count="22"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>${xf(2,0,'center',1,2)}${colors.map((_,i)=>[xf(i+3,0,'center'),xf(i+3,0,'left'),xf(i+3,164,'center'),xf(i+3,9,'center')].join('')).join('')}</cellXfs>`;
  return xml(`<styleSheet xmlns="${NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>${fonts}${fills}<borders count="3"><border/>${border('BFBFBF')}${border('000000')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>${cellXfs}<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="6">${categoryColors.map(c=>`<dxf>${fill(c)}</dxf>`).join('')}</dxfs></styleSheet>`);
}
function sheet(rows: ScheduleExportRow[]) {
  const headers=['Fecha','Hora','Clase','Instructor/a','Salón','Inscritos','Capacidad','% Llenado','Categoría','Estado'];
  const text=(ref:string,value:string,style:number)=>`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
  const number=(ref:string,value:number,style:number)=>`<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  const data=rows.map((r,i)=>{
    const n=i+2, rate=r.capacity===0?0:r.booked/r.capacity;
    const fill=r.status==='Cancelada'?4:rate>=.75?0:rate>=.4?2:rate>0?1:3, center=2+fill*4, left=center+1,date=center+2,percent=center+3;
    const formula=`IF(J${n}="Cancelada","Cancelada",IF(H${n}>=1,"Llena",IF(H${n}>=0.75,"Alta (75-99%)",IF(H${n}>=0.4,"Media (40-74%)",IF(H${n}>0,"Baja (1-39%)","Vacía (0%)")))))`;
    return `<row r="${n}">${number('A'+n,r.date,date)}${text('B'+n,r.time,center)}${text('C'+n,r.title,left)}${text('D'+n,r.teacher,left)}${text('E'+n,r.room,left)}${number('F'+n,r.booked,center)}${number('G'+n,r.capacity,center)}<c r="H${n}" s="${percent}"><f>IF(G${n}=0,0,F${n}/G${n})</f><v>${rate}</v></c><c r="I${n}" s="${center}" t="str"><f>${esc(formula)}</f><v>${esc(r.category)}</v></c>${text('J'+n,r.status,center)}</row>`;
  }).join('');
  const last=rows.length+1;
  const rules=[['Llena',5],['Alta',4],['Media',5],['Baja',4],['Vacía',5],['Cancelada',9]].map(([label,len],i)=>`<cfRule type="expression" dxfId="${i}" priority="${i+1}"><formula>${esc(`LEFT($I2,${len})="${label}"`)}</formula></cfRule>`).join('');
  return xml(`<worksheet xmlns="${NS}"><dimension ref="A1:J${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${[12,11,34,22,17,10,11,11,17,12].map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData><row r="1">${headers.map((h,i)=>text(String.fromCharCode(65+i)+'1',h,1)).join('')}</row>${data}</sheetData><autoFilter ref="A1:J${last}"/>${rows.length?`<conditionalFormatting sqref="I2:I${last}">${rules}</conditionalFormatting>`:''}<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0" footer="0"/><pageSetup orientation="portrait"/></worksheet>`);
}
/** ZIP method0 (stored), UTF8 filenames, CRC32; bounded <5000-row workbook stays comfortably below ZIP32 limits. */
function zip(files: Record<string,string>): Uint8Array {
  const encoder=new TextEncoder(), locals:Uint8Array[]=[], central:Uint8Array[]=[]; let offset=0;
  const crc=(bytes:Uint8Array)=>{let n=0xffffffff;for(const b of bytes){n^=b;for(let j=0;j<8;j++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;};
  for(const [name,content] of Object.entries(files)) {
    const path=encoder.encode(name),bytes=encoder.encode(content),sum=crc(bytes),head=new Uint8Array(30+path.length),v=new DataView(head.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,sum,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,path.length,true);head.set(path,30);locals.push(head,bytes);
    const dir=new Uint8Array(46+path.length),d=new DataView(dir.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,0x21,true);d.setUint32(16,sum,true);d.setUint32(20,bytes.length,true);d.setUint32(24,bytes.length,true);d.setUint16(28,path.length,true);d.setUint32(42,offset,true);dir.set(path,46);central.push(dir);offset+=head.length+bytes.length;
  }
  const size=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
  const out=new Uint8Array(offset+size+22);let at=0;for(const bytes of [...locals,...central,end]){out.set(bytes,at);at+=bytes.length;}return out;
}
export function scheduleWorkbook(rows: ScheduleExportRow[]): Uint8Array {
  if(rows.length>=5000)throw new Error('export_incomplete');
  const relNS='http://schemas.openxmlformats.org/package/2006/relationships',office='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zip({
    '[Content_Types].xml':xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
    '_rels/.rels':xml(`<Relationships xmlns="${relNS}"><Relationship Id="rId1" Type="${office}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml':xml(`<workbook xmlns="${NS}" xmlns:r="${office}"><bookViews><workbookView/></bookViews><sheets><sheet name="Clases" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`),
    'xl/_rels/workbook.xml.rels':xml(`<Relationships xmlns="${relNS}"><Relationship Id="rId1" Type="${office}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${office}/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml':styles(), 'xl/worksheets/sheet1.xml':sheet(rows),
  });
}
export function downloadScheduleWorkbook(rows: ScheduleExportRow[]): void {
  const bytes=scheduleWorkbook(rows),blob=new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download='clases_ocupacion.xlsx';document.body.appendChild(anchor);
  try {anchor.click();} finally {anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
