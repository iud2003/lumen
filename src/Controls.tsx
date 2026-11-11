import React,{useEffect,useRef,useState} from 'react';
export function NumberField({label,value,min=-100000,max=100000,step=1,onChange}:{label:string;value:number;min?:number;max?:number;step?:number;onChange:(v:number)=>void}){
 const [draft,setDraft]=useState(String(value)),editing=useRef(false),sent=useRef(value);
 useEffect(()=>{if(!editing.current){setDraft(String(value));sent.current=value}},[value]);
 function emit(value:number){if(sent.current!==value){sent.current=value;onChange(value)}}
 return <label className="number-field"><span>{label}</span><input aria-label={label} type="number" min={min} max={max} step={step} value={draft} onFocus={()=>{editing.current=true}} onChange={e=>{const text=e.target.value;setDraft(text);const n=Number(text);if(text&&Number.isFinite(n)&&n>=min&&n<=max)emit(n)}} onBlur={e=>{editing.current=false;const text=e.currentTarget.value,n=Number(text);if(!text||!Number.isFinite(n)){setDraft(String(value));return}const result=Math.min(max,Math.max(min,n));setDraft(String(result));emit(result)}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></label>;
}
export function Slider({label,value,min=0,max=1,step=.01,onChange,format=(v:number)=>Math.round(v*100)+'%'}:{label:string;value:number;min?:number;max?:number;step?:number;onChange:(v:number)=>void;format?:(v:number)=>string}){
 const [draft,setDraft]=useState(value),editing=useRef(false),sent=useRef(value);useEffect(()=>{if(!editing.current){setDraft(value);sent.current=value}},[value]);
 function emit(n:number){setDraft(n);if(sent.current!==n){sent.current=n;onChange(n)}}
 return <label className="studio-slider"><span>{label}<output>{format(draft)}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={draft} onPointerDown={()=>{editing.current=true}} onKeyDown={()=>{editing.current=true}} onChange={e=>emit(+e.target.value)} onPointerUp={e=>{editing.current=false;emit(+e.currentTarget.value)}} onKeyUp={e=>{editing.current=false;emit(+e.currentTarget.value)}} onBlur={e=>{editing.current=false;emit(+e.currentTarget.value)}} style={{'--fill':(draft-min)/(max-min)*100+'%'} as React.CSSProperties}/></label>;
}
