export type Asset={id:string;name:string;kind:'video'|'image';url:string;size?:number};
export type Layer={id:string;name:string;clip:string|null;slots:(string|null)[];opacity:number;x:number;y:number;scale:number;fit:'contain'|'cover';loop:boolean;muted:boolean;volume:number;paused:boolean;restart:number};
export type Composition={layers:Layer[];blackout:boolean;width:number;height:number;fade:number};
export type ShowState={assets:Asset[];cue:Composition;live:Composition;take:number};
export type Show={id:string;name:string;state:ShowState;version:number};
export type Report={ready?:string[];downloading?:string[];errors?:Record<string,string>;live?:string[];take?:number;output?:boolean;at?:number};
export type Player={id:string;heartbeat:number;report:Report};
