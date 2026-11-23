/**
 * Progressive cartographic layer for the Atlas vivant.
 * All navigation and readable content remain ordinary HTML above this canvas.
 * The Three.js/TSL dependencies are imported only when enhancement is enabled.
 */

const ACTIVE = new WeakMap();
const NORMAL_IDS = {yann:'parcours',rock:'rock-de-strass',activites:'pratiques',activities:'pratiques'};
const THREADS = [
  ['parcours','novamemory'],['novamemory','novaformation'],['novaformation','pratiques'],
  ['pratiques','rock-de-strass'],['rock-de-strass','novaiaweb'],['novaiaweb','trouvejob'],
  ['novaiaweb','parcours'],['parcours','novalove'],['novalove','journal'],
  ['journal','novamemory'],
  ['novaia-assistant','parcours'],['novaia-assistant','novamemory'],
  ['novaia-assistant','novahub'],['novaia-assistant','novaformation'],
  ['novaia-assistant','novaiaweb'],['novahub','novamemory'],['novahub','journal'],
  ['novabu','novaformation'],['novabu','parcours'],
];

export function atlasQuality({width=1200,height=760,dpr=1,coarse=false,cores=8,memory=8,saveData=false}={}) {
  const mobile=coarse||width<700||cores<=4||memory<=4;
  const maxPixels=mobile?1450000:3200000;
  return {
    enabled:!saveData&&cores>1&&memory>1,
    mobile,
    fps:mobile?30:60,
    pixelRatio:Math.min(Math.max(.65,dpr),mobile?1.5:2,Math.sqrt(maxPixels/Math.max(1,width*height))),
    segments:mobile?44:68,
    maxPixels,
  };
}

export function atlasThreads(points) {
  const byId=new Map(points.map((point,index)=>[NORMAL_IDS[point.id]||point.id,{...point,index}]));
  const links=[];const keys=new Set();const connected=new Set();
  const add=(a,b)=>{
    if(!a||!b||a.index===b.index)return;
    const key=[a.index,b.index].sort((x,y)=>x-y).join(':');
    if(keys.has(key))return;
    keys.add(key);links.push([a.index,b.index]);connected.add(a.index);connected.add(b.index);
  };
  for(const [a,b]of THREADS)add(byId.get(a),byId.get(b));
  // Future creations remain connected without prescribing a new layout.
  for(let index=0;index<points.length;index++)if(!connected.has(index)&&points.length>1){
    const p=points[index];let nearest=-1,distance=Infinity;
    for(let other=0;other<points.length;other++)if(other!==index){const q=points[other],d=(p.x-q.x)**2+(p.y-q.y)**2;if(d<distance){distance=d;nearest=other}}
    if(nearest>=0)add({...p,index},{...points[nearest],index:nearest});
  }
  return links;
}

/** Connect to the visible artifact, rather than the caption below its link. */
export function atlasNodePoint(node,containerRect,index=0) {
  const anchor=node.querySelector?.('[data-atlas-anchor]');
  const anchorRect=anchor?.getBoundingClientRect();
  const r=anchorRect?.width>0&&anchorRect?.height>0?anchorRect:node.getBoundingClientRect();
  return {id:node.dataset.atlasNode||String(index),x:(r.left+r.width/2-containerRect.left)/containerRect.width,y:(r.top+r.height/2-containerRect.top)/containerRect.height};
}

/** Tessellated ribbons with CSS-pixel widths independent of map aspect ratio. */
export function atlasRibbonData(points,links,{width,height,lineWidth=2,segments=64}={}) {
  if(!(width>0&&height>0))throw new RangeError('Positive map dimensions required');
  const positions=[],progress=[],edges=[],seeds=[],mapPoints=[],indices=[];
  for(let link=0;link<links.length;link++){
    const [ai,bi]=links[link],a=points[ai],b=points[bi];
    if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))continue;
    const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy);
    if(distance<.00001)continue;
    const bend=Math.min(.12,distance*.16)*(link%2?-1:1);
    const cx=(a.x+b.x)/2-dy/distance*bend,cy=(a.y+b.y)/2+dx/distance*bend;
    const offset=positions.length/3;
    for(let step=0;step<=segments;step++){
      const t=step/segments,s=1-t;
      const x=s*s*a.x+2*s*t*cx+t*t*b.x,y=s*s*a.y+2*s*t*cy+t*t*b.y;
      const tx=2*s*(cx-a.x)+2*t*(b.x-cx),ty=2*s*(cy-a.y)+2*t*(b.y-cy);
      const length=Math.hypot(tx*width,ty*height)||1;
      const nx=-ty*height/length,ny=tx*width/length;
      for(const side of [-1,1]){
        positions.push((x+nx*lineWidth/2/width*side)*2-1,1-(y+ny*lineWidth/2/height*side)*2,0);
        progress.push(t);edges.push(side);seeds.push(link*.137);mapPoints.push(x,y);
      }
      if(step<segments){const i=offset+step*2;indices.push(i,i+1,i+2,i+1,i+3,i+2)}
    }
  }
  return {positions:new Float32Array(positions),progress:new Float32Array(progress),edges:new Float32Array(edges),seeds:new Float32Array(seeds),mapPoints:new Float32Array(mapPoints),indices:new Uint32Array(indices)};
}

export async function initAtlasGPU({canvas,container,nodes,signal,forceWebGL=false}={}) {
  if(!canvas||!container)return staticController();
  ACTIVE.get(canvas)?.dispose();
  const doc=canvas.ownerDocument,win=doc.defaultView;
  if(!win)return staticController();
  const motionQuery=win.matchMedia('(prefers-reduced-motion: reduce)');
  const coarseQuery=win.matchMedia('(pointer: coarse)');
  const size=()=>container.getBoundingClientRect();
  const initial=size();
  const initialQuality=atlasQuality({width:initial.width,height:initial.height,dpr:win.devicePixelRatio,coarse:coarseQuery.matches,cores:win.navigator.hardwareConcurrency||4,memory:win.navigator.deviceMemory||8,saveData:win.navigator.connection?.saveData||false});
  let disposed=false,failed=false,renderer,scene,camera,terrain,routeCore,routeGlow,THREE,TSL;
  let frame=0,resizeFrame=0,lastFrame=0,elapsed=0,visible=true,motionRequested=true,ready=false,renderedFrames=0;
  let points=[],nodeElements=[],quality=initialQuality,resizeObserver,intersectionObserver;
  let device,deviceErrorHandler,gpuCleaned=false;
  const listeners=[],nodeListeners=[];
  const targetPointer={x:.55,y:.45},targetFocus={x:.5,y:.5,amount:0};
  const actualPointer={x:.55,y:.45};
  let focusAmount=0;
  let uniforms;
  container.dataset.renderer='static';canvas.dataset.renderer='static';
  container.dataset.gpuFrames='0';canvas.dataset.gpuFrames='0';
  container.classList.remove('gpu-ready');

  function publishFrames(force=false){
    if(!force&&renderedFrames%10!==0)return;
    container.dataset.gpuFrames=String(renderedFrames);canvas.dataset.gpuFrames=String(renderedFrames);
  }

  function setMode(mode,reason=''){
    container.dataset.renderer=mode;canvas.dataset.renderer=mode;
    if(reason)container.dataset.gpuFallback=reason;else delete container.dataset.gpuFallback;
    container.dispatchEvent(new win.CustomEvent('atlas:renderer',{bubbles:true,detail:{mode,reason}}));
  }
  function diagnostic(error){
    // Local, bounded developer evidence; never injected into visible content.
    container.dataset.gpuError=String(error?.message||error||'').slice(0,240);
  }
  function listen(target,type,handler,options){target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options))}
  function cancel(){if(frame)win.cancelAnimationFrame(frame);frame=0;lastFrame=0}
  function canAnimate(){return ready&&!disposed&&!failed&&visible&&!doc.hidden&&motionRequested&&!motionQuery.matches}
  function cleanupGPU(force=false){
    if(gpuCleaned&&!force)return;gpuCleaned=true;
    try{if(device&&deviceErrorHandler)device.removeEventListener('uncapturederror',deviceErrorHandler)}catch{}
    for(const item of [terrain,routeCore,routeGlow]){try{item?.geometry?.dispose();item?.material?.dispose()}catch{}}
    try{scene?.clear();renderer?.dispose()}catch{}
  }
  function dispose(){
    if(disposed)return;disposed=true;cancel();if(resizeFrame)win.cancelAnimationFrame(resizeFrame);
    resizeObserver?.disconnect();intersectionObserver?.disconnect();
    for(const remove of listeners.splice(0))remove();for(const remove of nodeListeners.splice(0))remove();
    publishFrames(true);controller.mode='static';container.classList.remove('gpu-ready');setMode('static');cleanupGPU();
    if(ACTIVE.get(canvas)===controller)ACTIVE.delete(canvas);
  }
  function fallback(reason){
    if(disposed||failed)return;failed=true;ready=false;cancel();
    publishFrames(true);controller.mode='static';container.classList.remove('gpu-ready');setMode('static',reason);cleanupGPU();
  }
  function motionChanged(){
    cancel();if(!ready||failed||disposed)return;
    if(motionQuery.matches){elapsed=0;uniforms.time.value=0;focusAmount=targetFocus.amount;uniforms.focusStrength.value=focusAmount}
    draw();publishFrames(true);if(canAnimate())frame=win.requestAnimationFrame(tick);
  }
  function setMotion(enabled){motionRequested=!!enabled;motionChanged()}
  const controller={dispose,setMotion,refreshLayout,mode:'static'};
  ACTIVE.set(canvas,controller);
  if(signal?.aborted){dispose();return controller}
  if(signal)listen(signal,'abort',dispose,{once:true});
  if(!initialQuality.enabled||!(initial.width>0&&initial.height>0)){setMode('static',initialQuality.enabled?'unmeasured':'data-or-device-budget');return controller}

  try{
    [THREE,TSL]=await Promise.all([import('three/webgpu'),import('three/tsl')]);
    if(disposed||!canvas.isConnected){dispose();return controller}
    const {Fn,uv,vec2,vec3,float,color,uniform,sin,cos,fract,abs,exp,smoothstep,mix,length,min,max,attribute}=TSL;
    uniforms={time:uniform(0),resolution:uniform(new THREE.Vector2(initial.width,initial.height)),pointer:uniform(new THREE.Vector2(.55,.45)),focus:uniform(new THREE.Vector2(.5,.5)),focusStrength:uniform(0),accent:uniform(new THREE.Color('#c94c2b'))};
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=2;
    renderer=new THREE.WebGPURenderer({canvas,alpha:true,antialias:false,forceWebGL:!!forceWebGL,powerPreference:initialQuality.mobile?'low-power':'high-performance'});
    renderer.setClearColor(0xe9eff2,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
    await renderer.init();
    if(disposed||!canvas.isConnected){dispose();cleanupGPU(true);return controller}
    device=renderer.backend?.device;
    if(device){
      deviceErrorHandler=event=>{diagnostic(event.error);fallback('gpu-validation')};device.addEventListener('uncapturederror',deviceErrorHandler);
      device.lost.then(info=>{if(!disposed&&info.reason!=='destroyed')fallback('device-lost')}).catch(()=>fallback('device-lost'));
    }
    const material=new THREE.MeshBasicNodeMaterial({depthTest:false,depthWrite:false,transparent:true,toneMapped:false});
    material.colorNode=Fn(()=>{
      const raw=uv();const p=vec2(raw.x,float(1).sub(raw.y));
      const aspect=uniforms.resolution.x.div(uniforms.resolution.y);
      const pointerDistance=length(vec2(p.x.sub(uniforms.pointer.x).mul(aspect),p.y.sub(uniforms.pointer.y)));
      const pressure=exp(pointerDistance.mul(pointerDistance).mul(-8));
      const flow=uniforms.time.mul(.045);
      const wave=sin(p.y.mul(5.8).sub(p.x.mul(2.8)).add(flow)).mul(.1).add(cos(p.x.mul(7.2).add(p.y.mul(2.3)).sub(flow.mul(.55))).mul(.035));
      const field=p.x.mul(.78).add(p.y.mul(.43)).add(wave).add(pressure.mul(.012));
      const bandA=float(1).sub(smoothstep(.075,.19,abs(field.sub(.65))));
      const bandB=float(1).sub(smoothstep(.025,.09,abs(field.sub(.92))));
      const contourDistance=min(fract(field.mul(25)),float(1).sub(fract(field.mul(25))));
      const contour=float(1).sub(smoothstep(.008,.043,contourDistance)).mul(.075);
      const grid=fract(p.mul(uniforms.resolution).div(42));
      const gridDistance=min(min(grid.x,float(1).sub(grid.x)),min(grid.y,float(1).sub(grid.y)));
      const gridLine=float(1).sub(smoothstep(.005,.021,gridDistance)).mul(.15);
      const paper=fract(sin(p.mul(uniforms.resolution).dot(vec2(12.9898,78.233))).mul(43758.5453)).sub(.5).mul(.005);
      let surface=mix(color('#e9eff2'),color('#d3ded6'),bandA.mul(.62));
      surface=mix(surface,color('#d4dee8'),bandB.mul(.65));
      surface=mix(surface,color('#8ba2a5'),max(gridLine,contour));
      const fd=length(vec2(p.x.sub(uniforms.focus.x).mul(aspect),p.y.sub(uniforms.focus.y)));
      const glow=exp(fd.mul(fd).mul(-90)).mul(uniforms.focusStrength);
      const expanding=float(.028).add(fract(uniforms.time.mul(.085)).mul(.095));
      const ring=float(1).sub(smoothstep(.0015,.005,abs(fd.sub(expanding)))).mul(uniforms.focusStrength).mul(.1).mul(float(1).sub(fract(uniforms.time.mul(.085))));
      surface=mix(surface,color('#f5f0db'),glow.mul(.2));
      surface=mix(surface,uniforms.accent,ring);
      return surface.add(vec3(paper));
    })();
    material.opacityNode=float(.99);
    terrain=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);terrain.renderOrder=0;scene.add(terrain);

    function routeMaterial(glow=false){
      const m=new THREE.MeshBasicNodeMaterial({depthTest:false,depthWrite:false,transparent:true,toneMapped:false,side:THREE.DoubleSide});
      const progress=attribute('atlasProgress','float'),edge=attribute('atlasEdge','float'),seed=attribute('atlasSeed','float'),point=attribute('atlasPoint','vec2');
      const focused=exp(length(point.sub(uniforms.focus)).pow(2).mul(-16)).mul(uniforms.focusStrength);
      const phase=fract(progress.sub(uniforms.time.mul(.045)).add(seed));
      const comet=exp(phase.sub(.18).pow(2).mul(-1400));
      const dash=float(1).sub(smoothstep(.62,.75,fract(progress.mul(25).sub(uniforms.time.mul(.09)).add(seed))));
      const softEdge=float(1).sub(smoothstep(glow?.05:.28,1,abs(edge)));
      m.colorNode=mix(color('#718e94'),uniforms.accent,comet.mul(.6).add(focused.mul(.45)));
      m.opacityNode=softEdge.mul(glow?comet.mul(.12).add(focused.mul(.045)):dash.mul(.25).add(comet.mul(.6)).add(focused.mul(.22)));
      return m;
    }
    routeCore=new THREE.Mesh(new THREE.BufferGeometry(),routeMaterial());routeCore.renderOrder=3;scene.add(routeCore);
    routeGlow=new THREE.Mesh(new THREE.BufferGeometry(),routeMaterial(true));routeGlow.renderOrder=2;scene.add(routeGlow);
    refreshLayout(nodes);
    await renderer.compileAsync(scene,camera);
    if(disposed||failed||!canvas.isConnected){dispose();cleanupGPU(true);return controller}
    renderer.render(scene,camera);
    if(device?.queue?.onSubmittedWorkDone)await device.queue.onSubmittedWorkDone();
    if(disposed||failed||!canvas.isConnected){dispose();cleanupGPU(true);return controller}
    renderedFrames++;publishFrames(true);
    ready=true;controller.mode=renderer.backend?.isWebGPUBackend?'webgpu':'webgl2';
    setMode(controller.mode);container.classList.add('gpu-ready');
    listen(container,'pointermove',event=>{const r=size();targetPointer.x=(event.clientX-r.left)/r.width;targetPointer.y=(event.clientY-r.top)/r.height;if(!canAnimate())draw()},{passive:true});
    listen(container,'pointerleave',()=>{targetPointer.x=.55;targetPointer.y=.45;targetFocus.amount=0;if(!canAnimate())draw()},{passive:true});
    listen(doc,'visibilitychange',motionChanged);
    listen(motionQuery,'change',motionChanged);
    listen(doc,'atlas:motion',event=>setMotion(event.detail?.enabled!==false));
    listen(container,'atlas:layout',()=>refreshLayout());
    resizeObserver=new win.ResizeObserver(()=>{
      if(resizeFrame)win.cancelAnimationFrame(resizeFrame);
      resizeFrame=win.requestAnimationFrame(()=>{resizeFrame=0;refreshLayout();if(!canAnimate())draw()});
    });resizeObserver.observe(container);
    intersectionObserver=new win.IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;motionChanged()},{rootMargin:'0px'});intersectionObserver.observe(container);
    motionChanged();
  }catch(error){diagnostic(error);if(disposed)cleanupGPU(true);else fallback(error?.name==='NotSupportedError'?'not-supported':'initialization');controller.mode='static'}
  return controller;

  function refreshLayout(nextNodes){
    if(disposed||failed||!renderer||!uniforms||!routeCore)return;
    const rect=size();if(!(rect.width>0&&rect.height>0))return;
    quality=atlasQuality({width:rect.width,height:rect.height,dpr:win.devicePixelRatio,coarse:coarseQuery.matches,cores:win.navigator.hardwareConcurrency||4,memory:win.navigator.deviceMemory||8,saveData:false});
    renderer.setPixelRatio(quality.pixelRatio);renderer.setSize(rect.width,rect.height,false);uniforms.resolution.value.set(rect.width,rect.height);
    nodeElements=[...(nextNodes||container.querySelectorAll('[data-atlas-node]'))].filter(node=>node.getClientRects().length);
    points=nodeElements.map((node,index)=>atlasNodePoint(node,rect,index));
    const links=atlasThreads(points);
    const rebuild=(mesh,lineWidth)=>{
      const data=atlasRibbonData(points,links,{width:rect.width,height:rect.height,lineWidth,segments:quality.segments});
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('atlasProgress',new THREE.BufferAttribute(data.progress,1));geometry.setAttribute('atlasEdge',new THREE.BufferAttribute(data.edges,1));geometry.setAttribute('atlasSeed',new THREE.BufferAttribute(data.seeds,1));geometry.setAttribute('atlasPoint',new THREE.BufferAttribute(data.mapPoints,2));geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
      mesh.geometry.dispose();mesh.geometry=geometry;mesh.frustumCulled=false;
    };
    rebuild(routeCore,quality.mobile?1.7:1.9);rebuild(routeGlow,quality.mobile?7:10);
    for(const remove of nodeListeners.splice(0))remove();
    nodeElements.forEach((node,index)=>{
      const enter=()=>{const p=points[index];targetFocus.x=p.x;targetFocus.y=p.y;targetFocus.amount=1;const accent=win.getComputedStyle(node).getPropertyValue('--node-accent').trim();try{uniforms.accent.value.set(accent||'#c94c2b')}catch{}if(!canAnimate())draw()};
      const leave=()=>{targetFocus.amount=0;if(!canAnimate())draw()};
      for(const [type,handler]of [['pointerenter',enter],['focus',enter],['pointerleave',leave],['blur',leave]]){node.addEventListener(type,handler);nodeListeners.push(()=>node.removeEventListener(type,handler))}
    });
    if(ready&&!canAnimate())draw();
  }
  function draw(){
    if(!renderer||!uniforms||disposed||failed||doc.hidden||!visible)return;
    try{
      const animated=canAnimate();
      if(!animated){actualPointer.x=targetPointer.x;actualPointer.y=targetPointer.y;focusAmount=targetFocus.amount}
      uniforms.pointer.value.set(actualPointer.x,actualPointer.y);uniforms.focus.value.set(targetFocus.x,targetFocus.y);uniforms.focusStrength.value=focusAmount;
      renderer.render(scene,camera);
      renderedFrames++;publishFrames();
    }catch(error){diagnostic(error);fallback('render')}
  }
  function tick(now){
    frame=0;if(!canAnimate())return;
    if(lastFrame&&now-lastFrame<1000/quality.fps-1){frame=win.requestAnimationFrame(tick);return}
    const delta=lastFrame?Math.min((now-lastFrame)/1000,.08):0;lastFrame=now;elapsed+=delta;
    uniforms.time.value=elapsed;
    actualPointer.x+=(targetPointer.x-actualPointer.x)*.065;actualPointer.y+=(targetPointer.y-actualPointer.y)*.065;focusAmount+=(targetFocus.amount-focusAmount)*.09;
    draw();if(canAnimate())frame=win.requestAnimationFrame(tick);
  }
}

function staticController(){return{mode:'static',dispose(){},setMotion(){},refreshLayout(){}}}
