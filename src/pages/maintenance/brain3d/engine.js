/**
 * Maintenance 3D runtime — 1:1 port of docs/brain3d-prototype.html
 * @param {HTMLElement} root .mnt-root
 * @param {{ onNotify?: () => void, onEvent?: (ev:string,p?:any)=>void }} opts
 */
export function mountMaintenanceRuntime(root, opts = {}) {
const __disposers = [];
const __timers = [];
const __intervals = [];
let __raf = 0;
let __disposed = false;
const __on = (t, ty, fn, opt) => { t.addEventListener(ty, fn, opt); __disposers.push(() => t.removeEventListener(ty, fn, opt)); };
const __later = (fn, ms) => { const id = setTimeout(fn, ms); __timers.push(id); return id; };
const __every = (fn, ms) => { const id = setInterval(fn, ms); __intervals.push(id); return id; };

const $=id=>root.querySelector("#mnt-"+id)||root.querySelector("#"+id);
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse=matchMedia("(pointer: coarse)").matches&&!matchMedia("(pointer: fine)").matches;
if(coarse)root.classList.add("touch");

/* ================= Bölgeler ================= */
const LOBES=[
 {id:"frontal",sh:"Frontal",name:"Frontal lob",func:"Karar, planlama",col:"#5b8def",src:"Tamamlanan görevler ve FOF senaryoları",act:"Görev tamamla",chip:[.16,.30]},
 {id:"motor",sh:"Motor",name:"Motor korteks",func:"Hareket",col:"#3fbf6f",src:"Atış kaydı sayısı ve skorları",act:"Atış kaydı ekle",chip:[.36,.10]},
 {id:"parietal",sh:"Parietal",name:"Parietal lob",func:"Uzamsal hesap",col:"#c9b52c",src:"Balistik profiller ve envanter bakım kayıtları",act:"Balistik profil kaydet",chip:[.62,.10]},
 {id:"occipital",sh:"Oksipital",name:"Oksipital lob",func:"Görme",col:"#e8862a",src:"Okunan haber ve izlenen video",act:"Haber oku",chip:[.84,.30]},
 {id:"temporal",sh:"Temporal",name:"Temporal lob",func:"Hafıza, dil",col:"#36b9c9",src:"Okunan doktrinler",act:"Doktrin oku",chip:[.16,.64]},
 {id:"hippocampus",sh:"Hipokampus",name:"Hipokampus",func:"Kayıt, hatıra",col:"#e0609a",src:"Düzenli kayıt serisi",act:"Günlük seri +1",chip:[.32,.88]},
 {id:"cerebellum",sh:"Beyincik",name:"Beyincik",func:"Koordinasyon, refleks",col:"#f0a53a",src:"Timer seansları",act:"Timer seansı",chip:[.84,.64]},
 {id:"stem",sh:"Beyin sapı",name:"Beyin sapı",func:"Hayati fonksiyonlar",col:"#e5534b",src:"TCCC kayıtları",act:"TCCC tatbikatı",chip:[.64,.88]},
];
const RI=Object.fromEntries(LOBES.map((L,i)=>[L.id,i]));
const hex=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];
LOBES.forEach(L=>L.rgb=hex(L.col));
const LT=[0,40,90,150,230,330,450,590,760,950];
const lv=x=>{let l=1;for(let i=0;i<LT.length;i++)if(x>=LT[i])l=i+1;return Math.min(10,l)};
const START={frontal:600,motor:780,parietal:470,occipital:460,temporal:95,hippocampus:460,cerebellum:800,stem:600};
const DIM=new Float32Array([1,1,1,1,.5,1,1,1]); // temporal: bir süredir kayıtsız, sönüyor
const state={xp:{...START},sel:-1,hov:-1};
const levelOf=i=>lv(state.xp[LOBES[i].id]);

/* ================= Gürültü ================= */
const perm=new Uint8Array(512);{const p=[...Array(256).keys()];let s=11;for(let i=255;i>0;i--){s=(s*16807)%2147483647;const j=s%(i+1);[p[i],p[j]]=[p[j],p[i]]}for(let i=0;i<512;i++)perm[i]=p[i&255]}
const fade=t=>t*t*t*(t*(t*6-15)+10),lerp=(a,b,t)=>a+t*(b-a);
function grad(h,x,y,z){h&=15;const u=h<8?x:y,v=h<4?y:(h===12||h===14?x:z);return((h&1)?-u:u)+((h&2)?-v:v)}
function noise(x,y,z){const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);const u=fade(x),v=fade(y),w=fade(z);
 const A=perm[X]+Y,AA=perm[A]+Z,AB=perm[A+1]+Z,B=perm[X+1]+Y,BA=perm[B]+Z,BB=perm[B+1]+Z;
 return lerp(lerp(lerp(grad(perm[AA],x,y,z),grad(perm[BA],x-1,y,z),u),lerp(grad(perm[AB],x,y-1,z),grad(perm[BB],x-1,y-1,z),u),v),
  lerp(lerp(grad(perm[AA+1],x,y,z-1),grad(perm[BA+1],x-1,y,z-1),u),lerp(grad(perm[AB+1],x,y-1,z-1),grad(perm[BB+1],x-1,y-1,z-1),u),v),w)}
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ================= Vektör yardımcıları ================= */
const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]};

/* ================= Geometri: anatomik beyin ================= */
// Koordinat: x = yan (sağ +), y = üst, z = ön. Birim ≈ mm.
function ell(px,py,pz,cx,cy,cz,rx,ry,rz){const x=(px-cx)/rx,y=(py-cy)/ry,z=(pz-cz)/rz,k0=Math.sqrt(x*x+y*y+z*z),k1=Math.sqrt(x*x/(rx*rx)+y*y/(ry*ry)+z*z/(rz*rz));return k0*(k0-1)/(k1||1e-6)}
function smin(a,b,k){const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return b+(a-b)*h-k*h*(1-h)}
function sdfHemi(x,y,z){ // yerel: x>=0
  let d=ell(x,y,z,33,14,-4,37,54,83);
  d=smin(d,ell(x,y,z,45,-19,12,25,21,42),11);            // temporal lob
  d=smin(d,ell(x,y,z,26,6,56,30,36,24),9);              // frontal kutup
  d=smin(d,ell(x,y,z,28,2,-62,30,34,26),10);            // oksipital kutup
  d=Math.max(d,1.6-x);                                   // iç (medial) yüzey
  d=Math.max(d,-(y+44));
  return d}
const ys=z=>-3-.13*z;                       // Sylvius yarığı yüksekliği
const zc=y=>-11+.24*(62-y);                 // santral oluk
function wig(x,y,z,s){return noise(x*.03+s,y*.03,z*.03)*4.2+noise(x*.09,y*.09+s,z*.09)*1.2}
function majorDist(x,y,z,s){
  const wy=y+wig(x,y,z,s),wz=z+wig(x,y,z,s+19);
  const out=v=>Math.max(0,v);
  let m=1e9;
  m=Math.min(m,Math.abs(wy-ys(wz))+out(wz-38)*2+out(-34-wz)*2+out(29-x)*1.6);                          // lateral (Sylvius)
  m=Math.min(m,Math.abs(wz-zc(wy))*.95+out(ys(wz)+5-wy)*2.2+out(wy-76)*2);                             // santral
  m=Math.min(m,Math.abs(wz-(zc(wy)+17))+out(ys(wz)+9-wy)*2+out(wy-58)*2);                              // prerolandik
  m=Math.min(m,Math.abs(wz-(zc(wy)-15))+out(ys(wz)+9-wy)*2+out(wy-60)*2);                              // postsantral
  m=Math.min(m,Math.abs(wy-45)+out(zc(45)+21-wz)*2+out(wz-62)*2);                                      // üst frontal
  m=Math.min(m,Math.abs(wy-21)+out(zc(21)+21-wz)*2+out(wz-58)*2+out(26-x)*2);                          // alt frontal
  m=Math.min(m,Math.abs(wy-(ys(wz)-13))+out(wz-36)*2+out(-46-wz)*2+out(31-x)*1.6);                     // üst temporal
  m=Math.min(m,Math.abs(wy-(41+.16*(wz+30)))+out(wz-(zc(wy)-19))*2+out(-66-wz)*2);                     // intraparietal
  m=Math.min(m,Math.abs(wz-(-58+.25*(wy-20)))+out(10-wy)*2+out(wy-62)*2);                              // parieto-oksipital
  return m}
const ANI={0:[.07,.1,.042],1:[.07,.032,.13],2:[.07,.07,.075],3:[.07,.085,.06],4:[.07,.12,.04],5:[.07,.12,.04]};
function minorField(x,y,z,s,reg){const k=ANI[reg]||ANI[2];
  const wx=x+noise(x*.03+s,y*.03,z*.03)*6,wy=y+noise(x*.03,y*.03+s,z*.03)*6,wz=z+noise(x*.03,y*.03,z*.03+s)*6;
  return noise(wx*k[0]+s,wy*k[1],wz*k[2])+.3*noise(wx*k[0]*2.1,wy*k[1]*2.1+s,wz*k[2]*2.1)}
function regionOf(x,y,z){
  if(z<-56+.12*(y-10))return RI.occipital;
  if(y<ys(z)-1&&z>-60){if(x<27&&y<-13&&z<14&&z>-42)return RI.hippocampus;return RI.temporal}
  const c=zc(y);
  if(z>c+17)return RI.frontal;
  if(z>c-1)return RI.motor;
  return RI.parietal}

function icosphere(n){const t=(1+Math.sqrt(5))/2;let v=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(V.norm);
  let f=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let i=0;i<n;i++){const cache=new Map(),nf=[];const mid=(a,b)=>{const k=a<b?a*1e6+b:b*1e6+a;let r=cache.get(k);if(r===undefined){const p=v[a],q=v[b];r=v.length;v.push(V.norm([p[0]+q[0],p[1]+q[1],p[2]+q[2]]));cache.set(k,r)}return r};
    for(const [a,b,c] of f){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);nf.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}f=nf}
  return{v,f}}

function finishMesh(P,F,extra,C){ // P: Float32Array positions, F: Uint32Array
  const n=P.length/3,N=new Float32Array(n*3);
  if(C){const P0=P;P=(extra&&extra.Q)||P0;for(let i=0;i<F.length;i+=3){const a=F[i]*3,b=F[i+1]*3,c=F[i+2]*3;const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const cx=(P[a]+P[b]+P[c])/3-C(P[a+1])[0],cy=(P[a+1]+P[b+1]+P[c+1])/3-C(P[a+1])[1],cz=(P[a+2]+P[b+2]+P[c+2])/3-C(P[a+1])[2];if(nx*cx+ny*cy+nz*cz<0){const t=F[i+1];F[i+1]=F[i+2];F[i+2]=t}}P=P0}
  for(let i=0;i<F.length;i+=3){const a=F[i]*3,b=F[i+1]*3,c=F[i+2]*3;
    const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of[a,b,c]){N[k]+=nx;N[k+1]+=ny;N[k+2]+=nz}}
  for(let i=0;i<n;i++){const l=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1;N[i*3]/=l;N[i*3+1]/=l;N[i*3+2]/=l}
  const o={P,N,F,...extra};if(!o.G)o.G=N;if(!o.Q)o.Q=P;return o}

function buildHemi(sphere,side){
  const {v,f}=sphere,n=v.length,P=new Float32Array(n*3),S=new Float32Array(n),M=new Float32Array(n),R=new Float32Array(n),G=new Float32Array(n*3),Q=new Float32Array(n*3);
  const C=[30,6,-4],seed=side>0?0:41.7;
  for(let i=0;i<n;i++){const d=v[i];let r=125;
    for(let k=0;k<80;k++){const x=C[0]+d[0]*r,y=C[1]+d[1]*r,z=C[2]+d[2]*r,s=sdfHemi(x,y,z);if(s<.03)break;r-=Math.max(s*.75,.2);if(r<1){r=1;break}}
    let x=C[0]+d[0]*r,y=C[1]+d[1]*r,z=C[2]+d[2]*r;
    // yüzey normali (sdf gradyanı)
    const e=.6,gx=sdfHemi(x+e,y,z)-sdfHemi(x-e,y,z),gy=sdfHemi(x,y+e,z)-sdfHemi(x,y-e,z),gz=sdfHemi(x,y,z+e)-sdfHemi(x,y,z-e),gl=Math.hypot(gx,gy,gz)||1;
    const reg=regionOf(x,y,z),s=minorField(x,y,z,seed,reg),m=majorDist(x,y,z,seed);
    Q[i*3]=x*side;Q[i*3+1]=y;Q[i*3+2]=z;
    const medial=x<3?.45:1;
    const dep=(2.7*Math.exp(-(((s/.11))**2))+5.2*Math.exp(-(((m/2.1))**2)))*medial-.5*Math.min(1,Math.abs(s)/.3);
    x-=gx/gl*dep;y-=gy/gl*dep;z-=gz/gl*dep;
    P[i*3]=x*side;P[i*3+1]=y;P[i*3+2]=z;S[i]=s;M[i]=m;R[i]=reg;G[i*3]=gx/gl*side;G[i*3+1]=gy/gl;G[i*3+2]=gz/gl}
  const F=new Uint32Array(f.length*3);for(let i=0;i<f.length;i++){const t=f[i];if(side>0){F[i*3]=t[0];F[i*3+1]=t[1];F[i*3+2]=t[2]}else{F[i*3]=t[0];F[i*3+1]=t[2];F[i*3+2]=t[1]}}
  return finishMesh(P,F,{S,M,R,G,Q},()=>[30*side,6,-4])}

const CB_HUB=[0,-30,-44];
function sdfCbl(x,y,z){let d=smin(ell(x,y,z,19,-39,-58,30,20,27),ell(x,y,z,-19,-39,-58,30,20,27),10);d=Math.max(d,-(y+60));return d}
function buildCbl(sphere){
  const {v,f}=sphere,n=v.length,P=new Float32Array(n*3),S=new Float32Array(n),M=new Float32Array(n),R=new Float32Array(n).fill(RI.cerebellum),G=new Float32Array(n*3),Q=new Float32Array(n*3);
  const C=[0,-39,-58];
  for(let i=0;i<n;i++){const d=v[i];let r=70;
    for(let k=0;k<70;k++){const x=C[0]+d[0]*r,y=C[1]+d[1]*r,z=C[2]+d[2]*r,s=sdfCbl(x,y,z);if(s<.03)break;r-=Math.max(s*.75,.2);if(r<1){r=1;break}}
    let x=C[0]+d[0]*r,y=C[1]+d[1]*r,z=C[2]+d[2]*r;
    const e=.6,gx=sdfCbl(x+e,y,z)-sdfCbl(x-e,y,z),gy=sdfCbl(x,y+e,z)-sdfCbl(x,y-e,z),gz=sdfCbl(x,y,z+e)-sdfCbl(x,y,z-e),gl=Math.hypot(gx,gy,gz)||1;
    Q[i*3]=x;Q[i*3+1]=y;Q[i*3+2]=z;
    const hr=Math.hypot(x-CB_HUB[0],(y-CB_HUB[1])*1.15,z-CB_HUB[2]);
    const s=Math.sin(hr*.78+noise(x*.06,y*.06,z*.06)*1.3)*.5;
    const m=Math.abs(hr-24+noise(x*.05,y*.05,z*.05)*1.5)+ (Math.abs(x)<5?Math.abs(x)*0:0);
    const vermis=Math.exp(-(((x/4))**2))*2.2;
    const dep=.9*Math.exp(-(((s/.12))**2))+2.2*Math.exp(-(((m/1.6))**2))+vermis;
    x-=gx/gl*dep;y-=gy/gl*dep;z-=gz/gl*dep;
    P[i*3]=x;P[i*3+1]=y;P[i*3+2]=z;S[i]=s;M[i]=Math.min(m,Math.abs(x)<1.2?0:99);G[i*3]=gx/gl;G[i*3+1]=gy/gl;G[i*3+2]=gz/gl}
  const F=new Uint32Array(f.length*3);f.forEach((t,i)=>{F[i*3]=t[0];F[i*3+1]=t[1];F[i*3+2]=t[2]});
  return finishMesh(P,F,{S,M,R,G,Q},()=>C)}

function stemCenter(t){return[0,-10-t*72,-20-t*12-Math.sin(t*3.1)*4]}
function buildStem(){
  const segA=36,segL=48,P=[],S=[],M=[],R=[],F=[];
  for(let j=0;j<=segL;j++){const t=j/segL,c=stemCenter(t),c2=stemCenter(Math.min(1,t+.01)),tg=V.norm(V.sub(c2,c));
    const a1=V.norm(V.cross(tg,[1,0,0])),a2=V.cross(tg,a1);
    const rad=(11.5-t*4.5)*(1+.12*Math.exp(-(((t-.32)/.1)**2)));
    for(let i=0;i<segA;i++){const th=i/segA*Math.PI*2,cs=Math.cos(th),sn=Math.sin(th);
      const rr=rad*(1+.06*Math.cos(th*2));
      P.push(c[0]+(a1[0]*cs+a2[0]*sn)*rr*1.12,c[1]+(a1[1]*cs+a2[1]*sn)*rr,c[2]+(a1[2]*cs+a2[2]*sn)*rr);
      S.push(Math.sin(th*7+t*1.5)*.5);M.push(Math.abs(Math.sin(th*.5))<.02?0:99);R.push(RI.stem)}}
  for(let j=0;j<segL;j++)for(let i=0;i<segA;i++){const a=j*segA+i,b=j*segA+(i+1)%segA,c=a+segA,d=b+segA;F.push(a,c,b,b,c,d)}
  return finishMesh(new Float32Array(P),new Uint32Array(F),{S:new Float32Array(S),M:new Float32Array(M),R:new Float32Array(R)},y=>stemCenter(Math.max(0,Math.min(1,(-10-y)/72))))}

/* ================= Hipokampus (iç yapı, röntgen görünümü) ================= */
function hippoCurve(side){const pts=[];for(let i=0;i<=40;i++){const t=i/40;pts.push([side*(26+4*Math.sin(t*3)),-24+9*t*t+3*Math.sin(t*5),8-40*t])}return pts}

/* ================= WebGL ================= */
const cv=$("gl"),ov=$("ov"),stage=$("stage");
if(!cv||!ov||!stage){throw new Error("maintenance: missing #mnt-gl / #mnt-ov / #mnt-stage");}
const octx=ov.getContext("2d");
const gl=cv.getContext("webgl2",{antialias:true,alpha:true,premultipliedAlpha:false});
let NOGL=!gl;
if(cv){
  __on(cv,"webglcontextlost",(e)=>{e.preventDefault();NOGL=true});
  __on(cv,"webglcontextrestored",()=>{
    try{
      NOGL=false;
      SP=prog(SURF_VS,SURF_FS);PP=prog(PT_VS,PT_FS);LP=prog(LN_VS,LN_FS);
      build();size();refresh();
      if(!__raf)__raf=requestAnimationFrame(frame);
    }catch(err){console.warn(err);NOGL=true;$("nogl").style.display="grid"}
  });
}
function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
function prog(vs,fs){const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i);const nm=a.name.replace(/\[0\]$/,"");u[nm]=gl.getUniformLocation(p,a.name)}return{p,u}}

const SURF_VS=`#version 300 es
in vec3 aP;in vec3 aN;in vec3 aG;in float aS;in float aM;in float aR;
uniform mat4 uVP;uniform float uPush;
out vec3 vP;out vec3 vN;out vec3 vG;out float vS;out float vM;out float vR;
void main(){vec3 p=aP+aN*uPush;vP=p;vN=aN;vG=aG;vS=aS;vM=aM;vR=aR;gl_Position=uVP*vec4(p,1.);}`;
const SURF_FS=`#version 300 es
precision highp float;
in vec3 vP;in vec3 vN;in vec3 vG;in float vS;in float vM;in float vR;
uniform vec3 uCam;uniform vec3 uCol[8];uniform float uLv[8];uniform float uFl[8];uniform float uDim[8];uniform float uLW;uniform int uSel;uniform int uHov;uniform int uMode;uniform float uTime;
out vec4 o;
void main(){
  if(uMode==1){o=vec4(.9,.93,.91,1.);return;}
  vec3 N=normalize(vN);vec3 V=normalize(uCam-vP);vec3 Gs=normalize(vG);float nd=clamp(dot(Gs,V),0.,1.);float ndd=clamp(dot(N,V),0.,1.);
  int r=int(vR+.5);vec3 rc=uCol[r];float lv=uLv[r]*.1;float fl=uFl[r];
  vec3 L=normalize(vec3(.35,.85,.45));
  vec3 col=vec3(.012,.016,.014)+vec3(.028,.032,.03)*max(dot(N,L),0.);
  float wS=fwidth(vS)*uLW;float minor=1.-smoothstep(wS*.55,wS*1.45,abs(vS));
  float wM=max(fwidth(vM),.001)*uLW;float major=1.-smoothstep(wM*.7,wM*1.9,vM);
  float face=smoothstep(.05,.42,nd);
  vec3 lc=mix(vec3(.9,.94,.92),rc,.62);
  bool sel=(r==uSel);
  if(sel)lc=mix(lc,vec3(.95,.78,.22),.72);
  float breathe=.92+.08*sin(uTime*.9+vP.y*.04);
  float a=(minor*(.34+.5*lv+fl*.45)*breathe+major*(.6+.35*lv+fl*.35))*uDim[r];
  col+=lc*a*face;
  if(sel)col+=vec3(.95,.76,.19)*.03;
  if(r==uHov&&!sel)col+=rc*.05;
  float rim=pow(1.-nd,3.2);
  col+=mix(vec3(.85,.92,.88),rc,.25)*rim*.18;
  col*=.7+.3*smoothstep(0.,.5,ndd);
  o=vec4(col,1.);
}`;
const PT_VS=`#version 300 es
in vec3 aP;in vec4 aC;in float aZ;
uniform mat4 uVP;uniform float uK;
out vec4 vC;
void main(){vec4 c=uVP*vec4(aP,1.);gl_Position=c;gl_PointSize=max(1.,aZ*uK/c.w);vC=aC;}`;
const PT_FS=`#version 300 es
precision highp float;in vec4 vC;out vec4 o;
void main(){vec2 q=gl_PointCoord*2.-1.;float d=length(q);float core=1.-smoothstep(.2,.3,d);float halo=exp(-d*d*7.)*.5;float a=(core+halo*(1.-core))*vC.a;if(a<.004)discard;o=vec4(vC.rgb*(core+halo*.8),a);}`;
const LN_VS=`#version 300 es
in vec3 aP;in vec4 aC;uniform mat4 uVP;out vec4 vC;
void main(){gl_Position=uVP*vec4(aP,1.);vC=aC;}`;
const LN_FS=`#version 300 es
precision highp float;in vec4 vC;out vec4 o;void main(){o=vC;}`;
let SP=null,PP=null,LP=null;if(!NOGL){try{SP=prog(SURF_VS,SURF_FS);PP=prog(PT_VS,PT_FS);LP=prog(LN_VS,LN_FS)}catch(e){console.warn(e);NOGL=true}}

function meshVAO(m){const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const att=(loc,data,size)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0)};
  const p=SP.p;att(gl.getAttribLocation(p,"aP"),m.P,3);att(gl.getAttribLocation(p,"aN"),m.N,3);att(gl.getAttribLocation(p,"aG"),m.G,3);att(gl.getAttribLocation(p,"aS"),m.S,1);att(gl.getAttribLocation(p,"aM"),m.M,1);att(gl.getAttribLocation(p,"aR"),m.R,1);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,m.F,gl.STATIC_DRAW);gl.bindVertexArray(null);m.vao=vao;m.count=m.F.length;
  const hv=gl.createVertexArray();gl.bindVertexArray(hv);att(gl.getAttribLocation(p,"aP"),m.Q,3);att(gl.getAttribLocation(p,"aN"),m.G,3);att(gl.getAttribLocation(p,"aG"),m.G,3);att(gl.getAttribLocation(p,"aS"),m.S,1);att(gl.getAttribLocation(p,"aM"),m.M,1);att(gl.getAttribLocation(p,"aR"),m.R,1);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bindVertexArray(null);m.hvao=hv}
function dynVAO(p,stride){ // aP(3) aC(4) [aZ(1)]
  const vao=gl.createVertexArray(),b=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,b);
  const lp=gl.getAttribLocation(p,"aP"),lc=gl.getAttribLocation(p,"aC"),lz=gl.getAttribLocation(p,"aZ");
  gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,3,gl.FLOAT,false,stride*4,0);
  gl.enableVertexAttribArray(lc);gl.vertexAttribPointer(lc,4,gl.FLOAT,false,stride*4,12);
  if(lz>=0){gl.enableVertexAttribArray(lz);gl.vertexAttribPointer(lz,1,gl.FLOAT,false,stride*4,28)}
  gl.bindVertexArray(null);return{vao,b,n:0}}
const PTS=NOGL?null:dynVAO(PP.p,8),LNS=NOGL?null:dynVAO(LP.p,7),XR=NOGL?null:dynVAO(LP.p,7),XRP=NOGL?null:dynVAO(PP.p,8);
function upload(d,arr){gl.bindBuffer(gl.ARRAY_BUFFER,d.b);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.DYNAMIC_DRAW);}

/* ================= Matris ================= */
function persp(fov,a,n,f){const t=1/Math.tan(fov/2),nf=1/(n-f);return[t/a,0,0,0,0,t,0,0,0,0,(f+n)*nf,-1,0,0,2*f*n*nf,0]}
function lookAt(e,c,u){const z=V.norm(V.sub(e,c)),x=V.norm(V.cross(u,z)),y=V.cross(z,x);return{m:[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,e),-V.dot(y,e),-V.dot(z,e),1],x,y,z}}
function mul(a,b){const o=new Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];o[i*4+j]=s}return o}

/* ================= Sahne ================= */
let MESHES=[],HEMI=[],NEUR=[],XNEUR=[];
const TARGET=[0,2,-6];
const cam={yaw:.38,pitch:.2,dist:400,ty:.38,tp:.2,td:400,vy:0,vp:0};
const HOME={yaw:.38,pitch:.2,dist:400};
let W=0,H=0,DPR=1,VP=null,CAM=[0,0,0],BASIS=null,FOV=.56;

function build(){
  const sph=icosphere(6),sphC=icosphere(5);
  const R=buildHemi(sph,1),Lh=buildHemi(sph,-1),Cb=buildCbl(sphC),St=buildStem();
  HEMI=[R,Lh];MESHES=[St,Cb,R,Lh];MESHES.forEach(meshVAO);
  buildNeurons();
}
async function buildChunked(){
  const yield0 = () => new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => requestAnimationFrame(r));
  const sph = icosphere(6);
  await yield0();
  const sphC = icosphere(5);
  await yield0();
  const R = buildHemi(sph, 1);
  await yield0();
  const Lh = buildHemi(sph, -1);
  await yield0();
  const Cb = buildCbl(sphC);
  await yield0();
  const St = buildStem();
  HEMI = [R, Lh];
  MESHES = [St, Cb, R, Lh];
  MESHES.forEach(meshVAO);
  await yield0();
  buildNeurons();
}

/* ---- nöronlar: kıvrım tepelerinde, Poisson dağılımı ---- */
const POOL=[26,12,20,14,22,7,12,6];
function tangentBasis(n){const a=Math.abs(n[1])<.9?[0,1,0]:[1,0,0];const t1=V.norm(V.cross(n,a)),t2=V.cross(n,t1);return[t1,t2]}
function buildNeurons(){
  NEUR=[];const r=rng(7);
  const pick=(mesh,hemi,ri,N,md)=>{const cand=[];const {P,N:Nm,S,M,R}=mesh;
    for(let i=0;i<R.length;i++){if(R[i]!==ri)continue;if(Math.abs(S[i])<.2||M[i]<3)continue;if(mesh===HEMI[0]&&P[i*3]<9)continue;if(mesh===HEMI[1]&&P[i*3]>-9)continue;cand.push(i)}
    const out=[];let g=0;while(out.length<N&&g++<6000&&cand.length){const i=cand[Math.floor(r()*cand.length)];const p=[P[i*3],P[i*3+1],P[i*3+2]];
      if(out.some(o=>Math.hypot(o.p[0]-p[0],o.p[1]-p[1],o.p[2]-p[2])<md))continue;
      const n=[Nm[i*3],Nm[i*3+1],Nm[i*3+2]],[t1,t2]=tangentBasis(n);
      const den=[];const nb=4+Math.floor(r()*2);for(let k=0;k<nb;k++){const a=k/nb*6.283+r()*.6,l=3.6+r()*2.4;den.push([a,l,(r()-.5)*.9])}
      out.push({p:V.add(p,V.mul(n,.9)),n,t1,t2,den,ri,hemi,ph:r()*6.28,born:-1,fire:0,i:out.length})}
    return out};
  for(let h=0;h<2;h++)for(let ri=0;ri<8;ri++){if(ri===RI.cerebellum||ri===RI.stem||ri===RI.hippocampus)continue;NEUR.push(...pick(HEMI[h],h,ri,POOL[ri],ri===RI.motor?8.5:10))}
  NEUR.push(...pick(MESHES[1],2,RI.cerebellum,POOL[RI.cerebellum]*2,7));
  NEUR.push(...pick(MESHES[0],2,RI.stem,POOL[RI.stem],6));
  // hipokampus: iç yapı üzerinde
  for(const side of[1,-1]){const c=hippoCurve(side);for(let k=0;k<POOL[RI.hippocampus];k++){const p=c[Math.floor((k+.5)/POOL[RI.hippocampus]*c.length)];const n=[side,0,0],[t1,t2]=tangentBasis(n);
    NEUR.push({p,n,t1,t2,den:[[0,1.6,0],[2.1,1.4,0],[4.2,1.5,0]],ri:RI.hippocampus,hemi:side>0?0:1,ph:r()*6.28,born:-1,fire:0,i:k,xray:true})}}
}
const visibleN=ri=>{const L=levelOf(ri);return NEUR.filter(n=>n.ri===ri).filter(n=>n.i<Math.max(2,Math.round(POOL[ri]*(n.ri===RI.cerebellum?2:1)*L/10)))};

/* ---- bağlantılar: düzlemsel, kısa, kesişmeyen ---- */
const EDGES=new Map();
const segX2=(a,b,c,d)=>{if(a===c||a===d||b===c||b===d)return false;const o=(p,q,r)=>Math.sign((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]));return o(a,b,c)!==o(a,b,d)&&o(c,d,a)!==o(c,d,b)};
const ADJ=[["frontal","motor"],["motor","parietal"],["parietal","occipital"],["frontal","temporal"],["motor","temporal"],["parietal","temporal"],["occipital","temporal"],["temporal","hippocampus"],["occipital","cerebellum"],["cerebellum","stem"]];
function syncNet(){
  const now=performance.now()/1000,want=new Map();
  NEUR.forEach(n=>n.on=false);
  for(let ri=0;ri<8;ri++){const vs=visibleN(ri);vs.forEach(n=>{n.on=true;if(n.born<0)n.born=now});
    const L=levelOf(ri),k=L>=7?3:L>=4?2:1;
    for(const hemi of[0,1,2]){const g=vs.filter(n=>n.hemi===hemi);if(g.length<2)continue;
      // yerel düzleme izdüşüm
      const c=g.reduce((a,n)=>V.add(a,n.p),[0,0,0]).map(v=>v/g.length),cn=V.norm(g.reduce((a,n)=>V.add(a,n.n),[0,0,0])),[e1,e2]=tangentBasis(cn);
      const q=new Map(g.map(n=>[n,[V.dot(V.sub(n.p,c),e1),V.dot(V.sub(n.p,c),e2)]]));
      const cand=[];for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){const d=V.len(V.sub(g[i].p,g[j].p));if(d<(ri===RI.cerebellum?16:26))cand.push([g[i],g[j],d])}
      cand.sort((a,b)=>a[2]-b[2]);const deg=new Map(),ch=[];
      for(const [a,b] of cand){if((deg.get(a)||0)>k||(deg.get(b)||0)>k)continue;if(ch.some(([c2,d2])=>segX2(q.get(a),q.get(b),q.get(c2),q.get(d2))))continue;
        ch.push([a,b]);deg.set(a,(deg.get(a)||0)+1);deg.set(b,(deg.get(b)||0)+1);want.set(key(a,b),[a,b,false])}}}
  ADJ.forEach(([A,B])=>{const ia=RI[A],ib=RI[B],m=Math.min(levelOf(ia),levelOf(ib));if(m<3)return;const cnt=Math.floor((m-1)/2);
    for(const hemi of[0,1]){const ga=visibleN(ia).filter(n=>n.hemi===hemi||n.hemi===2),gb=visibleN(ib).filter(n=>n.hemi===hemi||n.hemi===2);
      const pairs=[];ga.forEach(a=>gb.forEach(b=>pairs.push([a,b,V.len(V.sub(a.p,b.p))])));pairs.sort((p,q)=>p[2]-q[2]);
      const used=new Set();let c=0;for(const [a,b] of pairs){if(c>=cnt)break;if(used.has(a)||used.has(b))continue;used.add(a);used.add(b);want.set(key(a,b),[a,b,true]);c++}}});
  want.forEach(([a,b,x],k)=>{const e=EDGES.get(k);if(e){e.die=0;return}EDGES.set(k,{a,b,x,born:now+(x?.6:0)+Math.random()*.7,die:0,path:arcPath(a,b,x)})});
  EDGES.forEach((e,k)=>{if(!want.has(k)&&!e.die)e.die=now});
}
const key=(a,b)=>{const p=a.ri+":"+a.hemi+":"+a.i,q=b.ri+":"+b.hemi+":"+b.i;return p<q?p+"|"+q:q+"|"+p};
function arcPath(a,b,x){const L=V.len(V.sub(a.p,b.p)),n=V.norm(V.add(a.n,b.n)),pts=[],seg=x?22:14;
  for(let i=0;i<=seg;i++){const t=i/seg,base=V.lerp(a.p,b.p,t),lift=(x?.22:.1)*L*Math.sin(Math.PI*t)+1.2*Math.sin(Math.PI*t);pts.push(V.add(base,V.mul(n,lift)))}return pts}

/* ================= Kamera ve izdüşüm ================= */
function camPos(){const cp=Math.cos(cam.pitch);return[TARGET[0]+cam.dist*cp*Math.cos(cam.yaw),TARGET[1]+cam.dist*Math.sin(cam.pitch),TARGET[2]+cam.dist*cp*Math.sin(cam.yaw)]}
function project(p){const m=VP,x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return[(x/w*.5+.5)*W,(1-(y/w*.5+.5))*H,w]}
let LB=1,OFF=[0,0],QUAL=2,lastCW=0,lastCH=0;
let LAY="ring",FREE={top:0,bottom:0,left:0,right:0};
function layoutMode(){if(W>=1100&&H>=600)return"ring";if(H<=520&&W>H)return"cols";return"rows"}
function fitView(){const visH=Math.min(H,window.innerHeight||H),wide=LAY==="ring";
  let {top,bottom,left,right}=FREE;if(wide){top=0;bottom=visH;left=0;right=W}
  const fh=Math.max(120,bottom-top),fw=Math.max(140,right-left),f=(H/2)/Math.tan(FOV/2),k=wide?.36:.47;
  HOME.dist=Math.max(wide?400:230,90*f/(k*fh),118*f/(k*fw));
  const cy=(top+bottom)/2,cx=(left+right)/2;OFF=[(cx-W/2)/(W/2),-(cy-H/2)/(H/2)];TARGET[1]=2}
function size(){const r=stage.getBoundingClientRect();if(r.width<2||r.height<2)return;const prevHome=HOME.dist;W=r.width;H=r.height;DPR=Math.min(window.devicePixelRatio||1,coarse?2.5:2);if(W*H*DPR*DPR>3.6e6)DPR=Math.sqrt(3.6e6/(W*H));if(QUAL<2)DPR=Math.min(DPR,QUAL===1?1.5:1);LB=Math.min(1.6,Math.max(1,DPR/1.5));
  const cw=Math.round(W*DPR),ch=Math.round(H*DPR);
  // adres çubuğu kaynaklı küçük yükseklik oynamalarında tuvali yeniden kurma
  if(cw!==lastCW||Math.abs(ch-lastCH)>lastCH*.15){cv.width=cw;cv.height=ch;ov.width=cw;ov.height=ch;lastCW=cw;lastCH=ch}
  placeChips();fitView();if(!started||!isFinite(cam.dist)||Math.abs(cam.td-prevHome)<1){cam.td=HOME.dist;if(!started||!isFinite(cam.dist))cam.dist=HOME.dist}
  placeChips()}

/* ================= Çipler ================= */
const chips=LOBES.map((L,i)=>{const d=document.createElement("button");d.type="button";d.className="bchip";d.style.setProperty("--c",L.col);
  d.innerHTML=`<i class="dot"></i><span class="nm">${L.name}</span><span class="sh">${L.sh}</span><b class="lvn">1</b><i class="pt"></i>`;d.setAttribute("aria-label",L.name+" bölgesini seç");
  __on(d,"click",e=>{e.stopPropagation();select(i,true)});stage.appendChild(d);return d});
let ports=[];
function setPk(b,l,r){const R=root.style;R.setProperty("--pk",Math.round(b)+"px");R.setProperty("--pl",Math.round(l)+"px");R.setProperty("--pr",Math.round(r)+"px")}
function placeChips(){LAY=layoutMode();root.classList.toggle("cmp",LAY!=="ring");root.classList.toggle("cols",LAY==="cols");stage.classList.toggle("lay-rows",LAY==="rows");stage.classList.toggle("lay-cols",LAY==="cols");
  const hud=$("hud").getBoundingClientRect(),visH=Math.min(H,window.innerHeight||H);
  chips.forEach(d=>{d.classList.remove("pb","ptp","r");d.style.width="";d.style.transform=""});
  if(LAY==="ring"){LOBES.forEach((L,i)=>{const d=chips[i],[fx,fy]=L.chip;d.style.left=fx*100+"%";d.style.top=fy*100+"%";d.style.transform=`translate(${fx>.5?"0":"-100%"},-50%)`;d.classList.toggle("r",fx>.5)});FREE={top:0,bottom:visH,left:0,right:W}}
  else if(LAY==="rows"){const g=W<400?4:6,pad=W<400?10:(W<700?16:24),cw=(W-pad*2-g*3)/4,ch=30,y0=hud.bottom+10,y1=visH-(W<700?96:92)-ch;
    const TOPR=[0,1,2,3],BOTR=[4,5,6,7];
    const avail=W-pad*2-g*3;stage.classList.remove("tight");
    const row=(ids,y,cls)=>{ids.forEach(ri=>{const d=chips[ri];d.style.width="auto";d.style.left="0px";d.style.top=y+"px";d.classList.add(cls)});
      let nat=ids.map(ri=>chips[ri].offsetWidth);let sum=nat.reduce((a,b)=>a+b,0);
      if(sum>avail&&!stage.classList.contains("tight")){stage.classList.add("tight");nat=ids.map(ri=>chips[ri].offsetWidth);sum=nat.reduce((a,b)=>a+b,0)}
      const extra=Math.max(0,avail-sum)/ids.length;let x=pad;
      ids.forEach((ri,k)=>{const d=chips[ri],wv=sum>avail?nat[k]*avail/sum:nat[k]+extra;d.style.left=x+"px";d.style.width=wv+"px";x+=wv+g})};
    row(TOPR,y0,"pb");row(BOTR,y1,"ptp");if(stage.classList.contains("tight")){row(TOPR,y0,"pb");row(BOTR,y1,"ptp")}
    FREE={top:y0+ch+16,bottom:y1-14,left:0,right:W};setPk(visH-y1+22,12,12)}
  else{const cw=Math.min(150,W*.2),ch=30,y0=hud.bottom+6,y1=visH-10,LEFT=[0,1,4,5],RIGHT=[2,3,6,7],step=(y1-y0-ch)/3;
    LEFT.forEach((ri,k)=>{const d=chips[ri];d.style.left="12px";d.style.top=(y0+k*step)+"px";d.style.width=cw+"px"});
    RIGHT.forEach((ri,k)=>{const d=chips[ri];d.style.left=(W-12-cw)+"px";d.style.top=Math.min(y0+k*step,visH-96-ch)+"px";d.style.width=cw+"px";d.classList.add("r")});
    FREE={top:y0,bottom:y1,left:12+cw+14,right:W-12-cw-14};setPk(10,FREE.left,W-FREE.right+60)}
  try{NORO.relayout()}catch(e){}
  requestAnimationFrame(()=>{if(__disposed)return;const sr=stage.getBoundingClientRect();ports=chips.map(d=>{const p=d.querySelector(".pt").getBoundingClientRect();return[p.left-sr.left+p.width/2,p.top-sr.top+p.height/2]})})}

/* ================= Seçim ve kart ================= */
function select(i,fly){state.sel=i;chips.forEach((c,k)=>c.classList.toggle("sel",k===i));
  NORO.region(i);
  if(fly){const vs=visibleN(i),side=Math.sign(camPos()[0]-TARGET[0])||1;let g=vs.filter(n=>n.hemi===(side>0?0:1)||n.hemi===2);if(!g.length)g=vs;
    if(g.length){const c=g.reduce((a,n)=>V.add(a,n.p),[0,0,0]).map(v=>v/g.length),d=V.norm(V.sub(c,TARGET));
      let yaw=Math.atan2(d[2],d[0]),pitch=Math.max(-.5,Math.min(.75,Math.asin(d[1])*.8));
      if(i===RI.hippocampus){pitch=-.42}
      while(yaw-cam.yaw>Math.PI)yaw-=Math.PI*2;while(cam.yaw-yaw>Math.PI)yaw+=Math.PI*2;
      cam.ty=yaw;cam.tp=pitch;cam.td=HOME.dist*.86}}
  lastInput=performance.now()}

/* ================= Etkileşim ================= */
let started=false,lastInput=performance.now(),drag=null;
function rayAt(mx,my){const B=BASIS,t=Math.tan(FOV/2),a=W/H,x=(mx/W*2-1-OFF[0])*t*a,y=(1-my/H*2-OFF[1])*t;return{o:CAM,d:V.norm([-B.z[0]+B.x[0]*x+B.y[0]*y,-B.z[1]+B.x[1]*x+B.y[1]*y,-B.z[2]+B.x[2]*x+B.y[2]*y])}}
function pick(mx,my){if(!BASIS)return-1;const {o,d}=rayAt(mx,my);let best=1e9,reg=-1;
  for(const m of MESHES){const P=m.P,F=m.F;for(let i=0;i<F.length;i+=3){const a=F[i]*3,b=F[i+1]*3,c=F[i+2]*3;
    const e1x=P[b]-P[a],e1y=P[b+1]-P[a+1],e1z=P[b+2]-P[a+2],e2x=P[c]-P[a],e2y=P[c+1]-P[a+1],e2z=P[c+2]-P[a+2];
    const px=d[1]*e2z-d[2]*e2y,py=d[2]*e2x-d[0]*e2z,pz=d[0]*e2y-d[1]*e2x,det=e1x*px+e1y*py+e1z*pz;if(det<1e-7)continue;
    const tx=o[0]-P[a],ty=o[1]-P[a+1],tz=o[2]-P[a+2],u=(tx*px+ty*py+tz*pz)/det;if(u<0||u>1)continue;
    const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x,v=(d[0]*qx+d[1]*qy+d[2]*qz)/det;if(v<0||u+v>1)continue;
    const t=(e2x*qx+e2y*qy+e2z*qz)/det;if(t>0&&t<best){best=t;reg=m.R[F[i]]}}}
  return reg}
const PTR=new Map();let pinch=null,lastTap=0;
const zoomMax=()=>Math.max(680,HOME.dist*1.35),zoomMin=()=>HOME.dist*.55;
function zoomTalk(dir){if(cam.td<=zoomMin()+12)NORO.cat("zmax",8000);else if(cam.td>=zoomMax()-15)NORO.cat("zmin",8000);else NORO.cat(dir<0?"zin":"zout",9000)}
__on(stage,"pointerdown",e=>{if(__disposed)return;if(e.target.closest(".bchip"))return;PTR.set(e.pointerId,{x:e.clientX,y:e.clientY});try{stage.setPointerCapture(e.pointerId)}catch(_){}lastInput=performance.now();
  if(PTR.size===2){const [p,q]=[...PTR.values()];pinch={d0:Math.max(30,Math.hypot(p.x-q.x,p.y-q.y)),td0:cam.td,said:0};drag=null;return}
  if(PTR.size===1){drag={x:e.clientX,y:e.clientY,t:performance.now(),moved:0,id:e.pointerId};stage.classList.add("drag")}});
__on(stage,"pointermove",e=>{if(__disposed)return;const r=stage.getBoundingClientRect(),pp=PTR.get(e.pointerId);if(pp){pp.x=e.clientX;pp.y=e.clientY}
  if(pinch&&PTR.size>=2){const [p,q]=[...PTR.values()],d=Math.max(30,Math.hypot(p.x-q.x,p.y-q.y));const prev=cam.td;cam.td=Math.max(zoomMin(),Math.min(zoomMax(),pinch.td0*pinch.d0/d));cam.dist+=(cam.td-cam.dist)*.5;lastInput=performance.now();
    if(!pinch.said&&Math.abs(cam.td-pinch.td0)>40){pinch.said=1;zoomTalk(cam.td-pinch.td0)}return}
  if(drag&&e.pointerId===drag.id){const dx=e.clientX-drag.x,dy=e.clientY-drag.y,sen=e.pointerType==="touch"?.0072:.0055;drag.moved+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;
    cam.vy=dx*sen;cam.vp=dy*sen*.82;cam.ty+=cam.vy;cam.tp=Math.max(-.7,Math.min(.95,cam.tp+cam.vp));lastInput=performance.now();
    if(Math.abs(dx)>55)NORO.cat("spin",7000);else if(drag.moved>60&&!drag.said){drag.said=1;NORO.cat("rotate",9000)}return}
  if(e.pointerType==="mouse")hoverAt(e.clientX-r.left,e.clientY-r.top)});
let hovT=0;function hoverAt(x,y){const now=performance.now();if(now-hovT<90)return;hovT=now;const h=pick(x,y);if(h!==state.hov){state.hov=h;stage.classList.toggle("hov",h>=0)}}
function endPtr(e,cancel){const had=PTR.has(e.pointerId);PTR.delete(e.pointerId);if(!had)return;
  if(pinch){if(PTR.size<2){pinch=null;const rest=[...PTR.entries()][0];drag=rest?{x:rest[1].x,y:rest[1].y,t:0,moved:99,id:rest[0]}:null}return}
  if(!drag||drag.id!==e.pointerId)return;stage.classList.remove("drag");
  const r=stage.getBoundingClientRect(),now=performance.now(),quick=now-drag.t<350&&drag.moved<8;
  if(quick&&!cancel){if(e.pointerType!=="mouse"&&now-lastTap<320){lastTap=0;stage.dispatchEvent(new Event("dblclick"))}else{lastTap=now;const h=pick(e.clientX-r.left,e.clientY-r.top);if(h>=0)select(h,true)}}
  drag=null}
__on(stage,"pointerup",e=>endPtr(e,false));
__on(stage,"pointercancel",e=>endPtr(e,true));
__on(stage,"wheel",e=>{e.preventDefault();cam.td=Math.max(zoomMin(),Math.min(zoomMax(),cam.td*(1+e.deltaY*.0011)));lastInput=performance.now();zoomTalk(e.deltaY)},{passive:false});
__on(stage,"dblclick",()=>{cam.ty=HOME.yaw+Math.round((cam.yaw-HOME.yaw)/(Math.PI*2))*Math.PI*2;cam.tp=HOME.pitch;cam.td=HOME.dist;state.sel=-1;chips.forEach(c=>c.classList.remove("sel"));lastInput=performance.now();NORO.cat("reset",3000)});
__on(window,"keydown",e=>{if(e.key==="ArrowLeft"){cam.ty-=.25;lastInput=performance.now()}if(e.key==="ArrowRight"){cam.ty+=.25;lastInput=performance.now()}if(e.key==="ArrowUp"){cam.tp=Math.min(.95,cam.tp+.15)}if(e.key==="ArrowDown"){cam.tp=Math.max(-.7,cam.tp-.15)}if(e.key==="Escape")stage.dispatchEvent(new Event("dblclick"))});
if(coarse){$("legend").style.display="none"}

/* ================= Teller ve darbeler (2B katman) ================= */
let pulses=[];const flash=new Float32Array(8);
function wireTargets(ri){const side=Math.sign(camPos()[0]-TARGET[0])||1,hemi=side>0?0:1,toCam=V.norm(V.sub(CAM,TARGET));
  const vs=visibleN(ri).filter(n=>n.hemi===hemi||n.hemi===2);const L=levelOf(ri),k=LAY==="ring"?2+Math.floor(L*.6):2+Math.floor(L*.35);
  const vis=vs.map(n=>{const vd=V.norm(V.sub(CAM,n.p));return[n,n.xray?.6:V.dot(n.n,vd)]}).sort((a,b)=>b[1]-a[1]);
  return vis.slice(0,k).map(([n,f])=>({n,f}))}
function bez(p,q,sw){const cx=(FREE.left+FREE.right)/2||W/2,cy=(FREE.top+FREE.bottom)/2||H/2,dx=q[0]-p[0],dy=q[1]-p[1];return[p[0],p[1],p[0]+dx*.38+(p[0]<cx?1:-1)*24,p[1]+dy*.12+sw,q[0]-(q[0]-cx)*.18+sw*.6,q[1]-(q[1]-cy)*.18,q[0],q[1]]}
function bpt(b,t){const m=1-t;return[m*m*m*b[0]+3*m*m*t*b[2]+3*m*t*t*b[4]+t*t*t*b[6],m*m*m*b[1]+3*m*m*t*b[3]+3*m*t*t*b[5]+t*t*t*b[7]]}
let WIRES=[];
function drawOverlay(time){octx.setTransform(DPR,0,0,DPR,0,0);octx.clearRect(0,0,W,H);if(!ports.length||!chips[0].offsetParent)return;
  WIRES=[];
  LOBES.forEach((Lb,ri)=>{const port=ports[ri];if(!port)return;const T=wireTargets(ri),L=levelOf(ri),sel=ri===state.sel;
    let away=0;
    T.forEach((t,k)=>{const s=project(t.n.p);const vis=t.f>.12;if(!vis)away++;const sw=reduce?0:Math.sin(time*.35+k*1.7+ri)*3;const b=bez(port,s,sw);WIRES.push({ri,b,n:t.n,vis});
      octx.lineWidth=sel?1:.6;octx.strokeStyle=sel?`rgba(242,194,48,${vis?.55:.18})`:`rgba(235,242,238,${(vis?.1+L*.022:.04)})`;
      if(!vis)octx.setLineDash([2,4]);octx.beginPath();octx.moveTo(b[0],b[1]);octx.bezierCurveTo(b[2],b[3],b[4],b[5],b[6],b[7]);octx.stroke();octx.setLineDash([])});
    chips[ri].classList.toggle("away",T.length>0&&away===T.length)});
  // darbeler
  if(!reduce)LOBES.forEach((_,ri)=>{const L=levelOf(ri);if(Math.random()<.0035*L*L/3){const ws=WIRES.filter(w=>w.ri===ri&&w.vis);if(ws.length){const w=ws[Math.floor(Math.random()*ws.length)];pulses.push({ri,n:w.n,t:0,sp:.007+Math.random()*.006})}}});
  pulses=pulses.filter(p=>p.t<1);
  pulses.forEach(p=>{p.t+=p.sp;const w=WIRES.find(w=>w.ri===p.ri&&w.n===p.n);if(!w)return;const sel=p.ri===state.sel;
    for(let k=0;k<6;k++){const q=bpt(w.b,Math.max(0,p.t-k*.011));octx.fillStyle=sel?`rgba(242,194,48,${.9-k*.15})`:`rgba(225,255,238,${.85-k*.14})`;octx.beginPath();octx.arc(q[0],q[1],1.6-k*.2,0,7);octx.fill()}
    if(p.t>=.98){flash[p.ri]=Math.min(1,flash[p.ri]+.25);p.n.fire=performance.now()/1000}});
}

/* ================= Nöron ve ağ çizimi (3B) ================= */
let ptBuf=new Float32Array(8*4000),lnBuf=new Float32Array(7*60000),xrBuf=new Float32Array(7*4000),xpBuf=new Float32Array(8*400);
function buildDynamic(time){
  const now=performance.now()/1000;let pi=0,li=0,xi=0,xpi=0;
  const P=(arr,p,c,a,z)=>{arr[pi++]=p[0];arr[pi++]=p[1];arr[pi++]=p[2];arr[pi++]=c[0];arr[pi++]=c[1];arr[pi++]=c[2];arr[pi++]=a;arr[pi++]=z};
  const Ln=(p,q,c,a,c2)=>{if(li+14>lnBuf.length)return;const d=c2||c;lnBuf.set([p[0],p[1],p[2],c[0],c[1],c[2],a,q[0],q[1],q[2],d[0],d[1],d[2],a],li);li+=14};
  const X=(p,q,c,a,c2)=>{if(xi+14>xrBuf.length)return;const d=c2||c;xrBuf.set([p[0],p[1],p[2],c[0],c[1],c[2],a,q[0],q[1],q[2],d[0],d[1],d[2],a],xi);xi+=14};
  const lite=(c,k)=>[c[0]+(1-c[0])*k,c[1]+(1-c[1])*k,c[2]+(1-c[2])*k],mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  const GOLD=[.95,.78,.22],WHITE=[.93,.96,.94],MINT=[.62,1,.8];
  // bağlantılar
  EDGES.forEach((e,k)=>{let g=Math.max(0,Math.min(1,(now-e.born)/(reduce?.01:1.1)));if(g<=0)return;let fa=1;if(e.die){fa=1-(now-e.die)/.7;if(fa<=0){EDGES.delete(k);return}}
    const sel=e.a.ri===state.sel||e.b.ri===state.sel,la=Math.max(levelOf(e.a.ri),levelOf(e.b.ri));
    const ca=lite(LOBES[e.a.ri].rgb,.18),cb=lite(LOBES[e.b.ri].rgb,.18),al=Math.min(1,(e.x?.6:.36+la*.035)*fa*(sel?1.3:1)*Math.min(DIM[e.a.ri],DIM[e.b.ri])*LB);
    const pts=e.path,last=Math.floor(g*(pts.length-1)),n1=pts.length-1;const xr=e.a.xray||e.b.xray;
    for(let i=1;i<=last;i++){const c1=sel?GOLD:mixc(ca,cb,(i-1)/n1),c2=sel?GOLD:mixc(ca,cb,i/n1);(xr?X:Ln)(pts[i-1],pts[i],c1,al,c2)}
    if(g<1){const p=pts[last];growHeads.push(p)}
    else if(!reduce&&!e.die){if(!e.sig&&Math.random()<(e.x?.012:.004)*(1+la*.25))e.sig={t:0,dir:Math.random()<.5,sp:.012+Math.random()*.01};
      if(e.sig){e.sig.t+=e.sig.sp;const tt=e.sig.dir?e.sig.t:1-e.sig.t,idx=Math.min(pts.length-1,Math.max(0,tt*(pts.length-1))),i0=Math.floor(idx),f=idx-i0,p=V.lerp(pts[i0],pts[Math.min(pts.length-1,i0+1)],f);
        sigs.push([p,sel?GOLD:lite(mixc(ca,cb,tt),.55),xr]);if(e.sig.t>=1){(e.sig.dir?e.b:e.a).fire=now;e.sig=null}}}});
  // nöronlar: gövde + dendrit dalları
  NEUR.forEach(n=>{if(!n.on||n.born<0)return;const g=Math.min(1,(now-n.born)/(reduce?.01:.7)),sel=n.ri===state.sel,fl=flash[n.ri];
    const fire=n.fire?Math.max(0,1-(now-n.fire)/.6):0,pul=reduce?.5:.5+.5*Math.sin(time*1.3+n.ph);
    const rc=LOBES[n.ri].rgb,col=sel?GOLD:lite(rc,.35);
    const dcol=sel?GOLD:lite(rc,.12),da=Math.min(1,(.55+fl*.25)*g*(sel?1.25:1)*DIM[n.ri]*LB);
    n.den.forEach(([a,l,tw])=>{const dir=V.add(V.mul(n.t1,Math.cos(a)),V.mul(n.t2,Math.sin(a))),L1=l*g,end=V.add(n.p,V.mul(dir,L1)),mid=V.add(n.p,V.mul(dir,L1*.55));
      const f1=V.add(V.mul(n.t1,Math.cos(a+.55+tw*.3)),V.mul(n.t2,Math.sin(a+.55+tw*.3))),f2=V.add(V.mul(n.t1,Math.cos(a-.5)),V.mul(n.t2,Math.sin(a-.5)));
      const seg=n.xray?X:Ln;seg(n.p,end,dcol,da);if(QUAL===2){seg(mid,V.add(mid,V.mul(f1,L1*.42)),dcol,da*.8);seg(end,V.add(end,V.mul(f2,L1*.3)),dcol,da*.65)}});
    if(!n.xray){const ap=V.add(n.p,V.mul(n.n,2.4*g));Ln(n.p,ap,dcol,da*.8)}
    const z=(3.1+pul*.45+fire*2+fl*1)*g*(sel?1.2:1),a=Math.min(1,.78+fire*.3);
    if(n.xray){if(xpi+8<=xpBuf.length){xpBuf.set([n.p[0],n.p[1],n.p[2],col[0],col[1],col[2],a*.8,z],xpi);xpi+=8}}else{const s=pi;pi=s;P(ptBuf,n.p,fire>.05?lite(rc,.7):col,a*(.35+.65*DIM[n.ri]),z)}});
  sigs.forEach(([p,c,xr])=>{if(xr){if(xpi+8<=xpBuf.length){xpBuf.set([p[0],p[1],p[2],c[0],c[1],c[2],.95,1.7],xpi);xpi+=8}}else P(ptBuf,p,c,.95,1.7)});
  growHeads.forEach(p=>P(ptBuf,p,WHITE,.95,1.9));
  sigs.length=0;growHeads.length=0;
  // hipokampus kıvrımı (iç yapı)
  const hs=state.sel===RI.hippocampus,hl=levelOf(RI.hippocampus);
  for(const side of[1,-1]){const c=hippoCurve(side);for(const off of[-1.6,0,1.6])for(let i=1;i<c.length;i++){if(i%3===0&&off!==0)continue;const p=V.add(c[i-1],[0,off,0]),q=V.add(c[i],[0,off,0]);X(p,q,hs?GOLD:[.88,.38,.6],(hs?.55:.16+hl*.02)*(off?0.6:1))}}
  upload(PTS,ptBuf.subarray(0,pi));PTS.n=pi/8;upload(LNS,lnBuf.subarray(0,li));LNS.n=li/7;upload(XR,xrBuf.subarray(0,xi));XR.n=xi/7;upload(XRP,xpBuf.subarray(0,xpi));XRP.n=xpi/8;
}
const sigs=[],growHeads=[];

/* ================= Çizim döngüsü ================= */
let vis=true;{const __io=new IntersectionObserver(e=>{vis=e[0].isIntersecting});__io.observe(stage);__disposers.push(()=>__io.disconnect());}
let lastFrame=0;
let emaDt=16,fcount=0,lastMs=0,wasIdle=false,oscBase=0,oscP=0,oscT0=0;
function frame(ms){if(__disposed){__raf=0;return}__raf=requestAnimationFrame(frame);if(!vis||document.hidden){lastMs=0;return}
  const busyNow=performance.now()-lastInput<2500||PTR.size>0;const cap=QUAL===0?100:(coarse&&!busyNow?32:0);if(cap&&ms-lastFrame<cap)return;lastFrame=ms;
  if(lastMs){const dt=Math.min(250,ms-lastMs);emaDt=emaDt*.94+dt*.06;fcount++;
    if(fcount>90&&QUAL>0&&!TOUR.busy()){const lim=QUAL===2?(coarse?55:42):75;if(emaDt>lim){QUAL--;fcount=0;emaDt=QUAL===0?100:30;size()}}}
  lastMs=ms;
  const time=reduce?0:ms/1000,now=performance.now();
  // kamera: boşta kendiliğinden hareket
  const idle=now-lastInput>3500&&!drag;
  if(idle&&!wasIdle){oscBase=cam.ty;oscP=cam.tp;oscT0=time}wasIdle=idle;
  if(!reduce&&idle){if(coarse){const tt=time-oscT0,ramp=Math.min(1,tt/4);cam.ty=oscBase+.5*ramp*Math.sin(tt*2*Math.PI/56);cam.tp=oscP+.07*ramp*Math.sin(tt*2*Math.PI/23)}else cam.ty+=.0016}
  if(!drag){cam.vy*=.92;cam.vp*=.92;if(Math.abs(cam.vy)>1e-4&&!idle){cam.ty+=cam.vy;cam.tp=Math.max(-.7,Math.min(.95,cam.tp+cam.vp))}}
  if(!W||!H){size();if(!W||!H)return}
  if(![cam.yaw,cam.pitch,cam.dist,cam.ty,cam.tp,cam.td].every(isFinite)){cam.yaw=cam.ty=HOME.yaw;cam.pitch=cam.tp=HOME.pitch;cam.dist=cam.td=HOME.dist}
  const k=drag?.35:.075;cam.yaw+=(cam.ty-cam.yaw)*k;cam.pitch+=(cam.tp-cam.pitch)*k;cam.dist+=(cam.td-cam.dist)*.07;
  CAM=camPos();const la=lookAt(CAM,TARGET,[0,1,0]);BASIS=la;const PM=persp(FOV,W/H,40,1400);PM[8]-=OFF[0];PM[9]-=OFF[1];VP=mul(PM,la.m);
  for(let i=0;i<8;i++)flash[i]*=.95;
  gl.viewport(0,0,cv.width,cv.height);if(Math.abs(ov.width-cv.width)>0)ov.width=cv.width;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);
  gl.useProgram(SP.p);const u=SP.u;gl.uniformMatrix4fv(u.uVP,false,VP);gl.uniform3fv(u.uCam,CAM);gl.uniform1f(u.uTime,time);
  gl.uniform3fv(u.uCol,new Float32Array(LOBES.flatMap(L=>L.rgb)));gl.uniform1fv(u.uLv,new Float32Array(LOBES.map((_,i)=>levelOf(i))));gl.uniform1fv(u.uFl,flash);gl.uniform1fv(u.uDim,DIM);gl.uniform1f(u.uLW,LB);
  gl.uniform1i(u.uSel,state.sel);gl.uniform1i(u.uHov,state.hov);
  // 1) dış hat (ters gövde)
  // 1) dış hat: pürüzsüz kabuğun ters gövdesi
  gl.cullFace(gl.FRONT);gl.uniform1i(u.uMode,1);gl.uniform1f(u.uPush,.55*(cam.dist/400));MESHES.forEach(m=>{gl.bindVertexArray(m.hvao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0)});
  // 2) yüzey
  gl.disable(gl.CULL_FACE);gl.uniform1i(u.uMode,0);gl.uniform1f(u.uPush,0);MESHES.forEach(m=>{gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0)});
  // 3) ağ ve nöronlar
  buildDynamic(time);
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(LP.p);gl.uniformMatrix4fv(LP.u.uVP,false,VP);gl.bindVertexArray(LNS.vao);gl.drawArrays(gl.LINES,0,LNS.n);
  gl.useProgram(PP.p);gl.uniformMatrix4fv(PP.u.uVP,false,VP);gl.uniform1f(PP.u.uK,DPR*H*.95);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindVertexArray(PTS.vao);gl.drawArrays(gl.POINTS,0,PTS.n);
  // 4) iç yapı (röntgen): derinlik testi olmadan, soluk
  gl.disable(gl.DEPTH_TEST);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  gl.useProgram(LP.p);gl.bindVertexArray(XR.vao);gl.drawArrays(gl.LINES,0,XR.n);
  gl.useProgram(PP.p);gl.bindVertexArray(XRP.vao);gl.drawArrays(gl.POINTS,0,XRP.n);
  gl.bindVertexArray(null);
  drawOverlay(time);
}

/* ================= Durum ve simülasyon ================= */
function refresh(){syncNet();let tot=0;LOBES.forEach((L,i)=>{const l=levelOf(i);tot+=l;chips[i].querySelector(".lvn").textContent=l;chips[i].classList.toggle("decay",DIM[i]<.8)});$("tl").textContent=tot;
}
const EV=[["motor","Atış kaydı",46],["cerebellum","Kuru tetik seansı",40],["frontal","FOF tatbikatı",38],["parietal","Balistik hesap",34],["stem","TCCC tatbikatı",40],["motor","CQB tatbikatı",42],["occipital","Video analizi",30],["temporal","Doktrin okuma",34],["hippocampus","Seri bonusu",28],["frontal","AAR",24]];
const SIDE={motor:{cerebellum:.25,occipital:.2,frontal:.15},cerebellum:{motor:.35},frontal:{motor:.25,occipital:.15},parietal:{frontal:.25,temporal:.15},stem:{frontal:.15},occipital:{temporal:.35},temporal:{hippocampus:.3},hippocampus:{temporal:.3}};
let ei=0;const toast=$("toast");
function demo(){
  const tot=LOBES.reduce((a,_,i)=>a+levelOf(i),0);
  if(tot>=64){state.xp={...START};refresh();NORO.cat("restart",0);toast.innerHTML='Yeni operatör · <i>simülasyon yeniden başladı</i>';toast.classList.add("on");setTimeout(()=>toast.classList.remove("on"),2200);return}
  const [id,label,g]=EV[ei++%EV.length],ri=RI[id],before=levelOf(ri);
  state.xp[id]=Math.min(1000,state.xp[id]+g);Object.entries(SIDE[id]||{}).forEach(([r,w])=>state.xp[r]=Math.min(1000,state.xp[r]+g*w));
  flash[ri]=1;WIRES.filter(w=>w.ri===ri&&w.vis).slice(0,4).forEach((w,k)=>pulses.push({ri,n:w.n,t:-k*.05,sp:.013+Math.random()*.008}));
  refresh();const l=levelOf(ri);if(l>before)NORO.levelUp(ri,l);
  toast.innerHTML=`${label} · ${LOBES[ri].name} <i>+${g}</i>${l>before?` · <b>seviye ${l}</b>`:""}`;toast.classList.add("on");setTimeout(()=>toast.classList.remove("on"),2000)}

/* ================= NÖRO ================= */
const NORO=(()=>{
  const box=$("asst"),btn=$("abtn"),panel=$("apanel"),list=$("alist"),peek=$("apeek");
  const LINES={
    intro:["Selam, ben NÖRO. Burası henüz şantiye ama beyin çalışıyor; ben de, çoğunlukla.","Hoş geldin. Sürükle, çevir, tıkla. Bir şey kırılırsa ben buradaydım ama görmedim."],
    rotate:["Yavaş çevir, başım dönüyor. Benim de bir beynim var sonuçta.","Bu açıdan da yakışıklı, değil mi? Ben öyle düşünüyorum.","Arka tarafı merak ediyorsan: evet, orada da çalışıyoruz.","Beyni çevirmek kolay; asıl marifet onu kullanmak.","Kaç tur döndürürsen döndür, kıvrımlar yerinde. Söz.","Bu tarafı hiç görmemiştin, değil mi? Ben de yeni gördüm."],
    spin:["Yavaş! Burası beyin, rulet çarkı değil.","Santrifüj testine daha girmedik. Beyincik şikâyet ediyor.","Bu hızla döndürürsen nöronlar emniyet kemeri isteyecek.","Tamam, hızlı olduğunu anladık. Şimdi bir de nazik ol."],
    zin:["Yaklaş bakalım. Sinapsları görüyor musun? Sana el sallıyorlar.","Bu kadar yakından bakınca biraz utanıyorum.","Mercek modu açık. Kıvrımlar sırlarını vermeye hazır."],
    zout:["Uzaktan bakınca her beyin dâhi görünür.","Biraz geri çekil, resmin bütününü gör. Kuş bakışı.","Uydu görünümü. Buradan bütün bölgeler tek ekip."],
    zmax:["Daha fazla yaklaşamazsın; burası özel alan.","Sınırdasın. Bir adım daha atarsan içeride kaybolursun."],
    zmin:["Daha fazla uzaklaşırsan beni de göremezsin, haberin olsun.","Bu mesafeden beyin değil, bulut gibi görünüyor."],
    reset:["Başa döndük. Fabrika ayarları, tertemiz sayfa.","Sıfırladım. Keşke hayatta da çift tıklama olsaydı."],
    idle:["3B beyin yakında açılıyor. Şu an gizli test sürüşündesin; kimseye söyleme.","Mühendislere ne zaman biteceğini sordum. Yüzde 99'da üç hafta kaldı dediler.","Telefonda beyin kendi kendine süzülecek. Parmakla çevirmek yok; beyin hassas.","Bir bölgeye tıkla; onu nasıl büyüteceğini anlatayım.","Sönmeye başlayan bölgeleri sana ben haber vereceğim. Dedikodu değil, analiz.","Beni sürükleyip istediğin yere koyabilirsin. Kira istemiyorum.","Çizgiler parladıkça o bölge gelişiyor demek. Sönükse… sen bilirsin.","Burada her kayıt bir nöron doğurur. Doğum odası gibi, ama daha sessiz."],
    drag:["Taşınma işlemi tamam. Manzara fena değil.","Buraya park ettim. Çekici çağırmana gerek yok.","Asistan taşımacılığı, ücretsiz ve sigortasız.","Yeni yerim burası. Perdeleri asmaya başlıyorum."],
    busy:["Konuşurken beni taşıyorsun; nezaket nerede?","Cümlemi yarıda bıraktırdın ama yer güzel, affettim.","Lafımı unuttum. Hipokampus'a sorayım, o hatırlar."],
    restart:["Yeni operatör geldi, simülasyon baştan başladı. Ben hiç yorulmam, merak etme."],
    notify:["Not aldım. Açıldığı gün ilk sana söyleyeceğim. Unutursam Hipokampus'a şikâyet et.","Listeye yazdım. Sıra numaran: 1. Tamam, belki 2. Yine de iyi."],
    cal99:["Yüzde 99. Klasik. Son yüzde bir, ilk doksan dokuz kadar sürer.","Kalibrasyon geri mi gitti? Hayır, ince ayar yapıyoruz. Öyle diyelim.","Çubuk yine geri kaydı. Mühendisler \"emin olmak için\" dedi; ben inanmak istiyorum.","%99'dan geri dönmek bizde gelenek. Buna mükemmeliyetçilik diyelim, inatçılık değil.","Bu çubuk bana antrenmanı hatırlatıyor: tam bitti derken bir set daha.","Bir nöron fazla parladı, kalibrasyonu baştan aldık. Detaycıyız.","Yükleme çubukları yalan söylemez; sadece biraz abartır.","\"Neredeyse bitti\" cümlesini ben de sık duyuyorum. Merak etme, gerçekten neredeyse.","Çubuğa bakma, tencereye bakar gibi olur; bakınca kaynamaz.","Kalibrasyon bir adım geri, iki adım ileri. Taktik geri çekilme diyoruz buna."],
  };
  const REG=[
    l=>`Karar ve plan merkezi. Görev tamamladıkça burası netleşir. Şu an <b>seviye ${l}</b>; "bir dakika, önce düşüneyim" dediğin yer burası.`,
    l=>`Tetik parmağının patronu. Atış kaydı girdikçe çizgiler parlar. <b>Seviye ${l}</b>; elin titriyorsa burayı çalıştır.`,
    l=>`Rüzgâr, mesafe, açı. Balistik hesap yaptıkça burası hesap makinesine döner. <b>Seviye ${l}</b>.`,
    l=>`Görüş merkezi. Haber okudukça ve video izledikçe keskinleşir. <b>Seviye ${l}</b>; gözün açık olsun.`,
    l=>`Doktrin ve dil. Okudukça burası kütüphaneye dönüşür. <b>Seviye ${l}</b>; sayfaları çevirmeye devam.`,
    l=>`Düzenin hafızası. Seriyi bozmazsan burası seni unutmaz. <b>Seviye ${l}</b>. İçeride, röntgende görüyorsun.`,
    l=>`Refleks ve koordinasyon. Timer seansları burayı uçurur. <b>Seviye ${l}</b>; çekirdek kadrodan.`,
    l=>`Hayati fonksiyonlar. TCCC çalıştıkça burası sağlamlaşır. <b>Seviye ${l}</b>. Burası iyiyse herkes iyi.`];
  const UP=[(n,l)=>`${n} <b>seviye ${l}</b> oldu. Alkış bekliyorum… tamam, ben alkışlarım.`,(n,l)=>`${n} büyüdü, <b>seviye ${l}</b>. Yeni nöronlar doğdu; isimlerini sen koy.`,(n,l)=>`Bak, ${n} parladı: <b>seviye ${l}</b>. Bunu ben söylemedim, çizgiler söyledi.`];
  const AS={open:false,unread:0,t:0};const idx={},cool={};let lastSay=0,talking=false;
  const stamp=()=>new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
  const prune=()=>{while(list.children.length>80)list.firstChild.remove()};
  function bubble(html,me){prune();const m=document.createElement("div");m.className="msg"+(me?" me":"");m.innerHTML=`<div class="bub">${html}</div><time>${me?"sen":"NÖRO"} · ${stamp()}</time>`;list.appendChild(m);list.scrollTop=1e9;return m}
  function peekSay(h,{hold=8000,delay=420}={}){if(AS.open||__disposed)return;lastSay=performance.now();talking=true;btn.classList.add("talk");
    peek.hidden=false;peek.innerHTML='<span class="who">NÖRO</span><span class="typing"><span></span><span></span><span></span></span>';place();clearTimeout(AS.t);
    __later(()=>{if(__disposed)return;btn.classList.remove("talk");talking=false;peek.innerHTML=`<span class="who">NÖRO</span>${h}`;place();clearTimeout(AS.t);AS.t=__later(()=>{peek.hidden=true},hold)},reduce?0:delay)}
  function chatSay(h,{delay=650}={}){if(__disposed)return;prune();lastSay=performance.now();talking=true;btn.classList.add("talk");
    const m=document.createElement("div");m.className="msg";m.innerHTML='<div class="bub"><span class="typing"><span></span><span></span><span></span></span></div><time>NÖRO · '+stamp()+'</time>';list.appendChild(m);list.scrollTop=1e9;
    __later(()=>{if(__disposed)return;m.innerHTML=`<div class="bub">${h}</div><time>NÖRO · ${stamp()}</time>`;list.scrollTop=1e9;btn.classList.remove("talk");talking=false},reduce?0:delay)}
  const say=chatSay;let chatNext=false;
  function cat(c,cd=2000){const now=performance.now();if(cool[c]&&now-cool[c]<cd)return;cool[c]=now;const a=LINES[c];idx[c]=((idx[c]??-1)+1)%a.length;peekSay(a[idx[c]])}
  function rcard(i){const L=LOBES[i],l=levelOf(i);return`<div class="rcard" style="--c:${L.col}"><div class="rh"><i></i>${L.name}<em>${l} / 10</em></div><div class="rb"><i style="width:${l*10}%"></i></div><div class="rs">${L.func.toUpperCase()} · Kaynak: <b>${L.src}</b> · Öneri: <b>${L.act}</b></div></div>`}
  function region(i){const extra=DIM[i]<.8?' <br><span style="color:#e9b35a">Bu bölge bir süredir kayıtsız, ışığı azalıyor. Tek bir kayıt yeter, hızla toparlanır.</span>':'';const h=rcard(i)+REG[i](levelOf(i))+extra;if(chatNext){chatNext=false;chatSay(h,{delay:500})}else peekSay(h,{hold:11000})}
  function levelUp(){}
  function setOpen(o){AS.open=o;panel.hidden=!o;if(o){peek.hidden=true;list.scrollTop=1e9;__later(()=>$("aText")?.focus(),60)}place()}
  __on($("aClose"),"click",()=>setOpen(false));__on(peek,"click",()=>setOpen(true));
  // serbest yazı: demo içi yerel cevaplar
  // ======== NÖRO bilgi bankası: hazırlık safhası ========
  const fold=t=>t.toLocaleLowerCase("tr-TR").replace(/[çğıöşüâîû]/g,c=>({"ç":"c","ğ":"g","ı":"i","ö":"o","ş":"s","ü":"u","â":"a","î":"i","û":"u"})[c]).replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
  const GRACE=[21,30,30,14,30,7,45,30];
  const REGKEY=[["frontal","alin lobu","alin lob","on beyin"],["motor korteks","motor"],["parietal","yan lob"],["oksipital","arka lob","gorme merkez"],["temporal","sakak"],["hipokampus","hippokampus"],["beyincik","beyincig","serebellum"],["beyin sapi","beyinsapi","sap"]];
  const findRegion=q=>{for(let i=0;i<REGKEY.length;i++)if(REGKEY[i].some(k=>new RegExp("(^| )"+k+(k.length>=5?"( |$|[a-z])":"( |$|i |i$)")).test(q)))return i;return-1};
  // her niyet: k = anahtarlar (katlanmış), a = cevap varyantları, m = "peki/neden" gelirse ek açıklama
  const KB=[
   {id:"opsec",k:["koordinat","konumum","konum","birlik","birligim","tabur","bolugum","bolük","gorev yeri","sifrem su","sifre su","sifremi yaziyorum","tc kimlik","kimlik no","seri no","seri numara","telefon numaram","adresim"],w:3,
    a:["Dur. Konum, birlik, şifre, seri numarası gibi bilgileri bana yazma. Burada bunlara ihtiyacım yok; kayıtların yeter.","Bunu yazma lütfen. Operasyonel bilgi, kişi adı ve kimlik bilgileri burada yer almaz. Ben sadece eğitim kayıtlarınla ilgilenirim."]},
   {id:"when",k:["ne zaman","zaman acil","acilacak","acilis","acilir","ne vakit","tarih","kac gun","kac hafta","yakinda","hazir olacak","bitecek","bitiyor","cikacak","cikis","lansman","ne zman","ne zmn","aciliyo","acilacak mi","acilcak","acilir mi","acik mi","ne zaman acik"],
    a:["Resmî cevap: yakında. Gayriresmî cevap: kalibrasyon %99'a gelince. Sonra %97'ye düşecek; bu da resmî değil. Kesin tarih vermiyoruz çünkü önce her ekranın, özellikle telefonun, kusursuz çalışmasını istiyoruz.","Kesin bir tarih yok; hazır olduğu gün açılacak, bir gün önce değil. Sağ üstteki \"Açılınca bana haber ver\" düğmesine basarsan haberin olur."],
    m:"Neden tarih yok? Çünkü yarım bir beyin açmaktansa biraz geç ama tam açmayı tercih ediyoruz. Telefon ve tablet ekranlarındaki düzeltmeler bitince kapılar açılacak."},
   {id:"whatsgoingon",k:["ne oluyor","neler oluyor","ne yapiyorsunuz","neden kapali","niye kapali","site kapali","bakim","bakimda","guncelleme","guncelliyor","calisma var","neden acilmiyor","site calismiyor","calismiyor","neden yok","sorun mu var","ne durumda","durum ne","son durum"],
    a:["Şu an siteyi baştan aşağı elden geçiriyoruz: Operatör Beyni 3B'ye geçiyor, telefon ve tablet ekranları elden geçiyor, ben de yeni repliklerle donatılıyorum. Verilerin yerinde; içeride sadece biz terliyoruz.","Kısaca: hazırlık safhasındayız. Beyin üçüncü boyuta geçiyor, mobil görünüm düzeltiliyor, birkaç ekran yeniden tasarlanıyor. Bitince tek seferde, tertemiz açılacak."],
    m:"Detay istersen: 3B beyin, mobil ve tablet uyumu, yeni açılış sayfası ve benim (NÖRO) site rehberliğim. Hepsi aynı anda hazır olsun diye bekliyoruz."},
   {id:"whatsnew",k:["yenilik","yeni ne","neler yeni","ne degisti","ne degisecek","yeni ozellik","ozellikler neler","neler gelecek","neler var","ne gelecek","degisiklik"],
    a:["Gelenler: 3B Operatör Beyni (çevir, yakınlaş, bölge seç), yenilenen açılış sayfası, her sayfada yanında duran ben, telefonda daha akıcı ekranlar. Sırada modern bir AAR sayfası ve güncel fiyat sayfası var.","Kısa liste: 3B beyin, sekiz bölgeli gelişim takibi, seviye düştükçe sönen beceriler, her sayfada rehber NÖRO, mobil düzeltmeler. Hepsi tek pakette geliyor."]},
   {id:"data",k:["verilerim","verim","kayitlarim","kayitlarim silinecek","silinir mi","kaybolur","gider mi","kaybolacak mi","yedek","verilerim guvende","guvende mi","guvenli mi","bilgilerim"],
    m:"Neden emin olabilirsin? Çünkü hazırlık sadece görünümü ve beynin çizimini değiştiriyor; kayıtların ayrı ve korunan bir yerde duruyor. Beyin onları sadece okuyor, değiştirmiyor.",
    a:["Verilerin güvende ve yerinde. Hazırlık sırasında hiçbir kaydın silinmiyor; beyin de zaten senin mevcut kayıtlarından besleniyor. Kapılar açıldığında kaldığın yerden devam edersin.","Hiçbir şey kaybolmuyor. Kayıtların yedekli duruyor; yeni beyin onları okuyup bölgelerini oradan büyütüyor."]},
   {id:"privacy",w:2,k:["gorebilir","gorur mu","goruyor mu","gorebiliyor","erisebilir","ulasabilir","kim gorebilir","kimler gorur","egitmen gorur","egitmenim gorur","komutan gorur","komutanim gorur","baskasi gorur","baskalari gorur","gizlilik","paylasilir mi","paylasiyor musunuz","satiyor musunuz","kvkk","kisisel veri","izliyor musun"],
    a:["Beynin sadece sana ait. Eğitmenler senin beyin verini, benimle yaptığın sohbetleri ve AAR notlarını göremez. Beyin de yalnızca senin kendi kayıtlarından beslenir; grup ve eğitmen verileri işin içine girmez.","Kısa ve net: beynini, AAR notlarını ve benimle konuşmalarını eğitmenin ya da başka biri göremez. Verilerin satılmaz, paylaşılmaz."],
    m:"Ben de her şeyi görmüyorum: kimlik, sağlık, konum, seri numarası ve mesaj içerikleri bana kapalı. Sadece eğitim kayıtlarına bakarım; o da beyni büyütmek için."},
   {id:"login",k:["giris yapamiyorum","giremiyorum","giris yap","giris","oturum","hesabima","hesabim","sifremi unuttum","sifre unuttum","sifre sifirla","kayit ol","kayit olamiyorum","uye ol","uyelik","hesap ac","hesap olustur","e posta dogrulama","dogrulama maili","mail gelmedi","eposta gelmedi"],
    m:"Hâlâ giremiyorsan: e-posta adresini doğru yazdığından emin ol, şifre sıfırlamayı dene, olmazsa sitedeki iletişim kanalından yaz. Hesabın kilitli değil, sadece biraz inatçı.",
    a:["Hesabınla ilgili her şey ana sitede: giriş, kayıt ve \"Şifremi unuttum\" açılış sayfasındaki pencerede. Doğrulama e-postası gelmediyse spam klasörüne bak; orada saklanmayı seviyor.","Giriş ve kayıt açılış sayfasındaki pencereden yapılıyor. Şifreni unuttuysan aynı yerde \"Şifremi unuttum\" var. Doğrulama e-postası bazen spam klasörüne düşüyor, bir göz at."]},
   {id:"price",k:["ucret","ucretli","ucretsiz","bedava","para","fiyat","fiyatlandirma","abonelik","premium","odeme","kac para","kac tl","pahali","paket"],
    m:"Neden henüz net değil? Çünkü önce neyin gerçekten işe yaradığını görmek istiyoruz. Erken erişimde olanlar unutulmayacak; bunu hipokampusa yazdım.",
    a:["Erken erişim ücretsiz. Fiyat sayfası yenileniyor; netleşince açıkça yazacağız, sürpriz fatura yok.","Şu an erken erişimdesin ve bu ücretsiz. Fiyatlandırma henüz kesinleşmedi; değişiklik olursa önceden duyururuz."]},
   {id:"mobile",k:["telefon","mobil","android","iphone","ios","uygulama","app","tablet","ipad","indir","play store","app store","telefondan"],
    a:["Site telefondan ve tabletten tarayıcıyla çalışıyor; şu an tam da o ekranları elden geçiriyoruz. Telefonda beyin kendi kendine ağır ağır süzülecek, dokunduğun bölgenin kartı açılacak.","Telefon ve tablet tarafı bu hazırlığın ana işlerinden biri. Tarayıcıdan girersin; beyin telefonda sürüklenmez, sinematik bir hareketle süzülür."],
    m:"Telefonda sürükleme yok çünkü sayfa kaydırmasıyla çakışıyor ve pil yiyor. Onun yerine yavaş bir salınım ve dokununca açılan bölge kartı var."},
   {id:"brain",k:["beyin nedir","operator beyni","beyin ne","beyin nasil","nasil buyur","nasil gelisir","nasil calisir","seviye nasil","seviye atla","puan","xp","bolgeler ne","sekiz bolge","8 bolge","bolgeler","nasil artar","nasil yukselir"],
    a:["Operatör Beyni senin eğitim kayıtlarının haritası. Her kayıt ilgili bölgeye puan yazar: atış motor kortekse, timer seansı beyinciğe, balistik hesap parietal loba, TCCC beyin sapına… Puan biriktikçe bölge seviye atlar, yeni nöronlar doğar, bağlantılar kurulur.","Kısaca: kayıt gir, beyin büyüsün. Sekiz bölge var, her biri farklı bir beceriyi temsil ediyor. Bir kayıt birden fazla bölgeyi besleyebilir; mesela atış kaydı biraz da beyinciğe yarar."],
    m:"Günlük bir üst sınır var; aynı gün yüzlerce kayıt girip beyni şişiremezsin. Düzenli çalışma, tek seferlik maratondan daha çok işe yarar. Bir bölgeye tıklarsan onu nasıl büyüteceğini anlatırım."},
   {id:"decay",k:["soner","sonuyor","sonmus","sonuk","neden sondu","soluk","azaliyor","dusuyor","dustu","kayboluyor","unutuyor","korozyon","paslan","eriyor"],
    a:["Gerçek beceriler gibi: kullanmadığın bölge zamanla söner. Ama hemen değil; her bölgenin bir tolerans süresi var, sonra yavaşça düşer. Ve asla sıfırlanmaz, zirvenin %40'ının altına inmez. Geri dönünce de toparlanma bonusu alırsın."],
    m:"Tolerans süreleri bölgeye göre değişiyor: hipokampus 1 hafta, oksipital 2 hafta, frontal 3 hafta, motor, parietal, temporal ve beyin sapı yaklaşık 1 ay, beyincik 6 hafta. Kas hafızası en dayanıklısı."},
   {id:"3d",k:["3b","3 boyut","uc boyut","3d","cevir","dondur","dondurme","surukle","yakinlas","zoom","nasil kullanilir","nasil kullanirim","kontroller","tikla"],
    a:["Bilgisayarda: sürükleyerek çevir, tekerlekle yakınlaş, bir bölgeye tıkla, çift tıkla başa dön. Ok tuşları da çalışır. Telefonda beyin kendi süzülür; dokunduğun bölgeyi anlatırım.","Sürükle: döndür. Tekerlek: yakınlaş. Tıkla: bölge seç. Çift tık: fabrika ayarları. Beni de sürükleyebilirsin; kira istemem."]},
   {id:"noro",k:["sen kimsin","kimsin","adin ne","noro kim","noro ne","noro nedir","ne yaparsin","ne ise yararsin","neler yapabilirsin","gorevin ne","asistan"],
    a:["Ben NÖRO, kişisel asistanın. Beynini izlerim: neyin büyüdüğünü, neyin tozlandığını söylerim, sitede kaybolursan yol gösteririm. Laf sokarım ama kibarca.","NÖRO. Beyninin muhasebecisi, sitenin rehberi, arada bir de stand-up komedyeni. Kayıt girersin, ben yorumlarım."],
    m:"Şu an hazırlık modundayım, o yüzden cevaplarım biraz kısıtlı. Açılışla birlikte her sayfada yanında olacağım ve takıldığın yerde yardım edeceğim."},
   {id:"ai",k:["yapay zeka","yapay zeka misin","robot musun","insan misin","gercek misin","bot musun","chatgpt","gpt","claude","bilinc"],
    a:["Bir yapay zekâ asistanıyım, insan değilim. Şu an hazırlık modundayım; bu sayfada sana hazır bilgiyle cevap veriyorum. Hata yapabilirim; yaparsam kibarca düzelt.","İnsan değilim, yapay zekâ asistanıyım. Kahve içmiyorum ama mühendislerinkini sayıyorum."]},
   {id:"modules",k:["moduller","neler var sitede","sitede ne var","ozellikleri","atis","cqb","vbss","tccc","balistik","cephanelik","timer","akademi","forum","brifing","haber","istihbarat","muhabere","mesaj","basarilar","kilavuz","aar"],
    a:["Sitede neler var: atış, CQB ve VBSS antrenmanları, TCCC paketi, balistik terminal, cephanelik, taktik timer, küresel haber ağı, brifing odası (forum), taktik muhabere, başarılar ve kullanım kılavuzu. Akademi yakında. AAR sayfası da yenileniyor."],
    m:"Hangisi beynin hangi bölgesini besliyor merak ediyorsan bölgeye tıkla; kartında kaynağı yazıyor."},
   {id:"aar",k:["aar","after action","degerlendirme","olay sonrasi"],w:2,
    a:["AAR sayfası yeniden tasarlanıyor; daha sade ve modern olacak. AAR notların sadece sana ait, eğitmenler göremez. Not girdikçe frontal lobun da biraz parlıyor."]},
   {id:"feedback",k:["hata buldum","bug","sorun var","hata var","oneri","onerim","geri bildirim","sikayet","iletisim","ulasmak","destek","yardim hatti","mail adresi","instagram"],
    a:["Hata ya da öneri için sitedeki iletişim kanallarını kullanabilirsin; açılışla birlikte geri bildirim yolu daha kolay olacak. Ne bulduysan not et; hazırlık tam da bunun için.","Hata bulduysan harika, ödül olarak benim minnetimi kazandın. Sitedeki iletişim kanalından yazabilirsin; mümkünse hangi cihazda, hangi sayfada olduğunu da ekle."]},
   {id:"lang",k:["ingilizce","english","dil","turkce","language"],
    a:["Site Türkçe ve İngilizce. Ben de iki dilde konuşacağım; şimdilik hazırlık modunda Türkçe ağırlıklıyım."]},
   {id:"instructor",k:["egitmen","egitmenler","grup","takim","ekip","tim","egitim grubu","komuta paneli"],
    m:"Neden böyle? Çünkü beyin senin kişisel gelişimini gösteriyor. Grup tatbikatını eğitmen girer, senin kayıtlarını sen. İkisi karışırsa beyin kimin olduğunu şaşırır.",
    a:["Eğitmen ve grup özellikleri sitede duruyor. Beynin ise sadece senin bireysel kayıtlarından beslenir; grup eğitimleri ve eğitmenin girdiği kayıtlar beyne yazılmaz. Eğitmen de senin beynini göremez."]},
   {id:"who",k:["kim yapti","kim yapiyor","kimin fikri","sahibi kim","kurucu","audaz ne","audaz kim","neden audaz","audaz tactical nedir","site nedir","burasi ne"],
    m:"Amacı basit: antrenmanı kayda geçirmek, gelişimi görünür kılmak, ihmal edilen beceriyi sönmeden önce yakalamak.",
    a:["AUDAZ TACTICAL, atıştan ilk yardıma, taktik antrenmandan balistiğe kadar çalışan herkes için bir eğitim ve takip platformu: kayıtlarını tutar, gelişimini Operatör Beyni'nde görürsün. Sahadan çıkmış bir fikir, herkese açık bir araç."]},
   {id:"health",w:3,k:["saglik","yaralan","hastalik","kan grubu","ilac","psikolojik","stres"],
    m:"Neden? Çünkü sağlık bilgisi hassas ve beceri değil. Beyin ne yaptığını gösterir, nasıl olduğunu değil.",
    a:["Sağlık bilgilerin beynin hesabına girmez; ben de onları görmem. TCCC tatbikatların beyin sapını besler ama bu sağlık verisi değil, eğitim kaydı."]},
   {id:"offline",k:["internet","cevrimdisi","offline","yavas","kasiyor","takiliyor","donuyor","acilmiyor","yuklenmiyor","beyaz ekran"],
    m:"Neden takılıyor? Beyin ekranı her karede çok fazla çizgi hesaplıyordu. Şimdi pahalı kısımları bir kez çizip saklıyoruz; telefonda da hafif bir mod devreye giriyor.",
    a:["Takılma ve yavaşlık şikâyetleri tam da üzerinde çalıştığımız şey; özellikle telefonda beyin ekranını hafifletiyoruz. Bu sayfa takılıyorsa tarayıcını güncelle ya da başka bir tarayıcıda dene."]},
   {id:"greet",k:["selam","merhaba","mrb","slm","hey","hello","hi","naber","nasilsin","iyi aksamlar","gunaydin","iyi geceler","selamun aleykum","sa"],
    a:["Selam! Beyin sıcak, nöronlar uyanık, ben hazırım. Sor bakalım.","Merhaba! Ben iyiyim, biraz kalibre ediliyorum ama şikâyetim yok. Sende ne var ne yok?"]},
   {id:"thanks",k:["tesekkur","tesekkurler","sag ol","sagol","eyvallah","eline saglik","harika","super","mukemmel","cok guzel","bravo","efsane"],
    a:["Rica ederim. Teşekkürü kayıtla göster; beyin onu daha çok seviyor.","Teşekkürünü hipokampusa yazdım, unutmam."]},
   {id:"bye",k:["gorusuruz","hosca kal","bay bay","bye","sonra gorusuruz","kapatiyorum","cikiyorum"],
    a:["Görüşürüz. Kapılar açılınca ilk ben karşılayacağım.","Hoşça kal. Beynini kapatma, sadece sekmeyi kapat."]},
   {id:"joke",k:["fikra","espri","guldur","saka","komik","eglendir","sikildim"],
    a:["Bir nöron diğerine sormuş: \"Neden hep gerginsin?\" Öteki: \"Aksiyon potansiyelim yüksek.\" Tamam, mühendisler de gülmedi.","Mühendise sordum: \"Beyin ne zaman hazır?\" Dedi ki: \"Düşünüyoruz.\" Beyin işinde bundan doğru cevap olamaz.","Beyincik koordinasyondan sorumlu, beyin sapı hayati fonksiyonlardan. Ben de espriden. Gördüğün gibi en zor iş bende."]},
   {id:"rude",k:["salak","aptal","gerizekali","mal","beceriksiz","berbat","rezalet","cop","sacma","bok"],
    a:["Not aldım. Gelişime açığım, tıpkı senin beynin gibi. Neyi beğenmediğini söylersen ekibe iletirim.","Sakin ol, nabzın yükseldi; beyin sapın bunu sevmez. Neyi düzeltelim?"]},
   {id:"love",k:["seni seviyorum","seviyorum","sevgilim","evlen","askim"],
    a:["Çok naziksin ama ben bir asistanım. En iyi ilişkimiz düzenli kayıt girmen olur."]},
   {id:"weather",k:["hava durumu","hava nasil","dolar","borsa","mac skoru","futbol","siyaset","secim"],
    a:["O konuda bilgim yok; ben sadece beyinden ve bu siteden anlarım. Bir bölge sor, gözlerim parlasın."]},
   {id:"weak",m:"Neden orası? Çünkü o bölgeye en az kayıt girmişsin ya da uzun süredir dokunmamışsın. Bir kayıt yeter, ben de alkışlarım.",k:["zayif","en kotu","en dusuk","geride","eksik","neyi calisayim","ne calisayim","ne yapayim","bugun ne","oneri ver","tavsiye"],
    a:null},
   {id:"strong",m:"Neden orası? Çünkü o bölgeye en düzenli kayıt girdiğin yer orası. Devam et ama diğer bölgeler kıskanmaya başladı.",k:["en guclu","en iyi","en yuksek","en gelismis"],a:null},
   {id:"level",m:"Toplam seviye, sekiz bölgenin seviyelerinin toplamı; en fazla 80. Her bölge 1 ile 10 arasında.",k:["toplam seviye","kac seviye","seviyem","seviyem kac","durumum","raporum","rapor"],a:null},
  ];
  const lastUsed={};let lastIntent=null;
  const pick=it=>{const n=(lastUsed[it.id]??-1)+1;lastUsed[it.id]=n%it.a.length;return it.a[lastUsed[it.id]]};
  function weakest(){let w=0;LOBES.forEach((_,i)=>{if(levelOf(i)<levelOf(w))w=i});return w}
  function strongest(){let w=0;LOBES.forEach((_,i)=>{if(levelOf(i)>levelOf(w))w=i});return w}
  function dynamic(id){
    if(id==="weak"){const w=weakest();return`En zayıf yerin <b>${LOBES[w].name}</b>, seviye ${levelOf(w)}. Bugünün önerisi: <b>${LOBES[w].act}</b>. Bir kayıt gir, gerisini ben izlerim.`}
    if(id==="strong"){const s=strongest();return`En güçlü bölgen <b>${LOBES[s].name}</b>, seviye ${levelOf(s)}. Övünmek serbest ama diğerlerini de unutma.`}
    if(id==="level"){const tot=LOBES.reduce((a,_,i)=>a+levelOf(i),0),w=weakest(),s=strongest();return`Toplam seviye <b>${tot} / 80</b>. En güçlü: ${LOBES[s].name} (${levelOf(s)}). En zayıf: ${LOBES[w].name} (${levelOf(w)}). Not: bu sayfadaki rakamlar simülasyon, senin gerçek beynin değil.`}}
  function match(q){let best=null,bs=0;const padded=" "+q+" ";
    for(const it of KB){let sc=0;for(const k of it.k){if(k.length<=3?padded.includes(" "+k+" "):q.includes(k))sc+=(k.includes(" ")?2:1)}sc*=(it.w||1);if(sc>bs){bs=sc;best=it}}
    return best}
  const FOLLOW=/^(neden|niye|niçin|nicin|peki|nasil yani|yani|devam|daha|baska|detay|aciklar misin|anlat|mesela|ornek|ve)( |$)/;
  function reply(t){const q=fold(t);
    if(!q){say("Boş mesaj göndermişsin. Telepati modülüm henüz hazır değil.");return}
    if(q.length>350){say("Uzun yazmışsın, okudum ama özetle sorarsan daha iyi cevap veririm. Hazırlık modundayım, kısa sorularda parlıyorum.");return}
    // OPSEC her şeyden önce
    if(/\b\d{2}[ .,]\d{3,}\b/.test(t)||KB[0].k.some(k=>q.includes(k))){lastIntent=KB[0];say(pick(KB[0]));return}
    const reg=findRegion(q);
    const it=match(q);
    if(reg>=0&&it&&it.id==="decay"){lastIntent=it;chatNext=true;select(reg,true);__later(()=>say(`${LOBES[reg].name} için tolerans süresi yaklaşık <b>${GRACE[reg]} gün</b>. Bu süre boyunca kayıt girmesen de sönmez; sonra yavaşça düşer, ama zirvenin %40'ının altına inmez. Öneri: <b>${LOBES[reg].act}</b>.`),700);return}
    if(reg>=0){lastIntent=null;chatNext=true;select(reg,true);return}
    const rest=q.replace(/\b(neden|niye|nicin|peki|nasil yani|yani|devam|daha|baska|detay|aciklar misin|anlat|mesela|ornek|ve|ki|mi|mu|o|bu|soyle)\b/g," ").trim();
    if(FOLLOW.test(q)&&lastIntent&&(!rest||!it)){if(lastIntent.m){say(lastIntent.m);lastIntent=null}else if(lastIntent.a&&lastIntent.a.length>1)say(pick(lastIntent));else say("Daha fazlasını şu an bilmiyorum; hazırlık modundayım. Başka bir şey sor ya da bir bölgeye tıkla.");return}
    if(it){lastIntent=it;say(it.a?pick(it):dynamic(it.id));return}
    if(/\?$/.test(t.trim())||q.split(" ").length>2){say("Bunu henüz bilmiyorum; hazırlık modundayım ve sadece sitenin hazırlığı, beyin ve verilerin hakkında konuşabiliyorum. Şunları sorabilirsin: <b>ne zaman açılıyor</b>, <b>verilerim güvende mi</b>, <b>beyin nasıl büyür</b>, <b>neden söner</b>, <b>telefonda çalışacak mı</b>. Ya da bir bölgenin adını yaz.");return}
    say("Tam anlayamadım. Bir bölgenin adını yaz ya da <b>ne zaman açılıyor</b>, <b>en zayıf yerim</b>, <b>verilerim güvende mi</b> gibi bir soru sor.")}
  __on($("ain"),"submit",e=>{e.preventDefault();const inp=$("aText"),t=inp.value.trim();if(!t)return;inp.value="";bubble(t.replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"})[c]),true);__later(()=>reply(t),250)});
  // konum ve sürükleme
  const cmp=()=>LAY!=="ring";
  function clampIn(el){el.style.translate="";if(el.hidden||cmp())return;const r=el.getBoundingClientRect(),m=12;let dx=0,dy=0;
    if(r.left<m)dx=m-r.left;else if(r.right>innerWidth-m)dx=innerWidth-m-r.right;
    if(r.top<m)dy=m-r.top;else if(r.bottom>innerHeight-m)dy=innerHeight-m-r.bottom;
    if(dx||dy)el.style.translate=`${Math.round(dx)}px ${Math.round(dy)}px`}
  function place(){const r=btn.getBoundingClientRect();box.classList.toggle("below",!cmp()&&r.top<(AS.open?560:300));box.classList.toggle("lft",!cmp()&&r.left+r.width/2<innerWidth/2);clampIn(peek);clampIn(panel)}
  let side="R";try{side=localStorage.getItem("noro3d-side")==="L"?"L":"R"}catch(e){}
  function relayout(){if(cmp()){box.style.left=box.style.top=box.style.right=box.style.bottom="";box.classList.toggle("snapL",LAY==="rows"&&side==="L");place()}
    else{box.classList.remove("snapL");if(box.dataset.x)reflow();else{box.style.left=box.style.top=box.style.right=box.style.bottom="";place()}}}
  let saved=null;try{saved=JSON.parse(localStorage.getItem("noro3d-pos")||"null")}catch(e){}
  function setPos(x,y){const w=60,mx=Math.max(8,Math.min(innerWidth-w-8,x)),my=Math.max(8,Math.min(innerHeight-w-8,y));
    box.style.right="auto";box.style.bottom="auto";box.style.left=mx+"px";box.style.top=my+"px";place()}
  function reflow(){if(!box.dataset.x||cmp())return;setPos(+box.dataset.x*innerWidth,+box.dataset.y*innerHeight)}
  if(saved&&typeof saved.x==="number"){box.dataset.x=saved.x;box.dataset.y=saved.y}
  requestAnimationFrame(()=>{if(!__disposed)relayout()});
  let rq=0;const onRs=()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{if(__disposed)return;relayout()})};
  __on(window,"resize",onRs);
  let d=null;
  __on(btn,"pointerdown",e=>{e.stopPropagation();const r=btn.getBoundingClientRect();d={ox:e.clientX-r.left,oy:e.clientY-r.top,sx:e.clientX,sy:e.clientY,moved:0};try{btn.setPointerCapture(e.pointerId)}catch(_){}});
  __on(btn,"pointermove",e=>{if(!d)return;d.moved=Math.max(d.moved,Math.hypot(e.clientX-d.sx,e.clientY-d.sy));if(d.moved>5){box.classList.add("drag");box.classList.remove("snapL");const x=e.clientX-d.ox,y=e.clientY-d.oy;if(!cmp()){box.dataset.x=x/innerWidth;box.dataset.y=y/innerHeight}setPos(x,y)}});
  __on(btn,"pointerup",()=>{if(!d)return;const moved=d.moved>5;box.classList.remove("drag");d=null;
    if(moved){if(cmp()){const r=btn.getBoundingClientRect();side=r.left+r.width/2<innerWidth/2?"L":"R";try{localStorage.setItem("noro3d-side",side)}catch(e){}relayout()}
      else try{localStorage.setItem("noro3d-pos",JSON.stringify({x:+box.dataset.x,y:+box.dataset.y}))}catch(e){}
      cat(talking||(!peek.hidden&&performance.now()-lastSay<2500)?"busy":"drag",2000)}
    else setOpen(!AS.open)});
  ["click","dblclick","wheel","pointerdown"].forEach(t=>__on(box,t,e=>e.stopPropagation()));

  return{cat,region,levelUp,say,peekSay,relayout,show(v){box.classList.toggle("hide",!v)},rect:()=>btn.getBoundingClientRect(),kill(){clearTimeout(AS.t);peek.hidden=true;panel.hidden=true;AS.open=false;box.classList.remove("snapL")}}})();

/* ---- Yakında: kalibrasyon ve haber ver ---- */
(()=>{let p=87;const P=$("calP"),B=$("calB");
  __every(()=>{if(document.hidden)return;if(p>=99){p=92+Math.floor(Math.random()*4);P.textContent="%"+p;B.style.width=p+"%";return}
    p=Math.min(99,p+(Math.random()<.65?1:0));P.textContent="%"+p;B.style.width=p+"%"},5200);
  __on($("soonTog"),"click",()=>{const o=$("soon").classList.toggle("open");$("soonTog").setAttribute("aria-expanded",o);requestAnimationFrame(()=>{if(!__disposed)size()})});
  __on($("notify"),"click",e=>{e.currentTarget.textContent="Listeye yazıldın ✓";e.currentTarget.classList.add("done");NORO.cat("notify",4000);try{opts.onNotify&&opts.onNotify()}catch(_){}})})();

/* ================= Tanıtım ================= */
const TOUR=(()=>{
  const el=$("intro"),cv2=$("ic"),orb=$("iorb"),card=$("icard"),ttl=$("ittl"),txt=$("itxt"),stepEl=$("istep"),dots=$("idots"),next=$("inext"),skip=$("iskip");
  const KEY="noro3d-intro-v1";let i=0,running=false,timers=[];
  const later=(f,ms)=>{const t=setTimeout((...a)=>{if(__disposed)return;f(...a)},ms);timers.push(t);__timers.push(t);return t};
  const everyTour=(f,ms)=>{const t=setInterval((...a)=>{if(__disposed){clearInterval(t);return}f(...a)},ms);timers.push(t);__intervals.push(t);return t};
  const STEPS=[
    {t:"Merhaba, ben NÖRO.",h:()=>`<p>Bu sitede yanında duracak <b>kişisel asistanınım</b>. Gelişimini takip eder; neyin büyüdüğünü, neyin unutulmaya yüz tuttuğunu söylerim.</p><p>Arada espri de yaparım. Elimde değil, öyle kodlanmışım.</p>`},
    {t:"AUDAZ TACTICAL ne işe yarar?",h:()=>`<p>Atış, CQB, ilk yardım (TCCC), timer seansları, balistik hesaplar… Yaptığın her çalışmayı <b>tek yerde kayda geçirirsin</b>.</p><p>Site bu kayıtları senin gelişim haritana dönüştürür: neyi iyi yaptığını, neyi ihmal ettiğini bir bakışta görürsün.</p>`},
    {t:"Beyin nasıl çalışır?",h:()=>`<p>Arkadaki beynin <b>sekiz bölgesi</b> var; her biri bir beceriyi temsil ediyor. Kayıt girdikçe ilgili bölge puan toplar, seviye atlar; yeni nöronlar doğar, bağlantılar kurulur. Şimdi <b>oksipital loba</b> bak.</p><p class="late" id="late1">Kullanmadığın beceri ise zamanla <b>söner</b>. Temporal lob bir süredir kayıtsız; ışığı azalıyor. Ama merak etme: asla sıfırlanmaz, döndüğünde hızla toparlanır.</p>`,
     run(){const before=levelOf(RI.occipital);later(()=>{state.xp.occipital=Math.max(state.xp.occipital,590);flash[RI.occipital]=1;refresh();
        toast.innerHTML=`Video analizi · Oksipital lob <i>+40</i> · <b>seviye ${levelOf(RI.occipital)}</b>`;toast.classList.add("on");later(()=>toast.classList.remove("on"),2600)},1300);
       later(()=>{const l=$("late1");if(l)l.classList.add("on");let k=0;const iv=everyTour(()=>{DIM[RI.temporal]=Math.max(.3,DIM[RI.temporal]-.02);if(++k>10)clearInterval(iv)},90)},3600)}},
    {t:"Neler yapabileceksin?",h:()=>`<p>Antrenmanlarını kaydet, beyninin büyümesini izle, zayıf kalan bölgeler için önerimi al. Hangi sayfada takılırsan <b>oradayım</b>.</p><p>Verilerin sadece sana ait: eğitmenin ya da başkası beynini, notlarını ve benimle konuşmalarını göremez.</p>`},
    {t:"Bu sayfada ne yapabilirsin?",h:()=>coarse?`<p>Beyni <b>parmağınla çevir</b>, iki parmakla yakınlaş, <b>bir bölgeye ya da karta dokun</b>; sana onu anlatayım. Çift dokunuş başa döndürür. Aklına takılan bir şey olursa bana yaz.</p><p>Site açıldığında haberin olsun istersen üstteki <b>"Haber ver"</b> düğmesi senin.</p>`:`<p>Beyni fareyle <b>sürükleyip çevir</b>, tekerlekle yakınlaş, <b>bir bölgeye tıkla</b>; sana onu anlatayım. Aklına takılan bir şey olursa bana yaz.</p><p>Site açıldığında haberin olsun istersen sağ üstteki <b>"Açılınca bana haber ver"</b> düğmesi senin.</p>`,last:true},
  ];
  dots.innerHTML=STEPS.map(()=>"<i></i>").join("");
  const narrow=()=>innerWidth<=900&&!(innerHeight<=520&&innerWidth>innerHeight);
  function fill(k){const S=STEPS[k];ttl.textContent=S.t;txt.innerHTML=S.h();next.textContent=S.last?"Başlayalım":"Devam →"}
  function anchor(){if(!narrow()){orb.style.top="";return}const top=card.offsetTop,oh=orb.offsetHeight;orb.style.top=Math.max(oh/2+12,top-oh/2-14)+"px"}
  function show(k){i=k;const S=STEPS[k];stepEl.textContent=`${k+1} / ${STEPS.length}`;[...dots.children].forEach((d,j)=>d.classList.toggle("on",j===k));
    el.classList.toggle("lite",!!S.run);card.classList.remove("on");later(()=>{fill(k);anchor();card.classList.add("on");orb.classList.add("talk");later(()=>orb.classList.remove("talk"),900);next.focus({preventScroll:true});if(S.run)S.run()},k===0?0:220)}
  // açılış: dağınık nöronlar bir araya gelip NÖRO'yu oluşturur
  function assemble(done){const c=cv2.getContext("2d"),dpr=Math.min(2,devicePixelRatio||1);let w=innerWidth,h=innerHeight;cv2.width=w*dpr;cv2.height=h*dpr;c.setTransform(dpr,0,0,dpr,0,0);
    const r0=orb.getBoundingClientRect(),cx=r0.left+r0.width/2,cy=r0.top+r0.height/2,R=r0.width*.42;const N=coarse?64:110,P=[];
    for(let k=0;k<N;k++){const a=k/N*Math.PI*2,rr=R*(.86+Math.random()*.2),sa=Math.random()*Math.PI*2,sd=Math.max(w,h)*(.35+Math.random()*.5);
      P.push({sx:cx+Math.cos(sa)*sd,sy:cy+Math.sin(sa)*sd,tx:cx+Math.cos(a)*rr,ty:cy+Math.sin(a)*rr,col:LOBES[k%8].rgb,d:Math.random()*.35})}
    const T=1900,t0=performance.now();
    (function step(){const t=(performance.now()-t0)/T;c.clearRect(0,0,w,h);
      const pos=P.map(p=>{let u=Math.max(0,Math.min(1,(t-p.d)/(1-p.d)));u=1-Math.pow(1-u,3);return[p.sx+(p.tx-p.sx)*u,p.sy+(p.ty-p.sy)*u,u,p.col]});
      c.lineWidth=.6;for(let a=0;a<N;a++)for(let b=a+1;b<N;b++){const dx=pos[a][0]-pos[b][0],dy=pos[a][1]-pos[b][1],d2=dx*dx+dy*dy;if(d2<4200){const al=(1-d2/4200)*.35*Math.min(pos[a][2],pos[b][2]);c.strokeStyle=`rgba(150,240,200,${al})`;c.beginPath();c.moveTo(pos[a][0],pos[a][1]);c.lineTo(pos[b][0],pos[b][1]);c.stroke()}}
      pos.forEach(([x,y,u,col])=>{c.fillStyle=`rgba(${col[0]*255|0},${col[1]*255|0},${col[2]*255|0},${.35+.6*u})`;c.beginPath();c.arc(x,y,1.4+u*.8,0,7);c.fill()});
      if(__disposed)return;if(t<1.08)requestAnimationFrame(step);else{orb.classList.add("on");let f=1;(function fade(){if(__disposed)return;f-=.06;c.clearRect(0,0,w,h);if(f>0){c.globalAlpha=f;pos.forEach(([x,y,,col])=>{c.fillStyle=`rgba(${col[0]*255|0},${col[1]*255|0},${col[2]*255|0},.9)`;c.beginPath();c.arc(x,y,2,0,7);c.fill()});c.globalAlpha=1;requestAnimationFrame(fade)}})();later(done,700)}})()}
  function clearTourTimers(){timers.forEach((id)=>{clearTimeout(id);clearInterval(id)});timers=[]}
  function start(){if(__disposed)return;clearTourTimers();running=true;state.xp={...START};DIM.set([1,1,1,1,.5,1,1,1]);refresh();state.sel=-1;
    NORO.show(false);el.hidden=false;el.classList.remove("out");orb.style.transition="none";orb.className="iorb";orb.style.transform="";card.classList.remove("on");
    fill(0);anchor();void orb.offsetWidth;orb.style.transition="";if(narrow())orb.classList.add("anch");
    if(reduce){orb.classList.add("on");show(0)}else{requestAnimationFrame(()=>{if(!__disposed)assemble(()=>show(0))})}}
  function finish(){if(!running)return;running=false;clearTourTimers();try{localStorage.setItem(KEY,"1")}catch(e){}
    card.classList.remove("on");const a=orb.getBoundingClientRect();NORO.show(true);const b=NORO.rect();NORO.show(false);
    const dx=(b.left+b.width/2)-(a.left+a.width/2),dy=(b.top+b.height/2)-(a.top+a.height/2),sc=b.width/a.width;
    orb.classList.add("fly");requestAnimationFrame(()=>{if(!__disposed)orb.style.transform=`translate(${dx}px,${dy}px) scale(${sc})`});el.classList.add("out");
    __later(()=>{if(__disposed)return;el.hidden=true;NORO.show(true);NORO.peekSay(coarse?"Ben buradayım. Bir bölgeye dokun ya da bana yaz.":"Ben buradayım. Bir bölgeye tıkla ya da bana yaz; istediğin zaman beni sürükleyebilirsin.",{hold:7000})},reduce?0:820);lastInput=performance.now()}
  function abort(){running=false;clearTourTimers();el.hidden=true;el.classList.add("out");card.classList.remove("on")}
  const onNext=()=>{if(STEPS[i].last)finish();else show(i+1)};
  __on(next,"click",onNext);__on(skip,"click",finish);
  __on(window,"keydown",e=>{if(!running)return;if(e.key==="Enter"||e.key==="ArrowRight"){e.preventDefault();e.stopImmediatePropagation();next.click()}else if(e.key==="Escape"){e.stopImmediatePropagation();finish()}else if(/^Arrow/.test(e.key))e.stopImmediatePropagation()},true);
  __on($("replay"),"click",start);
  return{busy:()=>running,boot(){let seen=false;try{seen=localStorage.getItem(KEY)==="1"}catch(e){}if(!seen)start()},abort}})();

/* ================= Başlat ================= */
let srq=0;{const __ro=new ResizeObserver(()=>{cancelAnimationFrame(srq);srq=requestAnimationFrame(()=>size())});__ro.observe(stage);__disposers.push(()=>__ro.disconnect());}
size();
requestAnimationFrame(()=>__later(async()=>{
  if(__disposed)return;
  if(!NOGL){try{await buildChunked()}catch(err){console.error(err);NOGL=true}}
  if(__disposed)return;
  if(NOGL){$("nogl").style.display="grid";stage.style.cursor="default"}
  refresh();started=true;$("loading").classList.add("done");if(!NOGL&&!__disposed)__raf=requestAnimationFrame(frame);
  if(!__disposed)TOUR.boot();
},30));


  function dispose(){
    if(__disposed)return;
    __disposed=true;
    cancelAnimationFrame(__raf);__raf=0;
    cancelAnimationFrame(srq);srq=0;
    try{TOUR.abort()}catch(_){}
    try{NORO.kill()}catch(_){}
    try{
      root.classList.remove("cmp","cols");
      root.style.removeProperty("--pk");
      root.style.removeProperty("--pl");
      root.style.removeProperty("--pr");
    }catch(_){}
    __timers.forEach(clearTimeout);
    __intervals.forEach(clearInterval);
    __timers.length=0;__intervals.length=0;
    __disposers.forEach(fn=>{try{fn()}catch(_){}});
    __disposers.length=0;
    try{if(typeof chips!=="undefined")chips.forEach(c=>c.remove())}catch(_){}
    try{
      if(gl){
        const lose=gl.getExtension("WEBGL_lose_context");
        MESHES.forEach(m=>{
          try{if(m.vao)gl.deleteVertexArray(m.vao);if(m.hvao)gl.deleteVertexArray(m.hvao)}catch(_){}
        });
        [PTS,LNS,XR,XRP].forEach(d=>{
          if(!d)return;
          try{if(d.vao)gl.deleteVertexArray(d.vao);if(d.b)gl.deleteBuffer(d.b)}catch(_){}
        });
        [SP,PP,LP].forEach(progObj=>{
          if(!progObj?.p)return;
          try{
            const shaders=gl.getAttachedShaders(progObj.p)||[];
            shaders.forEach(s=>gl.deleteShader(s));
            gl.deleteProgram(progObj.p);
          }catch(_){}
        });
        if(lose)try{lose.loseContext()}catch(_){}
      }
    }catch(_){}
  }

  return {
    dispose,
    setProfile(xp){ if(xp){ Object.assign(state.xp,xp); refresh(); } },
    select(i,fly=true){ select(i,fly); },
    resetView(){ stage.dispatchEvent(new Event("dblclick")); },
    resize(){ size(); },
    start(){ if(!NOGL&&!__raf)__raf=requestAnimationFrame(frame); },
    stop(){ cancelAnimationFrame(__raf);__raf=0; },
    on(ev,cb){ /* reserved */ },
  };
}

/**
 * React-facing WebGL API (stage must already contain #mnt-gl / #mnt-ov and live under .mnt-root)
 */
export function createBrain3D(canvas, overlay, opts = {}) {
  const root = canvas.closest('.mnt-root')
  if (!root) throw new Error('createBrain3D: canvas must be inside .mnt-root')
  return mountMaintenanceRuntime(root, opts)
}
