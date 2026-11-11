export {};
declare global {
 interface Window {
  lumenDesktop?:{
   onStateChange:(callback:(show:import('./types').Show)=>void)=>()=>void;
   openOutput:(showId:string)=>Promise<{playerId:string;displayId:number}>;
   closeOutput:()=>Promise<void>;
   isOutput:boolean;
  };
 }
}
