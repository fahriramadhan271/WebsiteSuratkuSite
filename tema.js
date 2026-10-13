/* ==========================================================================
   tema.js : pilihan tampilan (warna aksen dan mode terang/gelap).
   Pilihan disimpan di browser, jadi tetap sama saat halaman dibuka lagi.
   ========================================================================== */
'use strict';

(function(){
var KEY='suratku-tema', root=document.documentElement;
var ACCENTS=['teal','blue','violet','rose'], MODES=['auto','light','dark'];
var LABEL={auto:'Otomatis',light:'Terang',dark:'Gelap'};
var cfg={accent:'teal',mode:'auto'};
try{
  var s=JSON.parse(localStorage.getItem(KEY)||'null');
  if(s){
    if(ACCENTS.indexOf(s.accent)>-1) cfg.accent=s.accent;
    if(MODES.indexOf(s.mode)>-1) cfg.mode=s.mode;
  }
}catch(e){}

function apply(){
  if(cfg.accent==='teal') root.removeAttribute('data-accent'); else root.setAttribute('data-accent',cfg.accent);
  if(cfg.mode==='auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme',cfg.mode);
  Array.prototype.forEach.call(document.querySelectorAll('#swatches .sw'),function(b){
    b.setAttribute('aria-pressed',String(b.dataset.accent===cfg.accent));
  });
  var btn=document.querySelector('#modeBtn');
  if(btn) btn.textContent='Tema: '+LABEL[cfg.mode];
  try{ localStorage.setItem(KEY,JSON.stringify(cfg)); }catch(e){}
}

Array.prototype.forEach.call(document.querySelectorAll('#swatches .sw'),function(b){
  b.addEventListener('click',function(){ cfg.accent=b.dataset.accent; apply(); });
});
var mb=document.querySelector('#modeBtn');
if(mb) mb.addEventListener('click',function(){
  cfg.mode=MODES[(MODES.indexOf(cfg.mode)+1)%MODES.length]; apply();
});
apply();
})();
