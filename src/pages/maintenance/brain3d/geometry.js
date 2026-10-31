/** Anatomical brain geometry — from brain3d-prototype */

export const LOBES=[
 {id:"frontal",sh:"Frontal",name:"Frontal lob",func:"Karar, planlama",col:"#5b8def",src:"Tamamlanan görevler ve FOF senaryoları",act:"Görev tamamla",chip:[.16,.30]},
 {id:"motor",sh:"Motor",name:"Motor korteks",func:"Hareket",col:"#3fbf6f",src:"Atış kaydı sayısı ve skorları",act:"Atış kaydı ekle",chip:[.36,.10]},
 {id:"parietal",sh:"Parietal",name:"Parietal lob",func:"Uzamsal hesap",col:"#c9b52c",src:"Balistik profiller ve envanter bakım kayıtları",act:"Balistik profil kaydet",chip:[.62,.10]},
 {id:"occipital",sh:"Oksipital",name:"Oksipital lob",func:"Görme",col:"#e8862a",src:"Okunan haber ve izlenen video",act:"Haber oku",chip:[.84,.30]},
 {id:"temporal",sh:"Temporal",name:"Temporal lob",func:"Hafıza, dil",col:"#36b9c9",src:"Okunan doktrinler",act:"Doktrin oku",chip:[.16,.64]},
 {id:"hippocampus",sh:"Hipokampus",name:"Hipokampus",func:"Kayıt, hatıra",col:"#e0609a",src:"Düzenli kayıt serisi",act:"Günlük seri +1",chip:[.32,.88]},
 {id:"cerebellum",sh:"Beyincik",name:"Beyincik",func:"Koordinasyon, refleks",col:"#f0a53a",src:"Timer seansları",act:"Timer seansı",chip:[.84,.64]},
 {id:"stem",sh:"Beyin sapı",name:"Beyin sapı",func:"Hayati fonksiyonlar",col:"#e5534b",src:"TCCC kayıtları",act:"TCCC tatbikatı",chip:[.64,.88]},
];
export const RI=Object.fromEntries(LOBES.map((L,i)=>[L.id,i]));
const hex=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];
LOBES.forEach(L=>L.rgb=hex(L.col));
export const LT=[0,40,90,150,230,330,450,590,760,950];
export const lv=x=>{let l=1;for(let i=0;i<LT.length;i++)if(x>=LT[i])l=i+1;return Math.min(10,l)};
export const START={frontal:600,motor:780,parietal:470,occipital:460,temporal:95,hippocampus:460,cerebellum:800,stem:600};


/* ================= Gürültü ================= */
export const perm=new Uint8Array(512);{const p=[...Array(256).keys()];let s=11;for(let i=255;i>0;i--){s=(s*16807)%2147483647;const j=s%(i+1);[p[i],p[j]]=[p[j],p[i]]}for(let i=0;i<512;i++)perm[i]=p[i&255]}
const fade=t=>t*t*t*(t*(t*6-15)+10),lerp=(a,b,t)=>a+t*(b-a);
function grad(h,x,y,z){h&=15;const u=h<8?x:y,v=h<4?y:(h===12||h===14?x:z);return((h&1)?-u:u)+((h&2)?-v:v)}
export function noise(x,y,z){const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);const u=fade(x),v=fade(y),w=fade(z);
 const A=perm[X]+Y,AA=perm[A]+Z,AB=perm[A+1]+Z,B=perm[X+1]+Y,BA=perm[B]+Z,BB=perm[B+1]+Z;
 return lerp(lerp(lerp(grad(perm[AA],x,y,z),grad(perm[BA],x-1,y,z),u),lerp(grad(perm[AB],x,y-1,z),grad(perm[BB],x-1,y-1,z),u),v),
  lerp(lerp(grad(perm[AA+1],x,y,z-1),grad(perm[BA+1],x-1,y,z-1),u),lerp(grad(perm[AB+1],x,y-1,z-1),grad(perm[BB+1],x-1,y-1,z-1),u),v),w)}
export function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ================= Vektör yardımcıları ================= */
export const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]};

/* ================= Geometri: anatomik beyin ================= */
// Koordinat: x = yan (sağ +), y = üst, z = ön. Birim ≈ mm.
export function ell(px,py,pz,cx,cy,cz,rx,ry,rz){const x=(px-cx)/rx,y=(py-cy)/ry,z=(pz-cz)/rz,k0=Math.sqrt(x*x+y*y+z*z),k1=Math.sqrt(x*x/(rx*rx)+y*y/(ry*ry)+z*z/(rz*rz));return k0*(k0-1)/(k1||1e-6)}
export function smin(a,b,k){const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return b+(a-b)*h-k*h*(1-h)}
export function sdfHemi(x,y,z){ // yerel: x>=0
  let d=ell(x,y,z,33,14,-4,37,54,83);
  d=smin(d,ell(x,y,z,45,-19,12,25,21,42),11);            // temporal lob
  d=smin(d,ell(x,y,z,26,6,56,30,36,24),9);              // frontal kutup
  d=smin(d,ell(x,y,z,28,2,-62,30,34,26),10);            // oksipital kutup
  d=Math.max(d,1.6-x);                                   // iç (medial) yüzey
  d=Math.max(d,-(y+44));
  return d}
export const ys=z=>-3-.13*z;                       // Sylvius yarığı yüksekliği
export const zc=y=>-11+.24*(62-y);                 // santral oluk
export function wig(x,y,z,s){return noise(x*.03+s,y*.03,z*.03)*4.2+noise(x*.09,y*.09+s,z*.09)*1.2}
export function majorDist(x,y,z,s){
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
export const ANI={0:[.07,.1,.042],1:[.07,.032,.13],2:[.07,.07,.075],3:[.07,.085,.06],4:[.07,.12,.04],5:[.07,.12,.04]};
export function minorField(x,y,z,s,reg){const k=ANI[reg]||ANI[2];
  const wx=x+noise(x*.03+s,y*.03,z*.03)*6,wy=y+noise(x*.03,y*.03+s,z*.03)*6,wz=z+noise(x*.03,y*.03,z*.03+s)*6;
  return noise(wx*k[0]+s,wy*k[1],wz*k[2])+.3*noise(wx*k[0]*2.1,wy*k[1]*2.1+s,wz*k[2]*2.1)}
export function regionOf(x,y,z){
  if(z<-56+.12*(y-10))return RI.occipital;
  if(y<ys(z)-1&&z>-60){if(x<27&&y<-13&&z<14&&z>-42)return RI.hippocampus;return RI.temporal}
  const c=zc(y);
  if(z>c+17)return RI.frontal;
  if(z>c-1)return RI.motor;
  return RI.parietal}

export function icosphere(n){const t=(1+Math.sqrt(5))/2;let v=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(V.norm);
  let f=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let i=0;i<n;i++){const cache=new Map(),nf=[];const mid=(a,b)=>{const k=a<b?a*1e6+b:b*1e6+a;let r=cache.get(k);if(r===undefined){const p=v[a],q=v[b];r=v.length;v.push(V.norm([p[0]+q[0],p[1]+q[1],p[2]+q[2]]));cache.set(k,r)}return r};
    for(const [a,b,c] of f){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);nf.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}f=nf}
  return{v,f}}

export function finishMesh(P,F,extra,C){ // P: Float32Array positions, F: Uint32Array
  const n=P.length/3,N=new Float32Array(n*3);
  if(C){const P0=P;P=(extra&&extra.Q)||P0;for(let i=0;i<F.length;i+=3){const a=F[i]*3,b=F[i+1]*3,c=F[i+2]*3;const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const cx=(P[a]+P[b]+P[c])/3-C(P[a+1])[0],cy=(P[a+1]+P[b+1]+P[c+1])/3-C(P[a+1])[1],cz=(P[a+2]+P[b+2]+P[c+2])/3-C(P[a+1])[2];if(nx*cx+ny*cy+nz*cz<0){const t=F[i+1];F[i+1]=F[i+2];F[i+2]=t}}P=P0}
  for(let i=0;i<F.length;i+=3){const a=F[i]*3,b=F[i+1]*3,c=F[i+2]*3;
    const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of[a,b,c]){N[k]+=nx;N[k+1]+=ny;N[k+2]+=nz}}
  for(let i=0;i<n;i++){const l=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1;N[i*3]/=l;N[i*3+1]/=l;N[i*3+2]/=l}
  const o={P,N,F,...extra};if(!o.G)o.G=N;if(!o.Q)o.Q=P;return o}

export function buildHemi(sphere,side){
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

export const CB_HUB=[0,-30,-44];
export function sdfCbl(x,y,z){let d=smin(ell(x,y,z,19,-39,-58,30,20,27),ell(x,y,z,-19,-39,-58,30,20,27),10);d=Math.max(d,-(y+60));return d}
export function buildCbl(sphere){
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

export function stemCenter(t){return[0,-10-t*72,-20-t*12-Math.sin(t*3.1)*4]}
export function buildStem(){
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
export function hippoCurve(side){const pts=[];for(let i=0;i<=40;i++){const t=i/40;pts.push([side*(26+4*Math.sin(t*3)),-24+9*t*t+3*Math.sin(t*5),8-40*t])}return pts}
