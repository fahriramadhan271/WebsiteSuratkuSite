/* ==========================================================================
   surat.js : ISI dan SUSUNAN surat.
   - TYPES        : daftar jenis surat (lamaran, izin, dst) dan isian bawaannya
   - defaultBody  : teks isi surat otomatis (tanpa AI)
   - buildBlocks  : menyusun surat (kop, tanggal, penerima, isi, tanda tangan)
   Hasil buildBlocks dipakai untuk pratinjau (main.js) dan unduhan (unduh.js).
   ========================================================================== */
'use strict';

var COLORS={ink:'#141414',accent:'#1B3A6B',muted:'#555555'};
var MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

var TYPES={
  lamaran:{label:'Lamaran kerja',hint:'Melamar posisi di sebuah perusahaan',fieldA:'Posisi yang dilamar',phA:'Staf Administrasi',
    phDetail:'Pendidikan, pengalaman, dan keahlian yang ingin ditonjolkan',perihal:function(a){return 'Lamaran Pekerjaan'+(a?' sebagai '+a:'');},
    lampiran:'1 (satu) berkas',kepada:'Bapak/Ibu HRD Manager',ident:false,closing:'Hormat saya,',
    purpose:'surat lamaran pekerjaan'},
  izin:{label:'Surat izin',hint:'Izin tidak masuk kerja atau sekolah',fieldA:'Izin untuk',phA:'Tidak masuk kerja pada 15 Oktober 2026',
    phDetail:'Alasan izin',perihal:function(){return 'Permohonan Izin';},
    lampiran:'',kepada:'Bapak/Ibu Pimpinan',ident:true,closing:'Hormat saya,',purpose:'surat permohonan izin'},
  permohonan:{label:'Surat permohonan',hint:'Meminta sesuatu secara resmi',fieldA:'Hal yang dimohonkan',phA:'Peminjaman ruang aula',
    phDetail:'Waktu, tujuan, dan hal pendukung',perihal:function(a){return 'Permohonan'+(a?' '+a:'');},
    lampiran:'',kepada:'Bapak/Ibu Pimpinan',ident:false,closing:'Hormat saya,',purpose:'surat permohonan'},
  pengunduran:{label:'Pengunduran diri',hint:'Berhenti dari pekerjaan',fieldA:'Tanggal efektif berhenti',phA:'31 Oktober 2026',
    phDetail:'Alasan (boleh dikosongkan) dan hal yang ingin disampaikan',perihal:function(){return 'Pengunduran Diri';},
    lampiran:'',kepada:'Bapak/Ibu Pimpinan',ident:true,closing:'Hormat saya,',purpose:'surat pengunduran diri'},
  resmi:{label:'Surat resmi',hint:'Surat dinas dari instansi atau organisasi',fieldA:'Pokok surat',phA:'Undangan rapat koordinasi',
    phDetail:'Hari, tanggal, tempat, dan hal penting lain',perihal:function(a){return a||'';},
    lampiran:'',kepada:'Bapak/Ibu Pimpinan',ident:false,closing:'Hormat kami,',purpose:'surat resmi atau surat dinas'}
};

function fmtDate(iso){
  var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');
  if(!m) return '';
  return (+m[3])+' '+MONTHS[+m[2]-1]+' '+m[1];
}
function soft(t){
  t=String(t||'').trim();
  if(t.length>1 && /[A-Z]/.test(t.charAt(0)) && /[a-z]/.test(t.charAt(1))) t=t.charAt(0).toLowerCase()+t.slice(1);
  return t.replace(/[.\s]+$/,'');
}
function endDot(t){
  t=String(t||'').trim();
  if(!t) return '';
  return /[.!?]$/.test(t)?t:t+'.';
}
function defPerihal(type,a){ return (TYPES[type]||TYPES.lamaran).perihal(String(a||'').trim()); }

function defaultBody(s){
  var a=String(s.fieldA||'').trim(), d=String(s.detail||'').trim(), org=String(s.recOrg||'').trim();
  var P=[];
  switch(s.type){
    case 'izin':
      P.push('Dengan ini saya mengajukan permohonan izin '+(a?'untuk '+soft(a):'untuk [keperluan]')+'.');
      if(d) P.push('Adapun alasan izin tersebut adalah '+soft(d)+'.');
      P.push('Saya akan menyelesaikan tanggung jawab saya setelah izin berakhir. Demikian surat ini saya sampaikan. Atas pengertian dan izin Bapak/Ibu, saya ucapkan terima kasih.');
      break;
    case 'permohonan':
      P.push('Sehubungan dengan keperluan saya, dengan ini saya mengajukan permohonan '+(a?soft(a):'[hal yang dimohonkan]')+'.');
      if(d) P.push(endDot(d));
      P.push('Besar harapan saya agar permohonan ini dapat dikabulkan. Demikian surat ini saya sampaikan. Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.');
      break;
    case 'pengunduran':
      P.push('Dengan ini saya mengajukan pengunduran diri dari jabatan saya'+(org?' di '+org:'')+(a?', efektif pada '+a:'')+'.');
      if(d) P.push(endDot(d));
      P.push('Saya mengucapkan terima kasih atas kesempatan, bimbingan, dan kepercayaan yang telah diberikan selama saya bekerja. Saya akan membantu proses serah terima pekerjaan sebaik mungkin. Demikian surat ini saya sampaikan.');
      break;
    case 'resmi':
      P.push('Sehubungan dengan '+(a?soft(a):'[pokok surat]')+', bersama ini kami sampaikan hal berikut.');
      if(d) P.push(endDot(d));
      P.push('Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.');
      break;
    default:
      P.push('Berdasarkan informasi lowongan yang saya peroleh, saya bermaksud mengajukan lamaran untuk posisi '+(a||'[posisi]')+(org?' di '+org:'')+'.');
      if(d) P.push('Mengenai latar belakang saya: '+endDot(soft(d)));
      P.push('Saya berharap dapat diberi kesempatan mengikuti proses seleksi dan wawancara. Demikian surat lamaran ini saya sampaikan. Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.');
  }
  return P.join('\n\n');
}

function buildBlocks(s){
  var ty=TYPES[s.type]||TYPES.lamaran, T=s.template, B=[];
  function g(k){ return String(s[k]==null?'':s[k]).trim(); }
  var name=g('name'), role=g('role');
  var contact=[g('address'),g('phone'),g('email')].filter(Boolean);
  var dateline=[g('city'),fmtDate(s.date)].filter(Boolean).join(', ');

  if(T==='modern'){
    B.push({t:'p',text:name||'Nama Anda',size:20,bold:true,color:'accent',after:3});
    if(contact.length) B.push({t:'p',text:contact.join('  |  '),size:9.5,color:'muted',after:7});
    B.push({t:'rule',kind:'single',color:'accent',after:16});
  } else if(T==='kop'){
    B.push({t:'p',text:(g('orgName')||name||'Nama Instansi').toUpperCase(),size:15,bold:true,align:'center',after:3});
    if(contact.length) B.push({t:'p',text:contact.join('  |  '),size:9.5,align:'center',color:'muted',after:7});
    B.push({t:'rule',kind:'double',color:'ink',after:16});
  }
  if(dateline) B.push({t:'p',text:dateline,align:'right',after:14});

  var rows=[];
  if(g('nomor')) rows.push(['Nomor',g('nomor')]);
  if(g('lampiran')) rows.push(['Lampiran',g('lampiran')]);
  if(g('perihal')) rows.push(['Perihal',g('perihal')]);
  if(rows.length) B.push({t:'meta',rows:rows,after:14});

  var rec=['Kepada Yth.'];
  if(g('recTitle')) rec.push(g('recTitle'));
  if(g('recOrg')) rec.push(g('recOrg'));
  rec.push('di '+(g('recPlace')||'Tempat'));
  B.push({t:'p',text:rec.join('\n'),after:14});

  B.push({t:'p',text:'Dengan hormat,',after:8});
  if(ty.ident){
    B.push({t:'p',text:'Yang bertanda tangan di bawah ini:',after:4});
    var ir=[['Nama',name||'[nama lengkap]']];
    if(role) ir.push(['Jabatan',role]);
    if(T==='classic' && g('address')) ir.push(['Alamat',g('address')]);
    B.push({t:'meta',rows:ir,after:8});
  }
  String(s.body||'').split(/\n\s*\n/).map(function(p){return p.replace(/\s*\n\s*/g,' ').trim();}).filter(Boolean)
    .forEach(function(p){ B.push({t:'p',text:p,align:'justify',after:8}); });

  B.push({t:'p',text:ty.closing,indent:0.55,after:0});
  if(s.type==='resmi' && role) B.push({t:'p',text:role,indent:0.55,after:0});
  if(s.sig && s.sigOn!==false) B.push({t:'sig',src:s.sig,ratio:s.sigRatio||3,h:56,indent:0.55});
  else B.push({t:'gap',h:48});
  B.push({t:'p',text:name||'Nama Anda',indent:0.55,bold:true,after:0});
  if(role && s.type!=='resmi') B.push({t:'p',text:role,indent:0.55,after:0});
  if(T==='classic' && contact.length) B.push({t:'p',text:contact.join('\n'),indent:0.55,size:10,color:'muted',after:0});
  return B;
}
