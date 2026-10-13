/* ==========================================================================
   ttd.js : TANDA TANGAN DIGITAL (langkah 5).
   Tiga cara membuat tanda tangan:
   1. Gambar : coret langsung di kotak (jari atau mouse)
   2. Ketik  : nama diubah jadi tulisan tangan (font Dancing Script / Caveat)
   3. Unggah : foto tanda tangan di kertas putih, latar putih dihapus otomatis
   Hasilnya gambar PNG transparan, disimpan di state.sig lalu dipakai oleh
   pratinjau (main.js), PDF dan Word (unduh.js).
   ========================================================================== */
'use strict';

(function(){
var INK='#14213D';
var canvas=$('#sigCanvas'), ctx=canvas.getContext('2d');
var drawing=false, last=null;

/* ---------- kotak gambar ---------- */
function setupCtx(){
  var dpr=canvas.width/(canvas.getBoundingClientRect().width||1);
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=INK; ctx.fillStyle=INK; ctx.lineWidth=2.6*dpr;
}
function fit(){
  var r=canvas.getBoundingClientRect();
  if(!r.width || !r.height) return;
  var dpr=window.devicePixelRatio||1, w=Math.round(r.width*dpr), h=Math.round(r.height*dpr);
  if(canvas.width===w && canvas.height===h) return;
  var snap=document.createElement('canvas'); snap.width=canvas.width; snap.height=canvas.height;
  if(snap.width && snap.height) snap.getContext('2d').drawImage(canvas,0,0);
  canvas.width=w; canvas.height=h;
  if(snap.width && snap.height) ctx.drawImage(snap,0,0,snap.width,snap.height,0,0,w,h);
  setupCtx();
}
if(window.ResizeObserver) new ResizeObserver(fit).observe(canvas); else window.addEventListener('resize',fit);

function pos(e){
  var r=canvas.getBoundingClientRect(), k=canvas.width/r.width;
  return {x:(e.clientX-r.left)*k, y:(e.clientY-r.top)*k};
}
canvas.addEventListener('pointerdown',function(e){
  if(!canvas.width) fit();
  e.preventDefault();
  try{ canvas.setPointerCapture(e.pointerId); }catch(err){}
  drawing=true; last=pos(e); setupCtx();
  ctx.beginPath(); ctx.arc(last.x,last.y,ctx.lineWidth/2,0,Math.PI*2); ctx.fill();
  $('#sigPad').classList.add('has');
});
canvas.addEventListener('pointermove',function(e){
  if(!drawing) return;
  e.preventDefault();
  var p=pos(e), mid={x:(last.x+p.x)/2, y:(last.y+p.y)/2};
  ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(mid.x,mid.y); ctx.lineTo(p.x,p.y); ctx.stroke();
  last=p;
});
function endStroke(){
  if(!drawing) return;
  drawing=false;
  var r=cropToSig(canvas);
  if(r) setSig(r.url,r.ratio);
}
canvas.addEventListener('pointerup',endStroke);
canvas.addEventListener('pointercancel',endStroke);
canvas.addEventListener('pointerleave',endStroke);

function clearCanvas(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  $('#sigPad').classList.remove('has');
}

/* ---------- potong area kosong, hasilkan PNG transparan ---------- */
function cropToSig(src){
  var w=src.width, h=src.height;
  if(!w || !h) return null;
  var d=src.getContext('2d').getImageData(0,0,w,h).data;
  var x0=w, y0=h, x1=-1, y1=-1;
  for(var y=0;y<h;y++){
    for(var x=0;x<w;x++){
      if(d[(y*w+x)*4+3]>16){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    }
  }
  if(x1<0) return null;
  var pad=6;
  x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(w-1,x1+pad); y1=Math.min(h-1,y1+pad);
  var cw=x1-x0+1, ch=y1-y0+1, sc=Math.min(1,720/cw);
  var o=document.createElement('canvas');
  o.width=Math.max(1,Math.round(cw*sc)); o.height=Math.max(1,Math.round(ch*sc));
  o.getContext('2d').drawImage(src,x0,y0,cw,ch,0,0,o.width,o.height);
  return {url:o.toDataURL('image/png'), ratio:o.width/o.height};
}

/* ---------- simpan ke state ---------- */
function setSig(url,ratio){
  state.sig=url; state.sigRatio=ratio; state.sigOn=true;
  updateCur(); changed();
}
function removeSig(){
  state.sig=''; state.sigRatio=3;
  clearCanvas(); updateCur(); changed();
}
function updateCur(){
  var has=!!state.sig;
  $('#sigCur').hidden=!has;
  if(has) $('#sigImg').src=state.sig;
  $('#sigOn').checked=state.sigOn!==false;
}

/* ---------- cara 2: ketik ---------- */
var typeTimer=0;
async function renderTyped(){
  var t=$('#sigText').value.trim();
  if(!t){ removeSig(); return; }
  var fam=$('#sigFont').value;
  try{ await document.fonts.load('72px "'+fam+'"',t); }catch(e){}
  var c=document.createElement('canvas'), x=c.getContext('2d');
  x.font='72px "'+fam+'", cursive';
  c.width=Math.ceil(x.measureText(t).width)+60; c.height=160;
  x=c.getContext('2d'); x.font='72px "'+fam+'", cursive'; x.fillStyle=INK; x.textBaseline='middle';
  x.fillText(t,30,86);
  var r=cropToSig(c);
  if(r) setSig(r.url,r.ratio);
}
function typedSoon(){ clearTimeout(typeTimer); typeTimer=setTimeout(renderTyped,350); }
$('#sigText').addEventListener('input',typedSoon);
$('#sigFont').addEventListener('change',renderTyped);

/* ---------- cara 3: unggah foto ---------- */
$('#sigFile').addEventListener('change',function(){
  var f=this.files && this.files[0];
  if(!f) return;
  if(f.size>8*1024*1024){ toast('Gambar terlalu besar. Maksimal 8 MB.'); return; }
  var fr=new FileReader();
  fr.onerror=function(){ toast('Gambar tidak bisa dibaca.'); };
  fr.onload=function(){
    var im=new Image();
    im.onerror=function(){ toast('File ini bukan gambar yang bisa dibaca.'); };
    im.onload=function(){
      var sc=Math.min(1,900/im.naturalWidth);
      var c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.naturalWidth*sc)); c.height=Math.max(1,Math.round(im.naturalHeight*sc));
      var x=c.getContext('2d'); x.drawImage(im,0,0,c.width,c.height);
      var img=x.getImageData(0,0,c.width,c.height), d=img.data;
      for(var i=0;i<d.length;i+=4){
        var lum=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        var a=lum>=225?0:lum<=150?255:Math.round(255*(225-lum)/75);
        d[i+3]=Math.min(d[i+3],a);
      }
      x.putImageData(img,0,0);
      var r=cropToSig(c);
      if(r) setSig(r.url,r.ratio); else toast('Tanda tangan tidak terdeteksi. Pakai foto dengan latar putih.');
    };
    im.src=fr.result;
  };
  fr.readAsDataURL(f);
});

/* ---------- tab, tombol ---------- */
function showPane(name){
  $$('#sigTabs button').forEach(function(b){ b.setAttribute('aria-selected',String(b.dataset.sig===name)); });
  $$('.sigpane').forEach(function(p){ p.hidden=p.dataset.pane!==name; });
  if(name==='draw') setTimeout(fit,0);
  if(name==='type' && !$('#sigText').value) $('#sigText').value=state.name||'';
}
$$('#sigTabs button').forEach(function(b){ b.addEventListener('click',function(){ showPane(b.dataset.sig); }); });
$('#sigClear').addEventListener('click',removeSig);
$('#sigRemove').addEventListener('click',removeSig);
$('#sigOn').addEventListener('change',function(){ state.sigOn=this.checked; changed(); });
$('#clearAll').addEventListener('click',function(){ clearCanvas(); updateCur(); });

updateCur();
})();
