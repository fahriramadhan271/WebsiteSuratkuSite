/* ==========================================================================
   main.js : bagian yang bekerja di halaman.
   - data isian (state), langkah 1 sampai 4, pratinjau kertas
   - tombol Salin / PDF / Word / TXT
   - tombol AI (memanggil backend di /api/generate)
   Prompt untuk AI TIDAK ada di sini. Prompt ada di prompts.py (backend).
   ========================================================================== */
'use strict';

/* ---------- state ---------- */
var KEY='suratku-draft-v1';
function pad2(n){ return (n<10?'0':'')+n; }
function todayISO(){ var d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function blank(type){
  type=type||'lamaran';
  var ty=TYPES[type];
  return {type:type,template:'classic',step:1,example:false,bodyAuto:true,
    name:'',orgName:'',role:'',address:'',phone:'',email:'',city:'',date:todayISO(),
    recTitle:ty.kepada,recOrg:'',recPlace:'',nomor:'',lampiran:ty.lampiran,perihal:defPerihal(type,''),
    fieldA:'',detail:'',tone:'formal',length:'sedang',body:'',
    sig:'',sigRatio:3,sigOn:true};
}
function exampleState(){
  var s=blank('lamaran');
  s.example=true; s.name='Rina Maharani'; s.address='Jl. Melati No. 24, Bandung 40131'; s.phone='0812-3456-7890'; s.email='rina.maharani@email.com';
  s.city='Bandung'; s.recOrg='PT Nusantara Digital Teknologi'; s.recPlace='Tempat';
  s.fieldA='Staf Administrasi';
  s.detail='Lulusan S1 Manajemen tahun 2024, pernah magang enam bulan di bagian administrasi, menguasai Microsoft Office dan Google Workspace.';
  s.perihal=defPerihal('lamaran',s.fieldA);
  s.body=defaultBody(s);
  return s;
}
var state=exampleState();
try{
  var saved=JSON.parse(localStorage.getItem(KEY)||'null');
  if(saved && TYPES[saved.type]){ state=Object.assign(blank(saved.type),saved,{example:false,step:1}); }
}catch(e){}
if(state.bodyAuto && !state.body) state.body=defaultBody(state);

/* ---------- helpers ---------- */
function $(s){ return document.querySelector(s); }
function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
var paper=$('#paper'), app=$('#app');
var FIELDS=['name','orgName','role','address','phone','email','city','date','recTitle','recOrg','recPlace','nomor','lampiran','perihal','fieldA','detail','tone','length','body'];
var toastTimer=null;
function toast(msg){
  var t=$('#toast'); t.textContent=msg; t.hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(function(){ t.hidden=true; },2600);
}
function setVal(k){ var el=$('#f-'+k); if(el && el.value!==state[k]) el.value=state[k]; }

/* ---------- build type cards ---------- */
(function(){
  var host=$('#typeChoices');
  Object.keys(TYPES).forEach(function(k){
    var lab=document.createElement('label'); lab.className='choice';
    var inp=document.createElement('input'); inp.type='radio'; inp.name='type'; inp.value=k;
    var card=document.createElement('span'); card.className='card';
    var b=document.createElement('b'); b.textContent=TYPES[k].label;
    var sp=document.createElement('span'); sp.textContent=TYPES[k].hint;
    card.append(b,sp); lab.append(inp,card); host.append(lab);
  });
})();

/* ---------- preview ---------- */
function pt(n){ return 'calc('+n+' * var(--pt))'; }
function renderPreview(){
  var blocks=buildBlocks(state), frag=document.createDocumentFragment();
  blocks.forEach(function(b){
    var el=document.createElement('div');
    if(b.t==='gap'){ el.style.height=pt(b.h); }
    else if(b.t==='sig'){
      el.style.height=pt(b.h); el.style.marginLeft=(b.indent*100)+'%';
      var im=document.createElement('img'); im.className='sigimg'; im.alt='Tanda tangan'; im.src=b.src; el.append(im);
    }
    else if(b.t==='rule'){
      el.className='rule '+b.kind; el.style.borderBottomColor='var(--paper-'+(b.color||'ink')+')'; el.style.marginBottom=pt(b.after||0);
    } else if(b.t==='meta'){
      b.rows.forEach(function(r){
        var row=document.createElement('div'); row.className='mrow';
        var a=document.createElement('span'); a.textContent=r[0];
        var c=document.createElement('span'); c.textContent=':';
        var v=document.createElement('span'); v.textContent=r[1];
        row.append(a,c,v); el.append(row);
      });
      el.style.marginBottom=pt(b.after||0);
    } else {
      el.className='p'; el.textContent=b.text;
      if(b.size) el.style.fontSize=pt(b.size);
      if(b.bold) el.style.fontWeight='700';
      if(b.align) el.style.textAlign=b.align;
      if(b.indent) el.style.marginLeft=(b.indent*100)+'%';
      el.style.color='var(--paper-'+(b.color||'ink')+')';
      el.style.marginBottom=pt(b.after||0);
    }
    frag.append(el);
  });
  paper.textContent=''; paper.append(frag);
  var r=paper.getBoundingClientRect();
  if(r.width>0){
    var pages=Math.max(1,Math.ceil(r.height/(r.width*297/210)-0.01));
    $('#pageInfo').textContent=pages+' halaman A4 (perkiraan)';
  }
}
var raf=0;
function changed(){
  if(!raf) raf=requestAnimationFrame(function(){ raf=0; renderPreview(); });
  try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
}

/* ---------- ui sync ---------- */
function syncAll(){
  FIELDS.forEach(setVal);
  $$('input[name="type"]').forEach(function(r){ r.checked=r.value===state.type; });
  $$('input[name="template"]').forEach(function(r){ r.checked=r.value===state.template; });
  var ty=TYPES[state.type];
  $('#lbl-fieldA').textContent=ty.fieldA;
  $('#f-fieldA').placeholder=ty.phA;
  $('#f-detail').placeholder=ty.phDetail;
  $('#orgField').hidden=state.template!=='kop';
  $('#exBanner').hidden=!state.example;
  showStep(state.step||1);
}
function showStep(n){
  state.step=n;
  $$('.panel').forEach(function(p){ p.hidden=+p.dataset.step!==n; });
  $$('#steps button').forEach(function(b){ b.setAttribute('aria-selected',String(+b.dataset.step===n)); });
}
function setView(v){
  app.dataset.view=v;
  $$('.viewtabs button').forEach(function(b){ b.setAttribute('aria-selected',String(b.dataset.view===v)); });
  if(v==='preview') renderPreview();
}
function endExample(){ if(state.example){ state.example=false; $('#exBanner').hidden=true; } }

function onField(k,v){
  if(k!=='tone' && k!=='length') endExample();
  var oldPer=defPerihal(state.type,state.fieldA);
  state[k]=v;
  if(k==='fieldA' && (!state.perihal || state.perihal===oldPer)){ state.perihal=defPerihal(state.type,v); setVal('perihal'); }
  if(k==='body') state.bodyAuto=false;
  if(state.bodyAuto && k!=='body' && k!=='tone' && k!=='length'){ state.body=defaultBody(state); setVal('body'); }
  changed();
}
FIELDS.forEach(function(k){
  var el=$('#f-'+k);
  el.addEventListener('input',function(){ onField(k,el.value); });
});

$('#typeChoices').addEventListener('change',function(e){
  if(e.target.name!=='type') return;
  var old=state.type, nv=e.target.value, keepT=state.template, keepStep=state.step;
  if(state.example){
    state=blank(nv); state.template=keepT; state.step=keepStep;
  } else {
    var oldTy=TYPES[old], ty=TYPES[nv];
    if(!state.perihal || state.perihal===oldTy.perihal(state.fieldA.trim())) state.perihal=ty.perihal(state.fieldA.trim());
    if(!state.lampiran || state.lampiran===oldTy.lampiran) state.lampiran=ty.lampiran;
    if(!state.recTitle || state.recTitle===oldTy.kepada) state.recTitle=ty.kepada;
    state.type=nv;
    if(state.bodyAuto) state.body=defaultBody(state);
  }
  syncAll(); changed();
});
$('#tplChoices').addEventListener('change',function(e){
  if(e.target.name!=='template') return;
  state.template=e.target.value; $('#orgField').hidden=state.template!=='kop'; changed();
});
$('#clearAll').addEventListener('click',function(){
  var t=state.template; state=blank(state.type); state.template=t; state.step=1;
  state.body=defaultBody(state); syncAll(); changed();
});
$('#autoBody').addEventListener('click',function(){
  state.bodyAuto=true; state.body=defaultBody(state); setVal('body'); changed();
  $('#aiStatus').textContent='Isi otomatis dipasang. Ubah sesuai kebutuhan.';
});
$$('[data-go]').forEach(function(b){ b.addEventListener('click',function(){ showStep(+b.dataset.go); window.scrollTo(0,0); }); });
$$('#steps button').forEach(function(b){ b.addEventListener('click',function(){ showStep(+b.dataset.step); }); });
$$('.viewtabs button').forEach(function(b){ b.addEventListener('click',function(){ setView(b.dataset.view); }); });
$('#toPreview').addEventListener('click',function(){ setView('preview'); window.scrollTo(0,0); });

/* ---------- copy and files ---------- */
$('#bCopy').addEventListener('click',async function(){
  var text=toText(buildBlocks(state));
  try{ await navigator.clipboard.writeText(text); toast('Surat disalin'); return; }catch(e){}
  try{
    var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.append(ta); ta.select(); var ok=document.execCommand('copy'); ta.remove();
    toast(ok?'Surat disalin':'Browser menolak menyalin. Salin dari kolom teks surat.');
  }catch(e){ toast('Browser menolak menyalin. Salin dari kolom teks surat.'); }
});
function slug(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
function fileBase(){ return ['Surat',slug(TYPES[state.type].label),slug(state.name)].filter(Boolean).join('-'); }
var DL=null, SAMPLE=null;
async function saveAs(kind){
  if(!DL){ toast('Unduhan tidak tersedia di tampilan ini'); return; }
  var blocks=buildBlocks(state), data, name=fileBase();
  try{
    if(kind==='pdf'){
      if(!window.jspdf){ toast('Pustaka PDF belum termuat. Coba lagi sebentar lagi.'); return; }
      data=toPDF(window.jspdf.jsPDF,blocks).output('blob'); name+='.pdf';
    } else if(kind==='docx'){
      if(!window.JSZip){ toast('Pustaka Word belum termuat. Coba lagi sebentar lagi.'); return; }
      var zip=new window.JSZip();
      zip.file('[Content_Types].xml',DOCX_TYPES); zip.file('_rels/.rels',DOCX_RELS); zip.file('word/document.xml',toDocXml(blocks));
      var ex=docxExtras(blocks);
      if(ex.png){ zip.file('word/media/sig.png',ex.png,{base64:true}); zip.file('word/_rels/document.xml.rels',ex.rels); }
      data=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}); name+='.docx';
    } else { data=toText(blocks); name+='.txt'; }
    await DL.save({filename:name,data:data});
    toast('File siap disimpan');
  }catch(e){
    if(e && e.code==='declined') return;
    toast('Gagal menyiapkan file. Coba lagi.');
  }
}
$('#bPrint').addEventListener('click',function(){ renderPreview(); window.print(); });
$('#bPdf').addEventListener('click',function(){ saveAs('pdf'); });
$('#bDocx').addEventListener('click',function(){ saveAs('docx'); });
$('#bTxt').addEventListener('click',function(){ saveAs('txt'); });

/* ---------- AI ---------- */
var ctl=null;
function cleanAI(t){
  t=String(t||'').replace(/```[a-z]*\n?/g,'').replace(/\*\*/g,'').replace(/^#+\s*/gm,'').trim();
  t=t.replace(/^\s*dengan hormat,?\s*\n+/i,'');
  t=t.replace(/\n+\s*(hormat saya|hormat kami|hormat,)[\s\S]*$/i,'');
  return t.replace(/\n{3,}/g,'\n\n').trim();
}
function aiCopy(code){
  switch(code){
    case 'rate_limited': return 'Terlalu sering memakai AI. Coba lagi beberapa saat lagi.';
    case 'session_expired': return 'Sesi Anda berakhir. Masuk lagi lalu coba kembali.';
    case 'refused': return 'Permintaan ini ditolak. Ubah keterangannya lalu coba lagi.';
    case 'prompt_too_large': return 'Teks terlalu panjang. Persingkat keterangan atau teks surat.';
    default: return 'AI gagal menulis. Coba lagi.';
  }
}
function setBusy(b){
  $('#aiWrite').disabled=b; $('#aiPolish').disabled=b; $('#autoBody').disabled=b; $('#aiStop').hidden=!b;
}
async function runAI(mode){
  if(!SAMPLE) return;
  var prev=state.body, prevAuto=state.bodyAuto;
  if(mode==='polish' && !String(state.body||'').trim()){ $('#aiStatus').textContent='Tulis atau isi teks surat dulu, lalu rapikan dengan AI.'; return; }
  var prompt={mode:mode,type:state.type,name:state.name,role:state.role,recTitle:state.recTitle,recOrg:state.recOrg,perihal:state.perihal,fieldA:state.fieldA,detail:state.detail,tone:state.tone,length:state.length,body:mode==='polish'?state.body:''};
  ctl=new AbortController(); setBusy(true); endExample();
  $('#aiStatus').textContent='AI sedang menulis...';
  var got=false;
  function put(t){ state.body=cleanAI(t); state.bodyAuto=false; setVal('body'); changed(); }
  try{
    var r=await SAMPLE(prompt,{signal:ctl.signal});
    put(r.text);
    $('#aiStatus').textContent=r.truncated?'Tulisan terpotong. Pilih panjang yang lebih singkat atau lanjutkan sendiri.':'Selesai. Periksa dan ubah sesuai kebutuhan.';
  }catch(e){
    var code=e&&e.code;
    if(code==='cancelled'){ $('#aiStatus').textContent=got?'Dihentikan. Tulisan sebagian dipertahankan.':'Dihentikan.'; }
    else {
      if(code==='not_granted'||code==='sampling_disabled'||code==='not_declared'||code==='capability_disabled'||code==='capability_removed'){
        SAMPLE=null; applyCaps();
      }
      if(e && e.text && code!=='refused'){ put(e.text); }
      else if(!got || code==='refused'){ state.body=prev; state.bodyAuto=prevAuto; setVal('body'); changed(); }
      $('#aiStatus').textContent=(code==='not_granted')?'AI tidak diizinkan untuk halaman ini. Isi otomatis tetap bisa dipakai.':aiCopy(code);
    }
  }finally{ setBusy(false); ctl=null; }
}
$('#aiWrite').addEventListener('click',function(){ runAI('write'); });
$('#aiPolish').addEventListener('click',function(){ runAI('polish'); });
$('#aiStop').addEventListener('click',function(){ if(ctl) ctl.abort(); });

async function callAI(payload,opts){
  var res;
  try{
    res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:opts&&opts.signal});
  }catch(e){
    if(e && e.name==='AbortError') throw {code:'cancelled',message:'dibatalkan'};
    throw {code:'upstream_error',message:'server tidak terjangkau'};
  }
  var data=null; try{ data=await res.json(); }catch(e){}
  if(!res.ok){
    var code=res.status===429?'rate_limited':res.status===503?'sampling_disabled':res.status===422?'invalid_request':'upstream_error';
    throw {code:code,message:(data&&data.detail)||'gagal'};
  }
  return {text:data.text,truncated:!!data.truncated};
}

function applyCaps(){
  $('#aiWrite').hidden=!SAMPLE; $('#aiPolish').hidden=!SAMPLE; $('#aiOpts').hidden=!SAMPLE;
  $('#aiNote').hidden=!!SAMPLE;
  $('#bPdf').hidden=!DL; $('#bDocx').hidden=!DL; $('#bTxt').hidden=!DL;
}

/* ---------- start ---------- */
syncAll(); renderPreview(); applyCaps();
(async function(){
  DL={save:function(o){
    var blob=o.data instanceof Blob?o.data:new Blob([o.data],{type:'text/plain;charset=utf-8'});
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=o.filename; document.body.append(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); },4000);
    return Promise.resolve({status:'saved'});
  }};
  try{
    var h=await fetch('/api/health'); var j=await h.json();
    if(j && j.ai) SAMPLE=callAI;
  }catch(e){}
  applyCaps();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(renderPreview);
})();
window.addEventListener('resize',function(){ changed(); });
