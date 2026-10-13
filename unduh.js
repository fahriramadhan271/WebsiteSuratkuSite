/* ==========================================================================
   unduh.js : mengubah surat menjadi file.
   - toText     : file TXT dan tombol Salin
   - toDocXml   : file Word (.docx), termasuk gambar tanda tangan
   - toPDF      : file PDF (memakai library jsPDF)
   ========================================================================== */
'use strict';

function toText(blocks){
  var out=[], WID=76;
  blocks.forEach(function(b){
    if(b.t==='gap'||b.t==='sig'){ for(var i=0;i<Math.max(1,Math.round(b.h/14));i++) out.push(''); return; }
    if(b.t==='rule') return;
    if(b.t==='meta'){
      b.rows.forEach(function(r){ out.push(r[0]+new Array(Math.max(1,11-r[0].length)).join(' ')+': '+r[1]); });
      if((b.after||0)>=6) out.push('');
      return;
    }
    var pad=new Array(Math.round((b.indent||0)*WID)+1).join(' ');
    String(b.text).split('\n').forEach(function(line){
      if(b.align==='right') out.push(new Array(Math.max(0,WID-line.length)+1).join(' ')+line);
      else if(b.align==='center') out.push(new Array(Math.max(0,Math.floor((WID-line.length)/2))+1).join(' ')+line);
      else out.push(pad+line);
    });
    if((b.after||0)>=6) out.push('');
  });
  return out.join('\n').replace(/\s+$/,'')+'\n';
}

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toDocXml(blocks){
  var TW=9298;
  function hex(k){ return COLORS[k||'ink'].slice(1); }
  function rpr(o){
    return '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'+
      (o.bold?'<w:b/>':'')+'<w:color w:val="'+hex(o.color)+'"/><w:sz w:val="'+Math.round((o.size||12)*2)+'"/></w:rPr>';
  }
  function run(text,o){
    var inner=String(text).split('\n').map(function(p,i){ return (i?'<w:br/>':'')+'<w:t xml:space="preserve">'+esc(p)+'</w:t>'; }).join('');
    return '<w:r>'+rpr(o)+inner+'</w:r>';
  }
  var JC={left:'left',right:'right',center:'center',justify:'both'};
  function sigXml(b){
    var hp=b.h, wp=hp*b.ratio, maxw=(TW/20)*(1-(b.indent||0));
    if(wp>maxw){ wp=maxw; hp=wp/b.ratio; }
    var cx=Math.round(wp*12700), cy=Math.round(hp*12700);
    return '<w:p><w:pPr><w:spacing w:before="0" w:after="'+Math.round((b.h-hp)*20)+'" w:line="240" w:lineRule="auto"/>'+
      '<w:ind w:left="'+Math.round((b.indent||0)*TW)+'"/></w:pPr><w:r><w:drawing>'+
      '<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/>'+
      '<wp:docPr id="1" name="Tanda tangan" descr="Tanda tangan"/>'+
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'+
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="sig.png"/><pic:cNvPicPr/></pic:nvPicPr>'+
      '<pic:blipFill><a:blip r:embed="rIdSig"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'+
      '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  }
  var out=[];
  blocks.forEach(function(b){
    if(b.t==='sig'){
      out.push(sigXml(b));
    } else if(b.t==='gap'){
      out.push('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="'+Math.round(b.h*20)+'" w:lineRule="exact"/></w:pPr></w:p>');
    } else if(b.t==='rule'){
      var dbl=b.kind==='double';
      out.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="'+(dbl?'double':'single')+'" w:sz="'+(dbl?6:8)+'" w:space="1" w:color="'+hex(b.color)+'"/></w:pBdr>'+
        '<w:spacing w:before="0" w:after="'+Math.round((b.after||0)*20)+'" w:line="120" w:lineRule="exact"/></w:pPr></w:p>');
    } else if(b.t==='meta'){
      b.rows.forEach(function(r,i){
        var last=i===b.rows.length-1;
        out.push('<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="1361"/><w:tab w:val="left" w:pos="1531"/></w:tabs>'+
          '<w:spacing w:before="0" w:after="'+(last?Math.round((b.after||0)*20):0)+'" w:line="300" w:lineRule="auto"/>'+
          '<w:ind w:left="1531" w:hanging="1531"/></w:pPr><w:r>'+rpr({size:12})+
          '<w:t xml:space="preserve">'+esc(r[0])+'</w:t><w:tab/><w:t>:</w:t><w:tab/><w:t xml:space="preserve">'+esc(r[1])+'</w:t></w:r></w:p>');
      });
    } else {
      out.push('<w:p><w:pPr><w:spacing w:before="0" w:after="'+Math.round((b.after||0)*20)+'" w:line="300" w:lineRule="auto"/>'+
        (b.indent?'<w:ind w:left="'+Math.round(b.indent*TW)+'"/>':'')+
        '<w:jc w:val="'+(JC[b.align]||'left')+'"/></w:pPr>'+run(b.text,b)+'</w:p>');
    }
  });
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>'+out.join('')+
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1247" w:right="1247" w:bottom="1247" w:left="1361" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
}
var DOCX_TYPES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
var DOCX_RELS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';

/* Tanda tangan di Word: file gambar dan relasinya. Hasilnya null jika surat tanpa tanda tangan. */
function docxExtras(blocks){
  var sig=null;
  blocks.forEach(function(b){ if(b.t==='sig') sig=b; });
  if(!sig) return {png:null,rels:null};
  return {
    png:String(sig.src).split(',')[1]||'',
    rels:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSig" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/sig.png"/></Relationships>'
  };
}

function toPDF(JsPDF,blocks){
  var PT=0.3528, LHF=1.45;
  var doc=new JsPDF({unit:'mm',format:'a4',compress:true});
  var ML=24, MR=22, MT=22, MB=22, PH=297, W=210-ML-MR, y=MT;
  function rgb(k){ var h=COLORS[k||'ink']; return [1,3,5].map(function(i){return parseInt(h.slice(i,i+2),16);}); }
  function ensure(h){ if(y+h>PH-MB+0.01){ doc.addPage(); y=MT; } }
  function split(text,w){
    var out=[];
    String(text).split('\n').forEach(function(part){ doc.splitTextToSize(part||' ',w).forEach(function(l){ out.push(l); }); });
    return out;
  }
  function justify(ln,x,by,w){
    var words=ln.trim().split(/\s+/);
    if(words.length<2){ doc.text(ln,x,by); return; }
    var tw=0; words.forEach(function(wd){ tw+=doc.getTextWidth(wd); });
    var gap=(w-tw)/(words.length-1), cx=x;
    words.forEach(function(wd){ doc.text(wd,cx,by); cx+=doc.getTextWidth(wd)+gap; });
  }
  blocks.forEach(function(b){
    if(b.t==='gap'){ y+=b.h*PT; return; }
    if(b.t==='sig'){
      var full=b.h*PT, hm=full, wm=hm*b.ratio, maxw=W*(1-(b.indent||0));
      if(wm>maxw){ wm=maxw; hm=wm/b.ratio; }
      ensure(full);
      try{ doc.addImage(b.src,'PNG',ML+(b.indent||0)*W,y+(full-hm)/2,wm,hm); }catch(e){}
      y+=full; return;
    }
    var c=rgb(b.color);
    if(b.t==='rule'){
      ensure(3); doc.setDrawColor(c[0],c[1],c[2]); doc.setLineWidth(0.5); doc.line(ML,y,ML+W,y);
      if(b.kind==='double'){ y+=1.1; doc.setLineWidth(0.2); doc.line(ML,y,ML+W,y); }
      y+=(b.after||0)*PT; return;
    }
    var fs=b.size||12, lh=fs*LHF*PT;
    doc.setFont('times',b.bold?'bold':'normal'); doc.setFontSize(fs); doc.setTextColor(c[0],c[1],c[2]);
    if(b.t==='meta'){
      b.rows.forEach(function(r){
        split(r[1],W-27).forEach(function(ln,i){
          ensure(lh); var by=y+lh*0.72;
          if(i===0){ doc.text(r[0],ML,by); doc.text(':',ML+24,by); }
          doc.text(ln,ML+27,by); y+=lh;
        });
      });
      y+=(b.after||0)*PT; return;
    }
    var ind=(b.indent||0)*W, x0=ML+ind, w=W-ind, ls=split(b.text,w);
    ls.forEach(function(ln,i){
      ensure(lh); var by=y+lh*0.72;
      if(b.align==='right') doc.text(ln,ML+W,by,{align:'right'});
      else if(b.align==='center') doc.text(ln,ML+W/2,by,{align:'center'});
      else if(b.align==='justify' && i<ls.length-1) justify(ln,x0,by,w);
      else doc.text(ln,x0,by);
      y+=lh;
    });
    y+=(b.after||0)*PT;
  });
  return doc;
}
