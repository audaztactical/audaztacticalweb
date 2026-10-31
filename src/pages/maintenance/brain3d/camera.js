/** From brain3d-prototype */

export function persp(fov,a,n,f){const t=1/Math.tan(fov/2),nf=1/(n-f);return[t/a,0,0,0,0,t,0,0,0,0,(f+n)*nf,-1,0,0,2*f*n*nf,0]}
export function lookAt(e,c,u){const z=V.norm(V.sub(e,c)),x=V.norm(V.cross(u,z)),y=V.cross(z,x);return{m:[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,e),-V.dot(y,e),-V.dot(z,e),1],x,y,z}}
export function mul(a,b){const o=new Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];o[i*4+j]=s}return o}

export const HOME_DEFAULT = { yaw: 0.38, pitch: 0.2, dist: 400 }
export const TARGET_DEFAULT = [0, 2, -6]
