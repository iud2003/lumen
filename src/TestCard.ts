import {aspectLabel,testCardLayout} from './testCardLayout.mjs';
type Layout=ReturnType<typeof testCardLayout>;
const cyan='#83f0ed',white='#f2f5f7',ink='#11191e';
const cache=new WeakMap<CanvasRenderingContext2D,{width:number;height:number;canvas:HTMLCanvasElement;layout:Layout}>();
const clockFormat=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Colombo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});

function font(ctx:CanvasRenderingContext2D,size:number,weight=500,mono=false){ctx.font=`${weight} ${Math.max(6,size)}px ${mono?'Consolas, "Courier New", monospace':'"Segoe UI", Arial, sans-serif'}`}
function line(ctx:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,color:string,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number,color=white,align:CanvasTextAlign='left',mono=false,weight=500){font(ctx,size,weight,mono);ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y)}
function fitText(ctx:CanvasRenderingContext2D,value:string,maxWidth:number,size:number){font(ctx,size,700,true);while(ctx.measureText(value).width>maxWidth&&size>6){size-=.5;font(ctx,size,700,true)}return size}

function staticCard(ctx:CanvasRenderingContext2D,l:Layout){
 const {width:w,height:h,u,cx,cy,panel:p}=l;
 ctx.fillStyle='#858a90';ctx.fillRect(0,0,w,h);
 const gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#edf0f1');gradient.addColorStop(.48,'#747b82');gradient.addColorStop(1,'#20282f');
 ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
 const lower=ctx.createLinearGradient(0,h,w,h*.15);lower.addColorStop(0,'#20282f');lower.addColorStop(.55,'#788087');lower.addColorStop(1,'#eef1f2');ctx.fillStyle=lower;ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(w,0);ctx.lineTo(w,h);ctx.closePath();ctx.fill();
 // Grid lines are spaced in actual canvas pixels, not scaled screen units.
 for(let i=-Math.ceil(w/l.cell);i<=Math.ceil(w/l.cell);i++){const x=Math.round(cx+i*l.cell)+.5;line(ctx,x,0,x,h,i%4===0?'#10191fa0':'#10191f68',i%4===0?1.6:1)}
 for(let i=-Math.ceil(h/l.cell);i<=Math.ceil(h/l.cell);i++){const y=Math.round(cy+i*l.cell)+.5;line(ctx,0,y,w,y,i%4===0?'#10191fa0':'#10191f68',i%4===0?1.6:1)}
 line(ctx,0,0,w,h,'#fff9',Math.max(1,u*.0012));line(ctx,w,0,0,h,'#fff9',Math.max(1,u*.0012));
 ctx.setLineDash([Math.max(3,u*.009),Math.max(3,u*.007)]);line(ctx,cx,0,cx,h,'#e4ffffaa',Math.max(1,u*.001));line(ctx,0,cy,w,cy,'#e4ffffaa',Math.max(1,u*.001));
 ctx.strokeStyle='#e6feff75';ctx.lineWidth=Math.max(1,u*.001);ctx.strokeRect(w*.05,h*.05,w*.9,h*.9);ctx.setLineDash([]);
 ctx.beginPath();ctx.arc(cx,cy,l.radius,0,Math.PI*2);ctx.strokeStyle=white;ctx.lineWidth=Math.max(1,u*.0016);ctx.stroke();
 ctx.beginPath();ctx.arc(cx,cy,l.radius*.985,0,Math.PI*2);ctx.strokeStyle='#111c';ctx.lineWidth=Math.max(1,u*.001);ctx.stroke();
 for(let i=0;i<4;i++){const angle=i*Math.PI/2,x=cx+Math.cos(angle)*l.radius,y=cy+Math.sin(angle)*l.radius;ctx.fillStyle=cyan;ctx.fillRect(x-u*.004,y-u*.004,u*.008,u*.008)}
 const edge=Math.max(1,Math.round(u*.002));ctx.strokeStyle='#10171d';ctx.lineWidth=edge*2;ctx.strokeRect(edge,edge,w-edge*2,h-edge*2);ctx.strokeStyle='#f4f7f8';ctx.lineWidth=1;ctx.strokeRect(edge+.5,edge+.5,w-edge*2-1,h-edge*2-1);
 const arm=Math.max(12,u*.055),inset=Math.max(3,u*.007);for(const [x,y,dx,dy] of [[inset,inset,1,1],[w-inset,inset,-1,1],[inset,h-inset,1,-1],[w-inset,h-inset,-1,-1]]){line(ctx,x,y,x+arm*dx,y,cyan,Math.max(2,u*.003));line(ctx,x,y,x,y+arm*dy,cyan,Math.max(2,u*.003))}
 const cornerFont=l.small*.72;const corners=[{x:w*.025,y:h*.032,label:'TL  0,0',align:'left'},{x:w*.975,y:h*.032,label:`TR  ${w-1},0`,align:'right'},{x:w*.025,y:h*.98,label:`BL  0,${h-1}`,align:'left'},{x:w*.975,y:h*.98,label:`BR  ${w-1},${h-1}`,align:'right'}] as const;
 for(const c of corners){font(ctx,cornerFont,600,true);const tw=ctx.measureText(c.label).width;ctx.fillStyle='#10191ddd';ctx.fillRect(c.align==='right'?c.x-tw-u*.008:c.x-u*.008,c.y-cornerFont*1.1,tw+u*.016,cornerFont*1.5);text(ctx,c.label,c.x,c.y,cornerFont,cyan,c.align,true)}
 // Instrument markings remain visible around the central readout.
 const unit=Math.max(1,u/600);
 ctx.fillStyle='#08131be8';ctx.fillRect(w*.17,h*.065,w*.66,h*.07);
 text(ctx,'L U M E N   /   VECTOR LAB',cx,h*.094,l.small*1.2,white,'center',true,700);
 text(ctx,'SIGNAL ALIGNMENT SYSTEM     •     CALIBRATION MATRIX / 02',cx,h*.12,l.small*.55,cyan,'center',true);
 // Pixel rulers: short ticks at every division, numbered major divisions.
 for(let i=0;i<=40;i++){
  const x=w*i/40,y=h*i/40,major=i%5===0,len=u*(major?.021:.009);
  line(ctx,x,h*.045,x,h*.045+len,'#10242c',major?2:1);
  line(ctx,x,h*.955,x,h*.955-len,'#10242c',major?2:1);
  line(ctx,w*.025,y,w*.025+len,y,'#10242c',major?2:1);
  line(ctx,w*.975,y,w*.975-len,y,'#10242c',major?2:1);
  if(major&&i>0&&i<40){text(ctx,String(Math.round(w*i/40)),x,h*.04,l.small*.48,ink,'center',true);text(ctx,String(Math.round(h*i/40)),w*.026+len,y+l.small*.18,l.small*.48,ink,'left',true)}
 }
 // Numbered zones reveal swapped processors, scaling and orientation errors.
 for(let row=0;row<4;row++)for(let col=0;col<8;col++){
  const x=w*(col+.5)/8,y=h*(row+.5)/4;
  ctx.globalAlpha=.17;text(ctx,`${String.fromCharCode(65+row)}${col+1}`,x,y,l.small*2.5,white,'center',true,700);ctx.globalAlpha=1;
 }
 // Polar scale: true circles and angular ticks expose geometric distortion.
 for(const factor of [.68,.87,1.04]){ctx.beginPath();ctx.arc(cx,cy,l.radius*factor,0,Math.PI*2);ctx.strokeStyle=factor===.87?'#83f0edaa':'#172b3380';ctx.lineWidth=Math.max(1,unit);ctx.stroke()}
 for(let deg=0;deg<360;deg+=5){const angle=deg*Math.PI/180,r=l.radius*(deg%30===0?1.07:1.025),end=l.radius*1.095;line(ctx,cx+Math.cos(angle)*r,cy+Math.sin(angle)*r,cx+Math.cos(angle)*end,cy+Math.sin(angle)*end,deg%30===0?cyan:'#e7ffff99',deg%30===0?2:1)}
 // Registration targets in four quadrants: independent R/G/B fringes.
 for(const [x,y] of [[w*.29,h*.22],[w*.71,h*.22],[w*.29,h*.77],[w*.71,h*.77]]){
  const r=u*.043;
  for(const [offset,color] of [[-unit,'#ff5b72'],[0,'#72ffd6'],[unit,'#5c9dff']] as const){ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,unit*.7);ctx.strokeRect(x-r+offset,y-r,r*2,r*2);line(ctx,x-r*1.4+offset,y,x+r*1.4+offset,y,color,unit*.7);line(ctx,x+offset,y-r*1.4,x+offset,y+r*1.4,color,unit*.7)}
  ctx.beginPath();ctx.arc(x,y,r*.65,0,Math.PI*2);ctx.strokeStyle=white;ctx.stroke();
 }
 // Frequency wedges use exact 1/2/4/8 pixel bars at the output resolution.
 const freqY=h*(l.portrait?.64:.79),freqH=h*.065,freqW=w*.092;
 if(!l.portrait)for(let band=0;band<4;band++){
  const x=Math.round(cx+(band-2)*freqW),period=2**band;
  ctx.fillStyle='#08131b';ctx.fillRect(x-2,freqY-2,freqW+4,freqH+4);
  ctx.save();ctx.beginPath();ctx.rect(x,freqY,freqW-4,freqH);ctx.clip();
  for(let px=0;px<freqW;px+=period){ctx.fillStyle=Math.floor(px/period)%2?'#fff':'#000';ctx.fillRect(x+px,freqY,period,freqH)}ctx.restore();
  text(ctx,`${period} PX / VERTICAL`,x+freqW/2,freqY+freqH+l.small*.9,l.small*.55,ink,'center',true,700);
 }
 // Near-black and near-white steps expose clipping at both ends.
 if(!l.portrait)for(let side=0;side<2;side++){
  const bx=w*(side?.73:.065),by=h*.86,bw=w*.205,bh=h*.045;
  for(let i=0;i<8;i++){const v=side?227+i*4:i*4;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(bx+i*bw/8,by,bw/8+1,bh);text(ctx,String(v),bx+(i+.5)*bw/8,by+bh*.65,l.small*.55,side?'#111':'#eee','center',true)}
  text(ctx,side?'HIGHLIGHT SEPARATION / 227–255':'SHADOW SEPARATION / 0–28',bx,by-l.small*.5,l.small*.6,ink,'left',true,700);
 }
 const a=l.chroma,b=l.luma,padding=Math.max(2,u*.006),label=l.small*.75;
 ctx.fillStyle='#10191eea';ctx.fillRect(a.x-padding,a.y-label*2,a.width+padding*2,a.height+label*2+padding);ctx.fillRect(b.x-padding,b.y-label*2,b.width+padding*2,b.height+label*2+padding);
 const hue=ctx.createLinearGradient(0,a.y,0,a.y+a.height);['#ff3838','#ffef24','#26ff55','#00e5ff','#344dff','#e72fff','#ff384e'].forEach((c,i)=>hue.addColorStop(i/6,c));ctx.fillStyle=hue;ctx.fillRect(a.x,a.y,a.width,a.height);
 ctx.fillStyle='#ffffff28';ctx.fillRect(a.x,a.y,a.width*.25,a.height);ctx.fillStyle='#0003';ctx.fillRect(a.x+a.width*.75,a.y,a.width*.25,a.height);
 for(let i=0;i<=6;i++)line(ctx,a.x,a.y+i*a.height/6,a.x+a.width,a.y+i*a.height/6,'#1119',1);
 line(ctx,a.x+a.width/2,a.y,a.x+a.width/2,a.y+a.height,'#fff5',1);
 const channels=['#ff0000','#00ff00','#0000ff','#00ffff','#ff00ff','#ffff00'],names=['R','G','B','C','M','Y'];
 channels.forEach((color,i)=>{const x=a.x+a.width*i/6;ctx.fillStyle=color;ctx.fillRect(x,a.y+a.height*.925,a.width/6,a.height*.075);text(ctx,names[i],x+a.width/12,a.y+a.height*.985,Math.max(6,label*.7),i===2?white:'#000','center',true,700)});
 text(ctx,'CHROMA / RGB',a.x,a.y-label*.65,label,white,'left',true);
 for(let i=0;i<16;i++){const v=Math.round(i/15*255),y=b.y+i*b.height/16;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(b.x,y,b.width,Math.ceil(b.height/16));if(i%3===0||i===15)text(ctx,String(v).padStart(3,'0'),b.x+b.width*.08,y+b.height/16*.73,Math.min(label,b.height/16*.55),v<130?'#dce3e8':'#25313a','left',true)}
 text(ctx,'LUMA / 16 STEPS',b.x,b.y-label*.65,label,white,'left',true);
 // A separate 1-pixel cadence strip exposes scaling and resampling.
 const stripW=Math.round(w*(l.portrait?.62:.28)),stripX=Math.round(cx-stripW/2),stripY=Math.round(h*(l.portrait?.93:.91)),stripH=Math.max(4,Math.round(u*.011));
 for(let x=0;x<stripW;x++){ctx.fillStyle=x%2?'#fff':'#000';ctx.fillRect(stripX+x,stripY,1,stripH)}
 text(ctx,'1 PX CADENCE  /  CHECK AT NATIVE SCALE',cx,stripY+stripH+l.small*1.3,l.small*.6,ink,'center',true,700);
 // Floating readout leaves the calibration grid and circles visible beneath it.
 ctx.save();ctx.shadowColor='#071018';ctx.shadowBlur=Math.max(2,u*.003);ctx.shadowOffsetY=Math.max(1,u*.001);
 text(ctx,'OUTPUT / 01',p.x+p.width*.035,p.y+p.height*.09,l.small*.5,cyan,'left',true);text(ctx,'VECTOR / 02',p.x+p.width*.965,p.y+p.height*.09,l.small*.5,cyan,'right',true);
 const logoSize=Math.min(p.height*.11,p.width*.055),logoY=p.y+p.height*.18;
 font(ctx,logoSize,700);const brand='LUMEN',brandW=ctx.measureText(brand).width,logoX=cx-brandW/2-logoSize*.7;
 ctx.strokeStyle=cyan;ctx.lineWidth=Math.max(2,logoSize*.12);ctx.beginPath();ctx.moveTo(logoX,logoY-logoSize*.8);ctx.lineTo(logoX,logoY);ctx.lineTo(logoX+logoSize*.4,logoY);ctx.stroke();
 text(ctx,brand,cx+logoSize*.22,logoY,logoSize,white,'center',false,700);
 text(ctx,'CANVAS RESOLUTION',cx,p.y+p.height*.32,l.small*.75,cyan,'center',true,600);
 const resolution=`${w} × ${h}`,resSize=fitText(ctx,resolution,p.width*.88,l.resolutionFont);text(ctx,resolution,cx,p.y+p.height*.62,resSize,white,'center',true,700);
 text(ctx,`${aspectLabel(w,h)} ASPECT  /  ${(w*h/1000000).toFixed(2)} MP`,cx,p.y+p.height*.71,l.small*.76,'#a6bcc8','center',true);
 line(ctx,p.x+p.width*.08,p.y+p.height*.75,p.x+p.width*.92,p.y+p.height*.75,'#6b899b55',1);
 ctx.restore();
}

export function paintTestCard(ctx:CanvasRenderingContext2D,width:number,height:number,now=new Date()){
 let entry=cache.get(ctx);if(!entry||entry.width!==width||entry.height!==height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const layout=testCardLayout(width,height);const drawing=canvas.getContext('2d',{alpha:false});if(!drawing)return;staticCard(drawing,layout);entry={width,height,canvas,layout};cache.set(ctx,entry)}
 const {layout:l}=entry,p=l.panel;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.drawImage(entry.canvas,0,0);
 const clockY=p.y+p.height*.895;const time=clockFormat.format(now);text(ctx,time,l.cx,clockY,Math.min(l.clockFont,p.height*.11),white,'center',true,500);
 text(ctx,'LIVE CLOCK  /  LKT',p.x+p.width*.08,clockY,l.small*.55,'#87a4b6','left',true);
 const phase=now.getMilliseconds()/1000,barW=p.width*.12,barX=p.x+p.width*.8,barY=clockY-l.small*.5;ctx.fillStyle='#3b5362';ctx.fillRect(barX,barY,barW,Math.max(2,l.u*.003));ctx.fillStyle=cyan;ctx.fillRect(barX+phase*(barW-Math.max(3,l.u*.006)),barY,Math.max(3,l.u*.006),Math.max(2,l.u*.003));
 ctx.restore();
}
