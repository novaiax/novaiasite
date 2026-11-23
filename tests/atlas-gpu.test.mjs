import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasQuality,atlasThreads,atlasNodePoint,atlasRibbonData,initAtlasGPU} from '../js/atlas-gpu.js';

test('route centers follow the artifact anchor, not the whole captioned link',()=>{
 const rect={left:100,top:40,width:1000,height:500};
 const link={dataset:{atlasNode:'novalove'},getBoundingClientRect:()=>({left:300,top:140,width:160,height:180}),querySelector:()=>({getBoundingClientRect:()=>({left:340,top:150,width:80,height:100})})};
 assert.deepEqual(atlasNodePoint(link,rect),{id:'novalove',x:.28,y:.32});
 link.querySelector=()=>null;
 assert.deepEqual(atlasNodePoint(link,rect),{id:'novalove',x:.28,y:.38});
});

test('quality bounds total pixels and uses a lighter mobile frame rate',()=>{
 const desktop=atlasQuality({width:1440,height:900,dpr:3,cores:12,memory:16});
 assert.equal(desktop.fps,60);assert.ok(desktop.pixelRatio<=2);assert.ok(1440*900*desktop.pixelRatio**2<=desktop.maxPixels+1);
 const mobile=atlasQuality({width:390,height:1900,dpr:3,coarse:true,cores:4,memory:4});
 assert.equal(mobile.fps,30);assert.ok(mobile.pixelRatio<=1.5);assert.ok(390*1900*mobile.pixelRatio**2<=mobile.maxPixels+1);
 assert.equal(atlasQuality({saveData:true}).enabled,false);assert.equal(atlasQuality({cores:1}).enabled,false);
});

test('known relations are preserved and a future creation is not isolated',()=>{
 const points=[{id:'parcours',x:.4,y:.5},{id:'novamemory',x:.5,y:.2},{id:'novaformation',x:.7,y:.6},{id:'new-project',x:.9,y:.8}];
 const links=atlasThreads(points);
 assert.ok(links.some(([a,b])=>a===0&&b===1));assert.ok(links.some(([a,b])=>a===1&&b===2));assert.ok(links.some(pair=>pair.includes(3)));
 assert.equal(new Set(links.map(pair=>[...pair].sort().join(':'))).size,links.length);
 assert.deepEqual(atlasThreads([]),[]);assert.deepEqual(atlasThreads([{id:'solo',x:.5,y:.5}]),[]);
});

test('the eleven-node home connects NovaIA, NovaHub and NovaBU to the intended stories',()=>{
 const ids=['parcours','novamemory','novaformation','pratiques','rock-de-strass','novaiaweb','novalove','journal','novahub','novaia-assistant','novabu'];
 const points=ids.map((id,index)=>({id,x:(index%5+.5)/5,y:index<5?.3:.7}));
 const links=atlasThreads(points);
 const connected=(a,b)=>links.some(([x,y])=>(ids[x]===a&&ids[y]===b)||(ids[x]===b&&ids[y]===a));
 for(const neighbor of ['parcours','novamemory','novahub','novaformation','novaiaweb'])assert.ok(connected('novaia-assistant',neighbor),neighbor);
 for(const neighbor of ['novamemory','journal'])assert.ok(connected('novahub',neighbor),neighbor);
 for(const neighbor of ['novaformation','parcours'])assert.ok(connected('novabu',neighbor),neighbor);
 assert.ok(points.every((_,index)=>links.some(pair=>pair.includes(index))));
 assert.ok(links.every(([a,b])=>a>=0&&b>=0&&a<ids.length&&b<ids.length&&a!==b));
 assert.equal(new Set(links.map(pair=>[...pair].sort((a,b)=>a-b).join(':'))).size,links.length);
});

test('ribbons meet their content nodes and retain a constant CSS-pixel width',()=>{
 const points=[{id:'a',x:.2,y:.3},{id:'b',x:.8,y:.7}];
 for(const [width,height]of [[1440,800],[390,1700]]){
  const r=atlasRibbonData(points,[[0,1]],{width,height,lineWidth:2,segments:20});
  assert.equal(r.positions.length,42*3);assert.equal(r.indices.length,20*6);
  assert.ok([...r.positions].every(Number.isFinite));assert.ok([...r.indices].every(i=>i<42));
  for(const v of [0,40]){
   const px=(r.positions[v*3]+r.positions[(v+1)*3])/4+.5;
   const py=.5-(r.positions[v*3+1]+r.positions[(v+1)*3+1])/4;
   const expected=v===0?points[0]:points[1];assert.ok(Math.abs(px-expected.x)<1e-6);assert.ok(Math.abs(py-expected.y)<1e-6);
   const dx=(r.positions[v*3]-r.positions[(v+1)*3])*width/2,dy=(r.positions[v*3+1]-r.positions[(v+1)*3+1])*height/2;
   assert.ok(Math.abs(Math.hypot(dx,dy)-2)<.001);
  }
 }
});

test('empty and unavailable enhancement can never prevent HTML navigation',async()=>{
 const controller=await initAtlasGPU();assert.equal(controller.mode,'static');controller.dispose();controller.setMotion(false);controller.refreshLayout();
 assert.throws(()=>atlasRibbonData([],[],{width:0,height:10}),RangeError);
});
