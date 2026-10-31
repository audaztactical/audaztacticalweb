export const SURF_VS = `#version 300 es
in vec3 aP;in vec3 aN;in vec3 aG;in float aS;in float aM;in float aR;
uniform mat4 uVP;uniform float uPush;
out vec3 vP;out vec3 vN;out vec3 vG;out float vS;out float vM;out float vR;
void main(){vec3 p=aP+aN*uPush;vP=p;vN=aN;vG=aG;vS=aS;vM=aM;vR=aR;gl_Position=uVP*vec4(p,1.);}`;

export const SURF_FS = `#version 300 es
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

export const PT_VS = `#version 300 es
in vec3 aP;in vec4 aC;in float aZ;
uniform mat4 uVP;uniform float uK;
out vec4 vC;
void main(){vec4 c=uVP*vec4(aP,1.);gl_Position=c;gl_PointSize=max(1.,aZ*uK/c.w);vC=aC;}`;

export const PT_FS = `#version 300 es
precision highp float;in vec4 vC;out vec4 o;
void main(){vec2 q=gl_PointCoord*2.-1.;float d=length(q);float core=1.-smoothstep(.2,.3,d);float halo=exp(-d*d*7.)*.5;float a=(core+halo*(1.-core))*vC.a;if(a<.004)discard;o=vec4(vC.rgb*(core+halo*.8),a);}`;

export const LN_VS = `#version 300 es
in vec3 aP;in vec4 aC;uniform mat4 uVP;out vec4 vC;
void main(){gl_Position=uVP*vec4(aP,1.);vC=aC;}`;

export const LN_FS = `#version 300 es
precision highp float;in vec4 vC;out vec4 o;void main(){o=vC;}`;
