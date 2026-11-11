import React from 'react';
import {createRoot} from 'react-dom/client';
import {Studio} from './Studio';
import {Output,Venue} from './Player';
import './style.css';
import './studio.css';
const outputId=new URLSearchParams(location.search).get('output');
createRoot(document.getElementById('root')!).render(outputId?<Output id={outputId}/>:location.hash==='#venue'?<Venue onBack={()=>{location.href='/'}}/>:<Studio/>);
