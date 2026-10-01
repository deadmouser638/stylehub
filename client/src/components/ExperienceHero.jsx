import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './ExperienceHero.css';
const scenes = [
  { label: 'Laptops', word: 'possibility.', title: 'Make room for', category: 'Laptops', color: '#c8fc60', kind: 'laptop', note: 'Power for your next big idea.', spec: 'WORK. PLAY. CREATE.' },
  { label: 'Mobiles', word: 'connection.', title: 'A little more', category: 'Mobiles', color: '#b9b0ff', kind: 'phone', note: 'Your whole world. Beautifully connected.', spec: 'CAPTURE. CONNECT. EXPLORE.' },
  { label: 'Accessories', word: 'immersion.', title: 'Find your', category: 'Accessories', color: '#ffba87', kind: 'audio', note: 'Small details. A different experience.', spec: 'LISTEN. FOCUS. FEEL.' },
];
function Device({ kind }) {
 if (kind === 'phone') return <div className="eh-phone"><div className="eh-screen"><i/><span>09:41</span><small>Make it yours.</small></div></div>;
 if (kind === 'audio') return <div className="eh-headphones"><div className="eh-band"/><div className="eh-ear eh-left"/><div className="eh-ear eh-right"/></div>;
 return <div className="eh-laptop"><div className="eh-lid"><div className="eh-screen"><i/><span>Beyond<br/>ordinary.</span></div></div><div className="eh-keyboard"/></div>;
}
export default function ExperienceHero() {
 const [active, setActive] = useState(0);
 const scene = scenes[active];
 const move = delta => setActive(v => (v + delta + scenes.length) % scenes.length);
 function tilt(e) { if (e.pointerType === 'touch') return; const r=e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--rx', `${-(e.clientY-r.top-r.height/2)/32}deg`); e.currentTarget.style.setProperty('--ry', `${(e.clientX-r.left-r.width/2)/32}deg`); }
 return <section className="eh-experience" style={{'--scene': scene.color}} aria-label="Discover ElectroHub">
  <div className="eh-topline"><span><b/> THE NEXT EVERYDAY</span><span>CURATED TECH / EXTRAORDINARY POSSIBILITIES</span></div>
  <div className="eh-stage">
   <div className="eh-copy" key={scene.word}><p className="eh-kicker">A BETTER KIND OF UPGRADE</p><h1>{scene.title}<br/><em>{scene.word}</em></h1><p className="eh-description">Thoughtfully selected tech.<br/>For everything you want to do next.</p><Link className="eh-cta" to={`/products/${scene.category}`}>Explore {scene.label.toLowerCase()} <ArrowUpRight size={21}/></Link></div>
   <div className="eh-art" onPointerMove={tilt} onPointerLeave={e=>{e.currentTarget.style.setProperty('--rx','0deg');e.currentTarget.style.setProperty('--ry','0deg');}}>
    <div className="eh-orbit"/><span className="eh-watermark">e.</span><div key={scene.kind} className="eh-device-wrap"><Device kind={scene.kind}/></div><div className="eh-art-caption"><span>{scene.spec}</span><span>0{active+1} / 03</span></div>
   </div>
  </div>
  <div className="eh-bottom"><div className="eh-tabs" role="tablist" aria-label="Featured collections">{scenes.map((s,i)=><button role="tab" aria-selected={i===active} key={s.label} onClick={()=>setActive(i)}><span>0{i+1}</span>{s.label}<ArrowUpRight size={16}/></button>)}</div><div className="eh-controls"><button aria-label="Previous collection" onClick={()=>move(-1)}><ChevronLeft size={20}/></button><button aria-label="Next collection" onClick={()=>move(1)}><ChevronRight size={20}/></button></div><a href="#collections" className="eh-scroll">SCROLL TO EXPLORE <ArrowDown size={17}/></a></div>
 </section>;
}
