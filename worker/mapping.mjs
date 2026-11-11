export function mappingIsValid(mapping,width,height){
 if(mapping===undefined)return true;
 const rect=r=>r&&['x','y','width','height'].every(k=>Number.isFinite(r[k]))&&r.x>=0&&r.y>=0&&r.width>=1&&r.height>=1&&r.x+r.width<=width+1&&r.y+r.height<=height+1;
 return !!mapping&&typeof mapping.enabled==='boolean'&&typeof mapping.testPattern==='boolean'&&Array.isArray(mapping.slices)&&mapping.slices.length>=1&&mapping.slices.length<=32&&mapping.slices.every(s=>!!s&&typeof s.id==='string'&&s.id.length<=100&&typeof s.name==='string'&&s.name.length<=100&&typeof s.enabled==='boolean'&&rect(s.input)&&rect(s.output)&&Number.isFinite(s.rotation)&&Math.abs(s.rotation)<=360&&typeof s.flipX==='boolean'&&typeof s.flipY==='boolean')&&new Set(mapping.slices.map(s=>s.id)).size===mapping.slices.length;
}
export function createMapping(width,height,preset='single'){
 let rectangles;
 if(preset==='panels'){const a=Math.floor(width/3),b=Math.floor(width*2/3);rectangles=[{x:0,y:0,width:a,height},{x:a,y:0,width:b-a,height},{x:b,y:0,width:width-b,height}]}
 else if(preset==='grid'){const w=Math.floor(width/2),h=Math.floor(height/2);rectangles=[{x:0,y:0,width:w,height:h},{x:w,y:0,width:width-w,height:h},{x:0,y:h,width:w,height:height-h},{x:w,y:h,width:width-w,height:height-h}]}
 else if(preset==='stage'){const w=Math.floor(width*.2),h=Math.floor(height*.8);rectangles=[{x:w,y:0,width:width-2*w,height:h},{x:0,y:0,width:w,height:h},{x:width-w,y:0,width:w,height:h},{x:0,y:h,width,height:height-h}]}
 else rectangles=[{x:0,y:0,width,height}];
 const names=preset==='stage'?['Main wall','Left wing','Right wing','Stage strip']:rectangles.map((_,i)=>rectangles.length===1?'Main wall':'Panel '+(i+1));
 return {enabled:true,testPattern:false,slices:rectangles.map((r,i)=>({id:globalThis.crypto.randomUUID(),name:names[i],enabled:true,input:{...r},output:{...r},rotation:0,flipX:false,flipY:false}))};
}
