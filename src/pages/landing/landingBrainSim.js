export function mountLandingBrain(root) {
const $id = (id) => root.querySelector('#' + id);

const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const OUTLINE="M 82 214 C 66 168, 84 114, 132 84 C 176 56, 236 44, 296 44 C 360 44, 420 58, 464 92 C 506 124, 530 168, 528 214 C 527 246, 512 270, 488 282 C 462 294, 432 290, 408 298 C 384 306, 368 318, 340 322 C 304 328, 262 330, 228 322 C 196 314, 172 300, 160 284 C 150 272, 152 262, 146 256 C 128 252, 104 244, 92 234 C 86 228, 84 222, 82 214 Z";
const CBL="M 392 300 C 404 284, 462 278, 497 291 C 524 302, 522 346, 492 361 C 456 377, 406 366, 391 346 C 381 331, 383 313, 392 300 Z";
const STEM="M 296 318 C 328 324, 341 330, 344 346 C 347 362, 350 395, 351 434 L 368 434 C 369 400, 372 368, 380 352 C 386 340, 392 320, 392 300 L 330 300 Z";
const STEM_SIDES="M 296 318 C 328 324, 341 330, 344 346 C 347 362, 350 395, 351 434 M 386 336 C 383 344, 381 348, 380 352 C 372 368, 369 400, 368 434";
const HIPPO="M 250 280 C 280 270, 330 268, 360 278 C 372 283, 372 294, 360 296 C 330 292, 290 294, 262 298 C 248 298, 244 286, 250 280 Z";
const poly=p=>"M "+p.map(q=>q.join(" ")).join(" L ")+" Z";
const LOBES=[
 {id:"frontal",name:"Frontal lob",func:"Karar, planlama",col:"#5b8def",kind:"c",shape:poly([[0,0],[266,0],[262,48],[215,225],[175,250],[140,262],[0,262]]),
  mods:[["Eğitmen Komuta","/egitmen-komuta"],["Görevler","Dashboard"],["FOF senaryosu","/antrenman"]],src:"Tamamlanan görevler ve FOF senaryoları",ok:false,act:"Görev tamamla",xp:30},
 {id:"motor",name:"Motor korteks",func:"Hareket",col:"#3fbf6f",kind:"c",shape:poly([[266,0],[304,0],[300,45],[252,218],[215,225],[262,48]]),
  mods:[["Atış","/antrenman"],["CQB","/antrenman"],["VBSS","/antrenman"]],src:"Atış kaydı sayısı ve skorları",ok:true,act:"Atış kaydı ekle",xp:35},
 {id:"parietal",name:"Parietal lob",func:"Uzamsal hesap",col:"#c9b52c",kind:"c",shape:poly([[304,0],[440,0],[448,150],[455,250],[400,215],[252,218],[300,45]]),
  mods:[["Balistik terminal","/balistik"],["Cephanelik","/cephanelik"]],src:"Kaydedilen balistik profiller ve envanter bakım kayıtları",ok:false,act:"Balistik profil kaydet",xp:25},
 {id:"occipital",name:"Oksipital lob",func:"Görme",col:"#e8862a",kind:"c",shape:poly([[440,0],[600,0],[600,300],[470,300],[455,250],[448,150]]),
  mods:[["Yazılı haberler","/istihbarat"],["Video haberler","/istihbarat"]],src:"Okunan haber ve izlenen video",ok:false,act:"Haber oku",xp:10},
 {id:"temporal",name:"Temporal lob",func:"Hafıza, dil",col:"#36b9c9",kind:"c",shape:poly([[0,262],[140,262],[175,250],[215,225],[252,218],[400,215],[455,250],[470,300],[470,420],[0,420]]),
  mods:[["Audaz Akademi","/akademi"],["Kullanım kılavuzu","/kilavuz"],["Brifing odası","/forum"],["Muhabere","/mesajlar"]],src:"Okunan doktrinler",ok:true,act:"Doktrin oku",xp:20},
 {id:"hippocampus",name:"Hipokampus",func:"Kayıt, hatıra",col:"#e0609a",kind:"c",shape:HIPPO,
  mods:[["Başarı takibi","/basarilar"],["Performans geçmişi","/basarilar"]],src:"Düzenli kayıt serisi (ardışık aktif gün)",ok:false,act:"Günlük seri +1",xp:15},
 {id:"cerebellum",name:"Beyincik",func:"Koordinasyon, refleks",col:"#f0a53a",kind:"b",shape:CBL,
  mods:[["Tactical Timer","/taktik-timer"],["Kuru tetik analizi","/taktik-timer"]],src:"Timer seansları",ok:true,act:"Timer seansı",xp:30},
 {id:"stem",name:"Beyin sapı",func:"Hayati fonksiyonlar",col:"#e5534b",kind:"s",shape:STEM,
  mods:[["TCCC paketi","/tccc"],["Sağlık durumu","/tccc"]],src:"TCCC kayıtları",ok:true,act:"TCCC tatbikatı",xp:30},
];
const BY=Object.fromEntries(LOBES.map(l=>[l.id,l]));
// ---------- Gürültü ----------
const perm=new Uint8Array(512);{const p=[...Array(256).keys()];let s=7;for(let i=255;i>0;i--){s=(s*16807)%2147483647;const j=s%(i+1);[p[i],p[j]]=[p[j],p[i]]}for(let i=0;i<512;i++)perm[i]=p[i&255]}
const fade=t=>t*t*t*(t*(t*6-15)+10),lerp=(a,b,t)=>a+t*(b-a);
function grad(h,x,y,z){h&=15;const u=h<8?x:y,v=h<4?y:(h===12||h===14?x:z);return((h&1)?-u:u)+((h&2)?-v:v)}
function noise(x,y,z){const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);const u=fade(x),v=fade(y),w=fade(z);
 const A=perm[X]+Y,AA=perm[A]+Z,AB=perm[A+1]+Z,B=perm[X+1]+Y,BA=perm[B]+Z,BB=perm[B+1]+Z;
 return lerp(lerp(lerp(grad(perm[AA],x,y,z),grad(perm[BA],x-1,y,z),u),lerp(grad(perm[AB],x,y-1,z),grad(perm[BB],x-1,y-1,z),u),v),
  lerp(lerp(grad(perm[AA+1],x,y,z-1),grad(perm[BA+1],x-1,y,z-1),u),lerp(grad(perm[AB+1],x,y-1,z-1),grad(perm[BB+1],x-1,y-1,z-1),u),v),w)}
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// ---------- Geometri (beyin koordinatı) ----------
const tctx=document.createElement("canvas").getContext("2d");
const P_OUT=new Path2D(OUTLINE),P_CBL=new Path2D(CBL),P_STEM=new Path2D(STEM),P_HIP=new Path2D(HIPPO);
LOBES.forEach(L=>L.p2=new Path2D(L.shape));
function lobeAt(bx,by){
  if(tctx.isPointInPath(P_HIP,bx,by))return BY.hippocampus;
  if(tctx.isPointInPath(P_OUT,bx,by)){for(const L of LOBES)if(L.kind==="c"&&L.id!=="hippocampus"&&tctx.isPointInPath(L.p2,bx,by))return L}
  if(tctx.isPointInPath(P_CBL,bx,by))return BY.cerebellum;
  if(tctx.isPointInPath(P_STEM,bx,by))return BY.stem;
  return null;
}
LOBES.forEach((L,i)=>{const r=rng(31+i*97),pts=[];let g=0;while(pts.length<40&&g++<30000){const x=40+r()*500,y=30+r()*400;if(lobeAt(x,y)===L)pts.push([x,y])}L.targets=pts;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,cx=0,cy=0;pts.forEach(p=>{cx+=p[0];cy+=p[1];x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])});
  L.cen=[cx/pts.length,cy/pts.length];L.size=Math.max(x1-x0,y1-y0,90)});
// Kıvrım ızgarası (bir kez, beyin koordinatında)
const G={x0:60,y0:30,cs:3.5};G.nx=Math.ceil(480/G.cs)+1;G.ny=Math.ceil(395/G.cs)+1;
G.id=new Int8Array(G.nx*G.ny);G.val=new Float32Array(G.nx*G.ny);
for(let j=0;j<G.ny;j++)for(let i=0;i<G.nx;i++){const L=lobeAt(G.x0+i*G.cs,G.y0+j*G.cs);G.id[j*G.nx+i]=L?LOBES.indexOf(L):-1}
const MAT=LOBES.map(L=>L.kind==="c"?0:L.kind==="b"?1:2);
let wires=[],ambient=[],pulses=[];
function buildWires(){
  wires=[];const r=rng(5);
  LOBES.forEach(L=>{const level=lv(state.xp[L.id]||0),per=2+Math.floor(level*.7);
    L.mods.forEach((m,pi)=>{for(let k=0;k<per;k++)wires.push({L,pi,t:L.targets[(pi*7+k*3)%L.targets.length],ph:r()*6.28,amp:12+r()*26,sp:.4+r()*.5})})});
  ambient=[];const nA=mobile?90:260;
  for(let i=0;i<nA;i++){const L=LOBES[Math.floor(r()*8)],tl=LOBES[Math.floor(r()*8)];
    ambient.push({L,pi:Math.floor(r()*L.mods.length),t:tl.targets[Math.floor(r()*tl.targets.length)],ph:r()*6.28,amp:30+r()*80,sp:.15+r()*.35})}
}
function bez(w,time){
  const p=w.L.ports[w.pi%Math.max(1,w.L.ports.length)];if(!p)return null;
  const [px,py]=p,tx=OX+w.t[0]*S,ty=OY+w.t[1]*S,cx=OX+300*S,cy=OY+200*S;
  const sw=reduce?0:Math.sin(time*w.sp+w.ph)*w.amp,sw2=reduce?0:Math.cos(time*w.sp*.8+w.ph*1.3)*w.amp;
  const dx=tx-px,dy=ty-py;
  return [px,py,px+dx*.35+(px<cx?1:-1)*30+sw*.6,py+dy*.15+sw2*.5,tx-(tx-cx)*.25+sw2,ty-(ty-cy)*.25+sw,tx,ty];
}
function bpt(b,t){const m=1-t;return[m*m*m*b[0]+3*m*m*t*b[2]+3*m*t*t*b[4]+t*t*t*b[6],m*m*m*b[1]+3*m*m*t*b[3]+3*m*t*t*b[5]+t*t*t*b[7]]}

// ---------- Beyin çizimi ----------
const TH=[0,-.28,.28,-.14,.14,-.42,.42,-.07,.07,-.21,.21,-.35,.35,-.49,.49];
const flash={};
// Yumuşak bölge geçişleri: seviye ve seçim haritası bulanıklaştırılıp kıvrımlara karıştırılır
const NV=G.nx*G.ny,LVB=new Float32Array(NV),SELB=new Float32Array(NV);
function blur(src,R){const {nx,ny}=G,tmp=new Float32Array(NV),out=new Float32Array(NV);
  for(let j=0;j<ny;j++){let acc=0,c=0;for(let i=-R;i<nx;i++){if(i+R<nx){acc+=src[j*nx+i+R];c++}if(i-R-1>=0){acc-=src[j*nx+i-R-1];c--}if(i>=0)tmp[j*nx+i]=acc/c}}
  for(let i=0;i<nx;i++){let acc=0,c=0;for(let j=-R;j<ny;j++){if(j+R<ny){acc+=tmp[(j+R)*nx+i];c++}if(j-R-1>=0){acc-=tmp[(j-R-1)*nx+i];c--}if(j>=0)out[j*nx+i]=acc/c}}
  return out}
function updateBlend(){const lvl=LOBES.map(L=>lv(state.xp[L.id]||0)),si=LOBES.indexOf(BY[state.sel]);
  const v=new Float32Array(NV),s=new Float32Array(NV),m=new Float32Array(NV);
  for(let k=0;k<NV;k++){const L=G.id[k];if(L<0)continue;m[k]=1;v[k]=lvl[L];s[k]=L===si?1:0}
  const bm=blur(blur(m,7),4),bv=blur(blur(v,7),4),bs=blur(blur(s,7),4);
  for(let k=0;k<NV;k++){const w=bm[k]||1e-6;LVB[k]=bv[k]/w;SELB[k]=bs[k]/w}}
const AB=8,SB=5;
function drawBrain(time){
  const {nx,ny,id,val,cs,x0,y0}=G,z=reduce?0:time*.12;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,L=id[k];if(L<0)continue;const X=x0+i*cs,Y=y0+j*cs,m=MAT[L];
    val[k]=m===1?cblVal(X,Y,z):m===2?0:noise(X*.022,Y*.026,z)*.9+noise(X*.055,Y*.055,z*1.4+9)*.22}
  const thin=[],thick=[],thinB=[];for(let b=0;b<AB*SB;b++){thin.push(new Path2D());thick.push(new Path2D());thinB.push(new Path2D())}
  const cblN=1+Math.round(lv(state.xp.cerebellum||0)/3);
  for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
    const a=j*nx+i,b=a+1,c=a+nx+1,d=a+nx,L=id[a];if(L<0||id[b]<0||id[c]<0||id[d]<0)continue;
    const m=MAT[L];if(m===2||MAT[id[b]]!==m||MAT[id[c]]!==m||MAT[id[d]]!==m)continue;
    const lb=(LVB[a]+LVB[c])*.5,sb=(SELB[a]+SELB[c])*.5;
    const n=m===1?cblN:Math.min(TH.length,2+Math.round(lb*1.25));
    const bi=Math.min(AB-1,Math.floor(lb/10.01*AB))*SB+Math.min(SB-1,Math.round(sb*(SB-1)));
    const v0=val[a],v1=val[b],v2=val[c],v3=val[d],X=x0+i*cs,Y=y0+j*cs;
    for(let q=0;q<n;q++){const th=TH[q],idx=(v0>th?8:0)|(v1>th?4:0)|(v2>th?2:0)|(v3>th?1:0);if(idx===0||idx===15)continue;
      const P=(m===1?thinB:q===0?thick:thin)[bi];
      const E=e=>e===0?[X+cs*(th-v0)/(v1-v0),Y]:e===1?[X+cs,Y+cs*(th-v1)/(v2-v1)]:e===2?[X+cs*(th-v3)/(v2-v3),Y+cs]:[X,Y+cs*(th-v0)/(v3-v0)];
      const seg=(e1,e2)=>{const p=E(e1),r=E(e2);P.moveTo(p[0],p[1]);P.lineTo(r[0],r[1])};
      switch(idx){case 1:case 14:seg(3,2);break;case 2:case 13:seg(2,1);break;case 3:case 12:seg(3,1);break;case 4:case 11:seg(0,1);break;
        case 6:case 9:seg(0,2);break;case 7:case 8:seg(3,0);break;case 5:seg(3,0);seg(2,1);break;case 10:seg(3,2);seg(0,1);break}}
  }
  ctx.save();ctx.setTransform(DPR*S,0,0,DPR*S,DPR*OX,DPR*OY);ctx.lineCap="round";
  const sel=BY[state.sel];
  const glow=clip=>{const gr=ctx.createRadialGradient(sel.cen[0],sel.cen[1],0,sel.cen[0],sel.cen[1],sel.size*.85);
    gr.addColorStop(0,"rgba(242,194,48,.17)");gr.addColorStop(.6,"rgba(242,194,48,.06)");gr.addColorStop(1,"rgba(242,194,48,0)");
    ctx.save();ctx.clip(clip);ctx.fillStyle=gr;ctx.fillRect(0,0,620,460);ctx.restore()};
  const strokeB=(arr,w)=>{for(let b=0;b<AB*SB;b++){const ai=Math.floor(b/SB),t=(b%SB)/(SB-1),lvl=(ai+.5)/AB*10,al=Math.min(1,.09+lvl*.05+t*.18);
    ctx.strokeStyle=`rgba(${Math.round(255-13*t)},${Math.round(255-61*t)},${Math.round(255-207*t)},${al})`;ctx.lineWidth=w/S;ctx.stroke(arr[b])}};
  const edge=p=>{ctx.lineWidth=2.2/S;ctx.strokeStyle="rgba(255,255,255,.92)";ctx.stroke(p)};
  const solid=p=>{ctx.save();ctx.shadowColor="rgba(0,0,0,.9)";ctx.shadowBlur=16;ctx.fillStyle="#040504";ctx.fill(p);ctx.restore()};
  // katman 1: beyin sapı (en arkada)
  const sf=ctx.createLinearGradient(0,380,0,434);sf.addColorStop(0,"rgba(4,5,4,1)");sf.addColorStop(1,"rgba(4,5,4,0)");
  ctx.fillStyle=sf;ctx.fill(P_STEM);if(sel.id==="stem")glow(P_STEM);drawStem(time);
  {const sg=ctx.createLinearGradient(0,330,0,434);sg.addColorStop(0,"rgba(255,255,255,.92)");sg.addColorStop(.55,"rgba(255,255,255,.75)");sg.addColorStop(1,"rgba(255,255,255,0)");
   ctx.lineWidth=2.2/S;ctx.strokeStyle=sg;ctx.stroke(new Path2D(STEM_SIDES))}
  // katman 2: beyincik (sapın önünde, beynin altında)
  solid(P_CBL);if(sel.id==="cerebellum")glow(P_CBL);ctx.save();ctx.clip(P_CBL);strokeB(thinB,.85);ctx.restore();drawArbor(time);edge(P_CBL);
  // katman 3: beyin (en önde, alttakileri örter)
  solid(P_OUT);if(sel.kind==="c")glow(P_OUT);strokeB(thin,.85);strokeB(thick,1.9);edge(P_OUT);
  ctx.setLineDash([4/S,4/S]);ctx.lineWidth=1/S;ctx.strokeStyle=state.sel==="hippocampus"?"rgba(242,194,48,.8)":"rgba(255,255,255,.35)";ctx.stroke(P_HIP);ctx.setLineDash([]);
  drawNet(time);
  ctx.restore();
}

// ---------- Beyin sapı: örgülü lif demeti ----------
const STEM_TAB=[[300,362,30],[330,362,22],[346,362,17],[362,361,14],[380,360,11],[400,360,9.5],[434,359.5,8.5]];
function stemAt(y){for(let i=1;i<STEM_TAB.length;i++){const a=STEM_TAB[i-1],b=STEM_TAB[i];if(y<=b[0]){const t=(y-a[0])/(b[0]-a[0]),s=t*t*(3-2*t);return[a[1]+(b[1]-a[1])*s,a[2]+(b[2]-a[2])*s]}}return[359,7]}
function drawStem(time){
  const level=lv(state.xp.stem||0),sel=state.sel==="stem",n=5+Math.round(level*1.6),f=flash.stem||0,T=reduce?0:time;
  const base=sel?[242,194,48]:[225,245,235],hi=sel?[255,226,140]:[175,255,215];
  ctx.save();ctx.clip(P_STEM);ctx.lineCap="butt";ctx.lineJoin="round";
  // iç ışıma
  const g=ctx.createLinearGradient(345,0,380,0);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(.5,sel?"rgba(242,194,48,.10)":`rgba(150,255,205,${.04+level*.008})`);g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g;ctx.fillRect(330,305,70,120);
  for(let i=0;i<n;i++){
    const u=n>1?(i/(n-1))*2-1:0,ph=i*2.399,sp=.55+(i%3)*.12;
    const pts=[];for(let y=300;y<=434;y+=2){const [c,hw]=stemAt(y),w=Math.sin(y*.075+ph+T*sp),x=c+hw*(.62*u+.33*w);pts.push([x,y,Math.cos(y*.075+ph+T*sp)])}
    // derinlik: öndeki kısımlar kalın ve parlak
    for(let k=1;k<pts.length;k++){const p=pts[k-1],q=pts[k],d=(p[2]+q[2])*.5,fade=q[1]>392?1-(q[1]-392)/40:1;
      const a=(.18+level*.035+f*.25)*(.45+.55*(d*.5+.5))*fade;
      ctx.strokeStyle=`rgba(${base[0]},${base[1]},${base[2]},${Math.min(.95,a)})`;ctx.lineWidth=.45+.75*(d*.5+.5)+(i%4===0?.35:0);
      ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}
    // yukarı akan ışık izi
    if(!reduce){const head=1-((time*(.18+(i%5)*.04)+i*.37)%1),hi0=Math.floor(head*(pts.length-1));
      for(let k=0;k<9;k++){const j=hi0+k;if(j<1||j>=pts.length)continue;const p=pts[j-1],q=pts[j],a=(1-k/9)*(.55+level*.04)*(q[2]*.25+.75);
        ctx.strokeStyle=`rgba(${hi[0]},${hi[1]},${hi[2]},${Math.min(1,a)})`;ctx.lineWidth=1.5-k*.1;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}
      const hp=pts[Math.max(0,Math.min(pts.length-1,hi0))];const rg=ctx.createRadialGradient(hp[0],hp[1],0,hp[0],hp[1],4);rg.addColorStop(0,`rgba(${hi[0]},${hi[1]},${hi[2]},.8)`);rg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=rg;ctx.beginPath();ctx.arc(hp[0],hp[1],4,0,7);ctx.fill()}
  }
  ctx.restore();
}

// ---------- Sinir ağı: nöronlar seviyeyle doğar, komşu bölgelerle birleşir ----------
const POOL={frontal:24,motor:13,parietal:22,occipital:16,temporal:24,hippocampus:6,cerebellum:7,stem:5};
const ADJ=[["frontal","motor"],["frontal","temporal"],["frontal","parietal"],["motor","parietal"],["motor","temporal"],["parietal","occipital"],["parietal","temporal"],["occipital","temporal"],["temporal","hippocampus"],["parietal","hippocampus"],["occipital","cerebellum"],["cerebellum","stem"],["stem","temporal"]];
LOBES.forEach((L,li)=>{const r=rng(500+li*13),pts=[],N=POOL[L.id],md=L.id==="hippocampus"?12:17;let g=0;
  while(pts.length<N&&g++<40000){const x=40+r()*500,y=30+r()*400;if(lobeAt(x,y)!==L)continue;
    if(lobeAt(x+6,y)!==L||lobeAt(x-6,y)!==L||lobeAt(x,y+6)!==L||lobeAt(x,y-6)!==L)continue;
    if(pts.some(p=>Math.hypot(p.x-x,p.y-y)<md))continue;
    pts.push({x,y,L,li,i:pts.length,den:Array.from({length:3+Math.floor(r()*3)},()=>[r()*6.28,3+r()*4]),ph:r()*6.28,born:-1,fire:0})}
  L.neur=pts});
const NET=new Map();const newBridges=[];
const ek=(a,b)=>{const p=a.li+":"+a.i,q=b.li+":"+b.i;return p<q?p+"|"+q:q+"|"+p};
const visN=L=>L.neur.slice(0,Math.max(2,Math.round(L.neur.length*lv(state.xp[L.id]||0)/10)));
function syncNet(){
  const now=performance.now()/1000,want=new Map();
  LOBES.forEach(L=>{const vs=visN(L),l=lv(state.xp[L.id]||0),k=l>=7?3:l>=4?2:1;
    L.neur.forEach(n=>{const on=vs.includes(n);if(on&&n.born<0)n.born=now;if(!on)n.born=-1});
    vs.forEach(a=>vs.filter(b=>b!==a).map(b=>[b,Math.hypot(a.x-b.x,a.y-b.y)]).filter(e=>e[1]<80).sort((p,q)=>p[1]-q[1]).slice(0,k).forEach(([b])=>want.set(ek(a,b),[a,b,false])))});
  ADJ.forEach(([A,B])=>{const m=Math.min(lv(state.xp[A]||0),lv(state.xp[B]||0));if(m<3)return;const n=Math.floor((m-1)/2);
    const pairs=[];visN(BY[A]).forEach(a=>visN(BY[B]).forEach(b=>pairs.push([a,b,Math.hypot(a.x-b.x,a.y-b.y)])));pairs.sort((p,q)=>p[2]-q[2]);
    const used=new Set();let c=0;for(const [a,b] of pairs){if(c>=n)break;if(used.has(a)||used.has(b))continue;used.add(a);used.add(b);want.set(ek(a,b),[a,b,true]);c++}});
  want.forEach(([a,b,x],key)=>{const e=NET.get(key);if(e){e.die=0;return}let h=0;for(const ch of key)h=(h*31+ch.charCodeAt(0))|0;const r=rng(h);
    if(x)newBridges.push([a.L.id,b.L.id]);NET.set(key,{a,b,x,born:now+(x?.5:0)+r()*.6,die:0,bend:(r()-.5)*(x?.35:.5)})});
  NET.forEach((e,key)=>{if(!want.has(key)&&!e.die)e.die=now});
}
const qp=(a,cx,cy,b,t)=>{const m=1-t;return[m*m*a.x+2*m*t*cx+t*t*b.x,m*m*a.y+2*m*t*cy+t*t*b.y]};
function drawNet(time){
  const now=performance.now()/1000;ctx.lineCap="round";
  NET.forEach((e,key)=>{
    const g=Math.max(0,Math.min(1,(now-e.born)/(reduce?.01:1)));if(g<=0)return;
    let fa=1;if(e.die){fa=1-(now-e.die)/.6;if(fa<=0){NET.delete(key);return}}
    const {a,b}=e,dx=b.x-a.x,dy=b.y-a.y,cx=(a.x+b.x)/2-dy*e.bend,cy=(a.y+b.y)/2+dx*e.bend;
    const sel=a.L.id===state.sel||b.L.id===state.sel,la=Math.max(lv(state.xp[a.L.id]||0),lv(state.xp[b.L.id]||0));
    const al=(e.x?.6:.3+la*.035)*fa;
    ctx.strokeStyle=sel?`rgba(242,194,48,${Math.min(1,al+.2)})`:e.x?`rgba(150,255,205,${al})`:`rgba(255,255,255,${al})`;
    ctx.lineWidth=e.x?1.05:.7;ctx.beginPath();ctx.moveTo(a.x,a.y);
    if(g>=1)ctx.quadraticCurveTo(cx,cy,b.x,b.y);else{for(let t=.05;t<g;t+=.05){const p=qp(a,cx,cy,b,t);ctx.lineTo(p[0],p[1])}const p=qp(a,cx,cy,b,g);ctx.lineTo(p[0],p[1])}
    ctx.stroke();
    if(g<1){const p=qp(a,cx,cy,b,g);ctx.fillStyle="rgba(255,255,255,.95)";ctx.beginPath();ctx.arc(p[0],p[1],1.7,0,7);ctx.fill()}
    else if(!reduce&&!e.die){
      if(!e.sig&&Math.random()<(e.x?.01:.0035)*(1+la*.3))e.sig={t:0,dir:Math.random()<.5,sp:.014+Math.random()*.012};
      if(e.sig){e.sig.t+=e.sig.sp;const tt=e.sig.dir?e.sig.t:1-e.sig.t,p=qp(a,cx,cy,b,tt);
        ctx.fillStyle=sel?"rgba(255,226,140,.95)":"rgba(210,255,230,.95)";ctx.beginPath();ctx.arc(p[0],p[1],1.5,0,7);ctx.fill();
        if(e.sig.t>=1){(e.sig.dir?b:a).fire=now;e.sig=null}}}
  });
  LOBES.forEach(L=>{const sel=L.id===state.sel,f=flash[L.id]||0;
    L.neur.forEach(n=>{if(n.born<0)return;const g=Math.min(1,(now-n.born)/(reduce?.01:.6));
      const fire=n.fire?Math.max(0,1-(now-n.fire)/.5):0,pul=reduce?.5:.5+.5*Math.sin(time*2+n.ph),R=(1.5+pul*.5+fire*1.3+f*1.2)*g;
      ctx.strokeStyle=sel?`rgba(242,194,48,${.55*g})`:`rgba(255,255,255,${.4*g})`;ctx.lineWidth=.55;ctx.beginPath();
      n.den.forEach(([ang,len])=>{const ex=n.x+Math.cos(ang)*len*g,ey=n.y+Math.sin(ang)*len*g;ctx.moveTo(n.x,n.y);ctx.lineTo(ex,ey);ctx.moveTo(ex,ey);ctx.lineTo(ex+Math.cos(ang+.6)*len*.4*g,ey+Math.sin(ang+.6)*len*.4*g)});ctx.stroke();
      const h=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,R*3.4);
      h.addColorStop(0,sel?`rgba(242,194,48,${.5*g+fire*.3})`:`rgba(170,255,210,${.35*g+fire*.45})`);h.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=h;ctx.beginPath();ctx.arc(n.x,n.y,R*3.4,0,7);ctx.fill();
      ctx.fillStyle=sel?"#ffe28c":"#ffffff";ctx.beginPath();ctx.arc(n.x,n.y,R*.65,0,7);ctx.fill()})});
}

// ---------- Beyincik: folia yayları + hayat ağacı (arbor vitae) ----------
const HUB=[396,328];
function cblVal(X,Y,z){const dx=X-HUB[0],dy=Y-HUB[1],r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
  return Math.sin(r*.46+noise(a*1.7,r*.02,z)*2.2+Math.sin(a*15+z*1.6)*.28)*.5}
const ARBOR=[];{const r=rng(77);
  (function br(x,y,ang,len,d){const x2=x+Math.cos(ang)*len,y2=y+Math.sin(ang)*len;ARBOR.push({x,y,x2,y2,d,cx:(x+x2)/2+Math.cos(ang+1.57)*len*.18*(r()-.5),cy:(y+y2)/2+Math.sin(ang+1.57)*len*.18*(r()-.5)});
    if(d>=6)return;const k=d<2?3:2;for(let i=0;i<k;i++){const sp=k===3?(i-1)*.62:(i?.42:-.42);br(x2,y2,ang+sp+(r()-.5)*.25,len*(.7+r()*.12),d+1)}})(HUB[0]-4,HUB[1],-.05,34,0);}
function drawArbor(time){
  const L=BY.cerebellum,level=lv(state.xp.cerebellum||0),maxD=Math.min(6,1+Math.floor(level/1.6)),sel=state.sel==="cerebellum",f=flash.cerebellum||0;
  ctx.save();ctx.clip(P_CBL);ctx.lineCap="round";
  const col=a=>sel?`rgba(242,194,48,${a})`:`rgba(255,255,255,${a})`;
  // gövde ve dallar
  for(const s of ARBOR){if(s.d>maxD)continue;ctx.lineWidth=Math.max(.45,3.4-s.d*.5);ctx.strokeStyle=col(Math.min(1,.55+level*.035+f*.4-s.d*.04));
    ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.quadraticCurveTo(s.cx,s.cy,s.x2,s.y2);ctx.stroke()}
  // dallardan akan sinyal
  if(!reduce){ctx.setLineDash([3,11]);ctx.lineDashOffset=-time*22;ctx.lineWidth=1.3;ctx.strokeStyle=sel?"rgba(255,226,140,.95)":"rgba(180,255,215,.9)";
    ctx.beginPath();for(const s of ARBOR){if(s.d>maxD)continue;ctx.moveTo(s.x,s.y);ctx.quadraticCurveTo(s.cx,s.cy,s.x2,s.y2)}ctx.stroke();ctx.setLineDash([])}
  // uç düğümler (yaprak)
  for(const s of ARBOR){if(s.d!==maxD)continue;const p=reduce?.6:.5+.5*Math.sin(time*3+s.x2*.3);ctx.fillStyle=col(.35+p*.55);ctx.beginPath();ctx.arc(s.x2,s.y2,1.1+p*.9,0,7);ctx.fill()}
  ctx.restore();
}

// ---- açılış sayfası: durum, portlar, simülasyon ----
const LT=[0,40,90,150,230,330,450,590,760,950];
const lv=x=>{let l=1;for(let i=0;i<LT.length;i++)if(x>=LT[i])l=i+1;return Math.min(10,l)};
const START={frontal:30,motor:60,parietal:25,occipital:20,temporal:15,hippocampus:10,cerebellum:45,stem:20};
let state={xp:{...START},sel:"motor"};
// root is the .lp-stage element itself (#stage); querySelector('#stage') inside it would be null
const stage=root;
const cv=$id("brain");
if(!cv) throw new Error('landing brain canvas missing');
const ctx=cv.getContext("2d");
let W=0,H=0,DPR=1,S=1,OX=0,OY=0,mobile=false;
let raf=0, demoKick=null, demoIv=null;
// çipler
const CHIP={frontal:[.02,.24],temporal:[.02,.62],hippocampus:[.3,.93],motor:[.27,.03],parietal:[.62,.03],occipital:[.98,.24],cerebellum:[.98,.62],stem:[.66,.93]};
const chips={};
LOBES.forEach(L=>{const d=document.createElement("div");d.className="lp-bchip";d.style.setProperty("--c",L.col);
  d.innerHTML=`<i class="lp-dot"></i><span>${L.name}</span><b class="lp-lvn">1</b><i class="lp-pt"></i>`;stage.appendChild(d);chips[L.id]=d});
function place(){LOBES.forEach(L=>{const d=chips[L.id],[fx,fy]=CHIP[L.id];d.style.left=(fx*100)+"%";d.style.top=(fy*100)+"%";
  d.style.transform=`translate(${fx>.9?"-100%":fx<.1?"0":"-50%"},-50%)`;d.classList.toggle("lp-r",fx>.5)})}
place();
function readPorts(){const sr=stage.getBoundingClientRect();
  LOBES.forEach(L=>{L.ports=[];const d=chips[L.id];
    if(mobile){const [fx,fy]=CHIP[L.id];L.ports.push([fx*W,fy*H]);return}
    const p=d.querySelector(".lp-pt").getBoundingClientRect();L.ports.push([p.left-sr.left+p.width/2,p.top-sr.top+p.height/2])})}
function size(){const b=stage.getBoundingClientRect();W=b.width;H=b.height;DPR=Math.min(2,devicePixelRatio||1);cv.width=W*DPR;cv.height=H*DPR;
  mobile=W<560;stage.classList.toggle("lp-mob",mobile);
  S=mobile?Math.min(W/500,H/430):Math.min(W*.6/470,H*.66/400);OX=W/2-300*S;OY=H/2-235*S;readPorts();buildWires()}
const ro=new ResizeObserver(size); ro.observe(stage);
function refresh(rebuild){updateBlend();syncNet();LOBES.forEach(L=>chips[L.id].querySelector(".lp-lvn").textContent=lv(state.xp[L.id]));
  const tot=LOBES.reduce((a,L)=>a+lv(state.xp[L.id]),0);$id("tl").textContent=tot+" / 80";$id("tlb").style.width=(tot/80*100)+"%";
  LOBES.forEach(L=>chips[L.id].classList.toggle("lp-sel",L.id===state.sel));if(rebuild)buildWires()}
let lastT=0,vis=true;
const visObs=new IntersectionObserver(e=>{vis=e[0].isIntersecting},{threshold:0}); visObs.observe(stage);
function frame(ms){if(!vis||document.hidden)return;
  const time=reduce?0:ms/1000;lastT=time;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
  ctx.lineWidth=.6;ctx.strokeStyle="rgba(255,255,255,.13)";ctx.beginPath();
  ambient.forEach(w=>{const b=bez(w,time);if(!b)return;ctx.moveTo(b[0],b[1]);ctx.bezierCurveTo(b[2],b[3],b[4],b[5],b[6],b[7])});ctx.stroke();
  LOBES.forEach(L=>{if(!L.ports.length)return;const level=lv(state.xp[L.id]),sel=L.id===state.sel;
    ctx.lineWidth=sel?1.1:.5+level*.06;ctx.strokeStyle=sel?"rgba(242,194,48,.6)":`rgba(255,255,255,${.16+level*.045})`;ctx.beginPath();
    wires.forEach(w=>{if(w.L!==L)return;const b=bez(w,time);w.b=b;if(!b)return;ctx.moveTo(b[0],b[1]);ctx.bezierCurveTo(b[2],b[3],b[4],b[5],b[6],b[7])});ctx.stroke()});
  if(!reduce)LOBES.forEach(L=>{const level=lv(state.xp[L.id]);if(Math.random()<.004*level*level/3){const ws=wires.filter(w=>w.L===L);if(ws.length)pulses.push({w:ws[Math.floor(Math.random()*ws.length)],t:0,sp:.006+Math.random()*.008})}});
  pulses=pulses.filter(p=>p.t<1);
  pulses.forEach(p=>{p.t+=p.sp;if(!p.w.b||p.t<0)return;const sel=p.w.L.id===state.sel;
    for(let k=0;k<5;k++){const q=bpt(p.w.b,Math.max(0,p.t-k*.012));ctx.fillStyle=sel?`rgba(242,194,48,${.9-k*.17})`:`rgba(255,255,255,${.85-k*.16})`;ctx.beginPath();ctx.arc(q[0],q[1],1.9-k*.25,0,7);ctx.fill()}
    if(p.t>=.97)flash[p.w.L.id]=Math.min(1,(flash[p.w.L.id]||0)+.12)});
  drawBrain(time);
  for(const f in flash)flash[f]*=.94}
function frameLoop(ms){ raf=requestAnimationFrame(frameLoop); frame(ms); }
size();refresh(true);raf=requestAnimationFrame(frameLoop);
// simülasyon: kayıtlar gelir, bölgeler büyür, ağ çoğalır; doluca sıfırlanır
const EV=[["motor","Atış kaydı",46],["cerebellum","Kuru tetik seansı",40],["frontal","FOF tatbikatı",38],["parietal","Balistik hesap",34],["stem","TCCC tatbikatı",40],["motor","CQB tatbikatı",42],["occipital","Video analizi",30],["temporal","Doktrin okuma",34],["hippocampus","Seri bonusu",28],["frontal","AAR",24]];
const SIDE={motor:{cerebellum:.25,occipital:.25,frontal:.15},cerebellum:{motor:.4},frontal:{motor:.3,occipital:.2},parietal:{frontal:.3,temporal:.15},stem:{frontal:.2},occipital:{temporal:.4},temporal:{hippocampus:.3},hippocampus:{temporal:.3},};
let ei=0;const toast=$id("toast");
function demo(){
  const tot=LOBES.reduce((a,L)=>a+lv(state.xp[L.id]),0);
  if(tot>=62){state.xp={...START};pulses=[];refresh(true);toast.innerHTML='Yeni operatör · <i>simülasyon yeniden başladı</i>';toast.classList.add("lp-on");setTimeout(()=>toast.classList.remove("lp-on"),1900);return}
  const [id,label,g]=EV[ei++%EV.length];const before=LOBES.map(L=>lv(state.xp[L.id]));
  state.xp[id]=Math.min(1000,state.xp[id]+g);Object.entries(SIDE[id]||{}).forEach(([r,w])=>state.xp[r]=Math.min(1000,state.xp[r]+g*w));
  state.sel=id;flash[id]=1;const up=LOBES.some((L,i)=>lv(state.xp[L.id])>before[i]);refresh(up);
  const L=BY[id],ws=wires.filter(w=>w.L===L);for(let k=0;k<Math.min(16,ws.length);k++)pulses.push({w:ws[k],t:-k*.04,sp:.013+Math.random()*.01});
  const lvl=lv(state.xp[id]);toast.innerHTML=`${label} · ${L.name} <i>+${g}</i>${lvl>before[LOBES.indexOf(L)]?` · <b>seviye ${lvl}</b>`:""}`;toast.classList.add("lp-on");setTimeout(()=>toast.classList.remove("lp-on"),1900)}
if(!reduce){demoKick=setTimeout(demo,1200);demoIv=setInterval(()=>{if(vis&&!document.hidden)demo()},2400)}


return function cleanup() {
  try { cancelAnimationFrame(raf); } catch (e) {}
  try { if (demoKick) clearTimeout(demoKick); } catch (e) {}
  try { if (demoIv) clearInterval(demoIv); } catch (e) {}
  try { ro && ro.disconnect(); } catch (e) {}
  try { visObs && visObs.disconnect(); } catch (e) {}
};
}
