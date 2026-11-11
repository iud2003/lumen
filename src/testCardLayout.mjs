export function testCardLayout(width,height){
 const portrait=width/height<1.3,u=Math.min(width,height),cx=width/2,cy=height*(portrait?.43:.48);
 const panelWidth=portrait?width*.8:Math.min(width*.46,height*2.1),panelHeight=Math.min(height*.36,u*.48);
 const panel={x:cx-panelWidth/2,y:cy-panelHeight/2,width:panelWidth,height:panelHeight};
 const stripWidth=portrait?width*.38:Math.min(width*.14,height*.34),stripHeight=portrait?height*.17:height*.56;
 const stripY=portrait?height*.75:cy-stripHeight/2;
 return {width,height,portrait,u,cx,cy,panel,
  chroma:{x:width*.06,y:stripY,width:stripWidth,height:stripHeight},
  luma:{x:portrait?width*.56:width*.94-stripWidth,y:stripY,width:stripWidth,height:stripHeight},
  radius:Math.min(width*(portrait?.4:.27),height*(portrait?.255:.4)),
  cell:Math.max(8,Math.round(Math.min(width/24,height/14))),
  small:Math.max(7,Math.min(20,u*.019)),
  resolutionFont:Math.max(12,Math.min(height*.13,panelWidth*.135)),
  clockFont:Math.max(9,Math.min(36,u*.035)),
 };
}
export function aspectLabel(width,height){let a=width,b=height;while(b){const remainder=a%b;a=b;b=remainder}return `${width/a}:${height/a}`}
