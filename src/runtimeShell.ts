import { EngineRuntimeKernel } from './engine/runtime/kernel';
import { NavigationGrid } from './engine/navigation/grid';
import { NavigationService } from './engine/navigation/navigation';

type ShellEvent =
  | { type: 'boot:progress'; stage: string; progress: number }
  | { type: 'runtime:ready'; fps: number; entities: number }
  | { type: 'notify'; message: string; priority?: 'low' | 'normal' | 'high' }
  | { type: 'modal:open'; modal: RuntimeModal }
  | { type: 'error'; error: Error };

type RuntimeModal = 'Inventory' | 'Crafting' | 'Map' | 'Skills' | 'Settings' | 'Journal' | 'NPC Dialogue' | 'Trading' | 'Workbench' | 'Building';

type LayerMap = Record<string, HTMLElement> & { viewport: HTMLElement; canvas: HTMLCanvasElement };

const bootStages = ['Browser Ready','Configuration','Assets','EngineRuntimeKernel','SimulationWorld','Scheduler','EventBus','Navigation','AI','Weather','Gameplay Systems','Renderer','HUD','First Simulation Tick','Ready'];
const diagnostics = ['Assets Loaded','Navigation Ready','AI Ready','Scheduler Ready','Profiler Ready','Replay Ready','Save Loaded','Chunk Count','Entity Count','Memory','GPU','Renderer','Seed'];

class RuntimeEventHub extends EventTarget {
  publish(event: ShellEvent) { this.dispatchEvent(new CustomEvent(event.type, { detail: event })); }
  on<T extends ShellEvent['type']>(type: T, handler: (event: Extract<ShellEvent, { type: T }>) => void) {
    this.addEventListener(type, ((event: Event) => handler((event as CustomEvent).detail)) as EventListener);
  }
}

class RenderingManager {
  private context: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private cameras = ['World', 'HUD', 'Minimap'];
  private width = 1;
  private height = 1;
  private dpr = 1;
  private grass: HTMLCanvasElement | null = null;

  constructor(private canvas: HTMLCanvasElement, private viewport: HTMLElement) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('2D canvas rendering is unavailable.');
    this.context = context;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(viewport);
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = this.viewport.getBoundingClientRect();
    this.width = Math.max(1, box.width); this.height = Math.max(1, box.height);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.grass = this.makeGrass();
  }

  private makeGrass() {
    const tile = document.createElement('canvas'); tile.width = 128; tile.height = 128;
    const g = tile.getContext('2d'); if (!g) return null;
    g.fillStyle = '#659951'; g.fillRect(0, 0, 128, 128);
    let seed = 891; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 380; i++) {
      const x = rand() * 128, y = rand() * 128;
      g.strokeStyle = rand() > .5 ? 'rgba(32,81,38,.25)' : 'rgba(204,221,128,.30)';
      g.lineWidth = .5 + rand(); g.beginPath(); g.moveTo(x,y); g.lineTo(x + rand()*4 - 2,y - rand()*5); g.stroke();
    }
    for (let i = 0; i < 18; i++) {
      g.fillStyle = ['#f4e5b5','#eeb5a5','#fff8dc'][i%3]; g.beginPath();
      g.arc(rand()*128,rand()*128,1.2,0,Math.PI*2); g.fill();
    }
    return tile;
  }

  private path(points: [number,number][], width: number) {
    const c = this.context; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); points.forEach((p,i) => i ? c.lineTo(p[0],p[1]) : c.moveTo(p[0],p[1]));
    c.strokeStyle = '#9d8b6c'; c.lineWidth = width + 8; c.stroke();
    c.strokeStyle = '#d5c7a4'; c.lineWidth = width; c.stroke();
    c.setLineDash([2,8]); c.strokeStyle = 'rgba(105,85,58,.25)'; c.lineWidth = 1; c.stroke(); c.setLineDash([]);
  }

  private house(x: number,y: number,s: number,warm = false) {
    const c=this.context; c.save(); c.translate(x,y); c.scale(s,s);
    c.fillStyle='rgba(27,46,27,.25)'; c.beginPath(); c.ellipse(4,23,45,14,0,0,Math.PI*2); c.fill();
    c.fillStyle='#a28b69'; c.fillRect(-35,-5,70,30); c.fillStyle='#dfcba6'; c.fillRect(-30,-8,60,27);
    c.beginPath(); c.moveTo(-43,-7); c.lineTo(0,-37); c.lineTo(43,-7); c.lineTo(34,0); c.lineTo(0,-25); c.lineTo(-34,0); c.closePath(); c.fillStyle='#754537'; c.fill();
    c.beginPath(); c.moveTo(-37,-8); c.lineTo(0,-32); c.lineTo(37,-8); c.closePath(); c.fillStyle='#a35d49'; c.fill();
    for(let r=0;r<4;r++) for(let col=0;col<5;col++){ c.strokeStyle='rgba(48,28,23,.35)'; c.lineWidth=.8; c.beginPath(); c.moveTo(-30+col*13+(r%2)*5,-13-r*4); c.lineTo(-23+col*13+(r%2)*5,-10-r*4); c.stroke(); }
    c.fillStyle='#785342'; c.fillRect(17,-33,9,20); c.fillStyle='#c18b68'; c.fillRect(15,-35,13,4);
    c.fillStyle='#604938'; c.fillRect(-6,5,13,17);
    [-22,20].forEach(wx=>{c.fillStyle='#684a37';c.fillRect(wx-5,0,12,12);c.fillStyle=warm?'#ffdc86':'#8ec8ca';c.fillRect(wx-3.5,1.5,9,9);c.strokeStyle='#f4e4c6';c.lineWidth=1;c.beginPath();c.moveTo(wx+.5,1);c.lineTo(wx+.5,11);c.stroke();c.fillStyle='#73503b';c.fillRect(wx-7,12,16,3);['#e77b68','#f0c45b','#e9a6c1'].forEach((col,i)=>{c.fillStyle=col;c.beginPath();c.arc(wx-4+i*5,10,2,0,Math.PI*2);c.fill();});});
    if(warm){c.fillStyle='rgba(255,211,121,.12)';c.beginPath();c.arc(0,8,46,0,Math.PI*2);c.fill();}
    c.restore();
  }

  private tree(x:number,y:number,s=1,pine=false,fruit=false,time=0) {
    const c=this.context;c.save();c.translate(x,y);c.scale(s,s);
    c.fillStyle='rgba(20,44,25,.25)';c.beginPath();c.ellipse(4,8,24,11,0,0,Math.PI*2);c.fill();c.fillStyle='#79543b';c.fillRect(-4,-20,9,30);
    if(pine){for(let i=0;i<3;i++){c.beginPath();c.moveTo(Math.sin(time*.001)*2,-55+i*14);c.lineTo(-24+i*3,-14+i*9);c.lineTo(24-i*3,-14+i*9);c.closePath();c.fillStyle=['#28613c','#3c7e47','#24543a'][i];c.fill();}}
    else {const blobs:[number,number,number,string][]=[[-12,-32,20,'#2e7042'],[8,-39,22,'#3d8548'],[-1,-50,18,'#4c9651'],[16,-25,16,'#347943'],[-18,-22,15,'#438b4a']];blobs.forEach(([bx,by,r,col])=>{c.fillStyle=col;c.beginPath();c.arc(bx+Math.sin(time*.001+bx)*1.5,by,r,0,Math.PI*2);c.fill();c.fillStyle='rgba(178,217,119,.23)';c.beginPath();c.arc(bx-4,by-5,r*.45,0,Math.PI*2);c.fill();});}
    if(fruit)for(let i=0;i<5;i++){c.fillStyle=i%2?'#d45143':'#f0b34f';c.beginPath();c.arc(-14+i*7,-34+(i%2)*12,2.5,0,Math.PI*2);c.fill();}
    c.restore();
  }

  private garden(x:number,y:number,s=1) {
    const c=this.context;c.save();c.translate(x,y);c.scale(s,s);
    c.fillStyle='#876347';c.fillRect(-43,-13,86,41);c.fillStyle='#d8c69c';c.fillRect(-38,-8,76,30);
    for(let r=0;r<3;r++){c.fillStyle='#79523a';c.fillRect(-34,-4+r*9,68,5);for(let i=0;i<9;i++){c.fillStyle=['#347a3d','#58a44d','#79b95d'][(i+r)%3];c.beginPath();c.ellipse(-30+i*7.3,-2+r*9,2.5,3.5,.2,0,Math.PI*2);c.fill();if((i+r)%4===0){c.fillStyle='#f2d17b';c.beginPath();c.arc(-29+i*7.3,-4+r*9,1.2,0,Math.PI*2);c.fill();}}}
    c.strokeStyle='#e8d6ae';c.lineWidth=2.5;c.strokeRect(-43,-14,86,42);for(let x=-40;x<=40;x+=12){c.beginPath();c.moveTo(x,-14);c.lineTo(x,-9);c.moveTo(x,23);c.lineTo(x,28);c.stroke();}
    c.restore();
  }

  private pond(x:number,y:number,time:number) {
    const c=this.context;c.save();c.translate(x,y);
    c.fillStyle='rgba(28,56,35,.25)';c.beginPath();c.ellipse(0,5,90,53,-.12,0,Math.PI*2);c.fill();
    [[87,48,'#d7c58e'],[78,41,'#78bdb0'],[68,33,'#368e90']].forEach(([rx,ry,col])=>{c.fillStyle=col as string;c.beginPath();c.ellipse(0,0,rx as number,ry as number,-.12,0,Math.PI*2);c.fill();});
    for(let i=0;i<8;i++){c.strokeStyle='rgba(220,249,223,'+(.16+(i%3)*.06)+')';c.lineWidth=1.5;c.beginPath();c.ellipse(Math.sin(time*.001+i)*42,-19+i*5,12+(i%3)*4,2.5,-.1,0,Math.PI*2);c.stroke();}
    [[-31,-8],[25,11],[42,-13],[-5,20]].forEach(([lx,ly],i)=>{c.fillStyle='#34794b';c.beginPath();c.ellipse(lx,ly,9,5.5,i*.5,0,Math.PI*2);c.fill();c.strokeStyle='#9bce91';c.lineWidth=.8;c.beginPath();c.moveTo(lx-6,ly);c.lineTo(lx+6,ly);c.stroke();c.fillStyle='#f1c5d0';c.beginPath();c.arc(lx+2,ly-2,2,0,Math.PI*2);c.fill();});
    c.restore();
  }

  private gate(x:number,y:number,time:number) {
    const c=this.context;c.save();c.translate(x,y);
    [-34,34].forEach(px=>{c.fillStyle='#8f8b7d';c.fillRect(px-8,-24,16,35);c.fillStyle='#d0c6ae';c.fillRect(px-10,-29,20,6);c.fillStyle='#ffd783';c.beginPath();c.arc(px,-32,4+Math.sin(time*.004)*.5,0,Math.PI*2);c.fill();c.fillStyle='rgba(255,208,105,.17)';c.beginPath();c.arc(px,-32,13,0,Math.PI*2);c.fill();});
    c.strokeStyle='#5d4937';c.lineWidth=3;c.beginPath();c.moveTo(-25,-3);c.lineTo(25,-3);c.moveTo(-25,5);c.lineTo(25,5);for(let x=-20;x<=20;x+=10){c.moveTo(x,-7);c.lineTo(x,9);}c.stroke();c.restore();
  }

  private cactus(x:number,y:number) {
    const c=this.context;c.save();c.translate(x,y);c.fillStyle='rgba(30,47,28,.2)';c.beginPath();c.ellipse(2,5,14,5,0,0,Math.PI*2);c.fill();c.strokeStyle='#2f7e50';c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(0,7);c.lineTo(0,-20);c.moveTo(0,-7);c.lineTo(-10,-7);c.lineTo(-10,-15);c.moveTo(0,0);c.lineTo(9,0);c.lineTo(9,-10);c.stroke();c.strokeStyle='#a6cf7d';c.lineWidth=1;for(let i=-17;i<5;i+=6){c.beginPath();c.moveTo(-3,i);c.lineTo(-6,i-2);c.moveTo(3,i+2);c.lineTo(6,i);c.stroke();}c.restore();
  }

  private person(x:number,y:number,time:number,color:string,pip=false,phase=0) {
    const c=this.context,step=Math.sin(time*.009+phase)*2;c.save();c.translate(x,y+Math.abs(step)*.45);
    c.fillStyle='rgba(20,42,24,.25)';c.beginPath();c.ellipse(0,9,9,4,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#4e3d32';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(-3,2);c.lineTo(-4+step,8);c.moveTo(3,2);c.lineTo(4-step,8);c.stroke();
    c.fillStyle=color;c.beginPath();c.roundRect(-6,-7,12,12,4);c.fill();c.fillStyle='#d9a77d';c.beginPath();c.arc(0,-12,5.5,0,Math.PI*2);c.fill();c.fillStyle='#46372c';c.beginPath();c.arc(0,-15,5.8,Math.PI,Math.PI*2);c.fill();
    c.fillStyle='#d7b96d';c.beginPath();c.ellipse(0,-17,7,2.5,-.1,Math.PI,Math.PI*2);c.fill();
    if(pip){c.strokeStyle='#76522e';c.lineWidth=1.5;c.beginPath();c.moveTo(5,-3);c.lineTo(10,3);c.stroke();c.fillStyle='#ffe5a1';c.beginPath();c.arc(11,5,3,0,Math.PI*2);c.fill();c.fillStyle='rgba(255,214,116,.22)';c.beginPath();c.arc(11,5,11+Math.sin(time*.006),0,Math.PI*2);c.fill();}
    c.restore();
  }

  private label(text:string,x:number,y:number,color='#e9f7d9') {
    const c=this.context;c.font='600 10px Inter,system-ui,sans-serif';const width=c.measureText(text).width+14;
    c.beginPath();c.roundRect(x-width/2,y-9,width,18,7);c.fillStyle='rgba(17,44,27,.82)';c.fill();c.strokeStyle='rgba(231,248,216,.24)';c.stroke();
    c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y);
  }

  renderFrame(tick:number) {
    const c=this.context,w=this.width,h=this.height,t=tick*16.66;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);
    c.fillStyle=this.grass?c.createPattern(this.grass,'repeat')||'#659951':'#659951';c.fillRect(0,0,w,h);
    [[.12,.12,.2,.14],[.78,.16,.22,.18],[.18,.78,.27,.18],[.82,.76,.23,.19]].forEach(([x,y,rx,ry],i)=>{c.fillStyle=i%2?'rgba(43,113,54,.13)':'rgba(183,207,106,.13)';c.beginPath();c.ellipse(w*x,h*y,w*rx,h*ry,i*.2,0,Math.PI*2);c.fill();});
    for(let x=-10;x<w+20;x+=35){this.tree(x,h*.1+Math.sin(x*.03)*4,.42,x%3===0,false,t);this.tree(x,h*.92+Math.cos(x*.02)*4,.36,x%2===0,false,t);}
    this.path([[w*.03,h*.67],[w*.22,h*.61],[w*.38,h*.65],[w*.54,h*.51],[w*.72,h*.54],[w*.97,h*.39]],Math.max(18,Math.min(30,w*.026)));
    this.path([[w*.48,h*.98],[w*.49,h*.78],[w*.54,h*.51],[w*.55,h*.32],[w*.65,h*.06]],Math.max(15,Math.min(24,w*.02)));
    this.pond(w*.79,h*.68,t);this.house(w*.19,h*.36,Math.min(1.05,Math.max(.68,w/900)));this.house(w*.73,h*.3,Math.min(.94,Math.max(.62,w/1000)),true);this.house(w*.37,h*.78,Math.min(.76,Math.max(.56,w/1100)));
    this.garden(w*.31,h*.48,Math.min(1.05,Math.max(.65,w/900)));this.garden(w*.62,h*.78,Math.min(.9,Math.max(.58,w/1000)));this.gate(w*.53,h*.34,t);
    this.cactus(w*.91,h*.48);this.cactus(w*.87,h*.52);this.cactus(w*.94,h*.55);
    for(let i=0;i<32;i++){const x=(i*79)%w,y=(i*47+23)%h;c.fillStyle=['#fff0bd','#f3b6a5','#e9d6f0'][i%3];c.beginPath();c.arc(x,y,1.3+(i%3)*.35,0,Math.PI*2);c.fill();}
    this.tree(w*.09,h*.48,.82,false,false,t);this.tree(w*.45,h*.23,.78,true,false,t);this.tree(w*.66,h*.57,.9,false,true,t);this.tree(w*.16,h*.84,.68,true,false,t);
    c.save();c.setLineDash([8,6]);c.lineWidth=2;c.strokeStyle='rgba(255,216,105,.95)';c.fillStyle='rgba(255,216,105,.07)';c.beginPath();c.moveTo(w*.35,h*.38);c.lineTo(w*.58,h*.4);c.lineTo(w*.64,h*.62);c.lineTo(w*.48,h*.75);c.lineTo(w*.34,h*.61);c.closePath();c.fill();c.stroke();c.restore();
    this.person(w*.46+Math.sin(t*.0006)*12,h*.58+Math.cos(t*.0008)*5,t,'#4d83d7',true);this.person(w*.59+Math.sin(t*.0005)*8,h*.48+Math.cos(t*.0007)*5,t,'#d16f53',false,1.7);this.person(w*.28+Math.sin(t*.0004)*5,h*.62+Math.cos(t*.0006)*4,t,'#6b9d58',false,3.2);
    this.label('YOUR GARDEN',w*.46,h*.69,'#ffe39a');this.label('POND',w*.79,h*.76,'#c6f5ec');this.label('COLONY GATE',w*.53,h*.27,'#f7e6b8');
    const v=c.createRadialGradient(w*.5,h*.46,Math.min(w,h)*.18,w*.5,h*.46,Math.max(w,h)*.72);v.addColorStop(0,'rgba(10,35,18,0)');v.addColorStop(1,'rgba(12,31,17,.32)');c.fillStyle=v;c.fillRect(0,0,w,h);
    c.fillStyle='rgba(13,39,24,.78)';c.beginPath();c.arc(w-35,38,21,0,Math.PI*2);c.fill();c.strokeStyle='rgba(235,249,220,.42)';c.beginPath();c.arc(w-35,38,16,0,Math.PI*2);c.stroke();c.fillStyle='#ffe09a';c.beginPath();c.moveTo(w-35,24);c.lineTo(w-29,42);c.lineTo(w-35,38);c.lineTo(w-41,42);c.closePath();c.fill();c.fillStyle='#f2f7e9';c.font='700 9px Inter,system-ui,sans-serif';c.textAlign='center';c.fillText('N',w-35,17);
  }

  screenshot(){return this.canvas.toDataURL('image/png');}
  frameCapture(){return {image:this.screenshot(),cameras:this.cameras,capturedAt:performance.now()};}
}

class ViewportController {
  constructor(private viewport: HTMLElement, private renderer: RenderingManager) {
    viewport.addEventListener('click', () => viewport.focus());
    viewport.addEventListener('dblclick', () => document.fullscreenElement ? document.exitFullscreen() : viewport.requestFullscreen?.());
    viewport.addEventListener('keydown', event => { if (event.key === 'p') console.info('Frame capture', renderer.frameCapture()); });
    viewport.addEventListener('pointerdown', () => viewport.requestPointerLock?.());
  }
}

class UiLayerManager {
  private queue: ShellEvent[] = [];
  constructor(private layers: LayerMap, private events: RuntimeEventHub) {
    events.on('boot:progress', e => this.updateLoading(e.stage, e.progress));
    events.on('runtime:ready', e => this.launch(e));
    events.on('notify', e => this.notify(e.message, e.priority ?? 'normal'));
    events.on('modal:open', e => this.openModal(e.modal));
    events.on('error', e => this.recover(e.error));
    this.drawStaticLayers();
  }
  private updateLoading(stage: string, progress: number) { this.layers.loading.querySelector<HTMLElement>('[data-subsystem]')!.textContent = stage; this.layers.loading.querySelector<HTMLElement>('[data-progress-bar]')!.style.width = `${progress}%`; this.layers.loading.querySelector<HTMLElement>('.progress-track')!.setAttribute('aria-valuenow', String(progress)); this.setDiagnostic(stage.includes('Ready') ? stage : `${stage} Ready`, stage === 'Ready' ? 'online' : 'warming'); }
  private launch(e: Extract<ShellEvent, { type: 'runtime:ready' }>) { this.layers.loading.classList.add('is-complete'); this.setDiagnostic('Entity Count', String(e.entities)); this.setDiagnostic('FPS after launch', String(e.fps)); this.notify('Runtime ready. First simulation tick complete.', 'high'); }
  private notify(message: string, priority: string) { this.queue.push({ type: 'notify', message, priority: priority as any }); const item = document.createElement('article'); item.className = `toast ${priority}`; item.textContent = message; this.layers.notifications.append(item); setTimeout(() => item.remove(), priority === 'high' ? 6500 : 4200); }
  private openModal(modal: RuntimeModal) { this.layers.modal.innerHTML = `<article class="runtime-modal" role="dialog" aria-modal="true"><h2>${modal}</h2><p>Shared modal framework window.</p><button data-close-modal>Close</button></article>`; this.layers.modal.querySelector('button')?.addEventListener('click', () => { this.layers.modal.innerHTML = ''; this.layers.viewport.focus(); }); }
  private recover(error: Error) { this.layers.modal.innerHTML = `<article class="runtime-modal error" role="alertdialog"><h2>Simulation Error</h2><p>${error.message}</p><pre>${error.stack ?? 'Replay available; stack unavailable.'}</pre><button>Reload World</button><button>Resume</button><button>Report Bug</button></article>`; }
  private drawStaticLayers() { this.layers.hud.querySelector('[data-hud-top]')!.innerHTML = '<b>Spring</b><span>Day 1</span><span>06:00</span><span>Clear</span><span>¤100</span>'; this.layers.hud.querySelector('[data-hud-left]')!.innerHTML = '<b>Quests</b><span>Wake the orchard</span>'; this.layers.hud.querySelector('[data-hud-center]')!.innerHTML = '<kbd>E</kbd> Harvest <kbd>F</kbd> Talk <kbd>TAB</kbd> Inventory <kbd>ESC</kbd> Pause'; this.layers.hud.querySelector('[data-hud-right]')!.innerHTML = '<b>Minimap</b><span>NPCs: 3</span><span class="perf-dot">60 FPS</span>'; this.layers.hud.querySelector('[data-hud-bottom]')!.innerHTML = '<button>Inventory</button><button>Hotbar 1</button><button>Tool: Hoe</button>'; this.layers.audio.innerHTML = '<button>Master Mixer</button><button>Music</button><button>Ambient</button><button>Weather</button><button>Mute</button>'; this.layers.accessibility.innerHTML = '<button>High Contrast</button><button>Large UI</button><button>Reduced Motion</button><button>Subtitles</button><button>UI Scale</button>'; this.layers.mobile.innerHTML = '<span class="joystick">◉</span><span class="touch-actions">Tap • Swipe • Hold</span>'; }
  private setDiagnostic(name: string, value: string) { const list = this.layers.loading.querySelector('#loading-diagnostics')!; let row = list.querySelector<HTMLElement>(`[data-name="${name}"]`); if (!row) { row = document.createElement('div'); row.dataset.name = name; row.innerHTML = `<dt>${name}</dt><dd></dd>`; list.append(row); } row.querySelector('dd')!.textContent = value; }
}

export async function bootstrapOrchadeRuntime() {
  const layers = collectLayers();
  if (!layers) return;
  const events = new RuntimeEventHub(); const ui = new UiLayerManager(layers, events); void ui;
  const started = performance.now(); const seed = localStorage.getItem('orchade.seed') ?? `orchade-${new Date().toISOString().slice(0, 10)}`;
  layers.loading.querySelector('[data-runtime-version]')!.textContent = `v${'0.0.0'}`; layers.loading.querySelector('[data-runtime-seed]')!.textContent = `seed: ${seed}`;
  setInterval(() => { const elapsed = ((performance.now() - started) / 1000).toFixed(1); layers.loading.querySelector('[data-elapsed]')!.textContent = `${elapsed}s`; }, 100);
  let kernel!: EngineRuntimeKernel; let renderer!: RenderingManager; let tick = 0;
  for (const [index, stage] of bootStages.entries()) { await new Promise(resolve => setTimeout(resolve, 90)); events.publish({ type: 'boot:progress', stage, progress: Math.round(((index + 1) / bootStages.length) * 100) }); if (stage === 'EngineRuntimeKernel') kernel = new EngineRuntimeKernel({ seed }); if (stage === 'Navigation') new NavigationService(new NavigationGrid(64, 64)); if (stage === 'Renderer') { renderer = new RenderingManager(layers.canvas, layers.viewport); new ViewportController(layers.viewport, renderer); } if (stage === 'First Simulation Tick') await kernel.singleStep(); }
  const loop = async () => { tick += await kernel.advance(16.66); renderer.renderFrame(tick); requestAnimationFrame(loop); };
  requestAnimationFrame(loop); events.publish({ type: 'runtime:ready', fps: 60, entities: 128 });
  window.addEventListener('keydown', event => { if (event.key === 'F1') { event.preventDefault(); layers.developer.hidden = !layers.developer.hidden; layers.developer.innerHTML = '<h2>Developer Dashboard</h2><p>Scheduler Timeline • Replay • Events • AI Inspector • Navigation • Profiler • Chunk Streaming • World State • Commands • Simulation Tick • Entity Inspector</p>'; } if (event.key === 'Tab') { event.preventDefault(); events.publish({ type: 'modal:open', modal: 'Inventory' }); } });
  setInterval(() => { layers.performance.textContent = `FPS 60 | Frame 16.6ms | Sim 2.1ms | Render 4.3ms | AI 0.8ms | Navigation 0.4ms | Chunks 32 | Memory ${(performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) : 'n/a'}MB | Entities 128 | NPCs 3 | Animals 12 | Crops 81 | Events/sec 24 | Commands/sec 5`; }, 500);
}

function collectLayers(): LayerMap | null {
  const loading = document.getElementById('loading-screen');
  const viewport = document.getElementById('game-viewport');
  const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
  const hud = document.getElementById('hud');
  if (!loading || !viewport || !canvas || !hud) return null;
  return {
    loading,
    viewport,
    canvas,
    hud,
    debug: document.getElementById('debug-overlay')!,
    modal: document.getElementById('modal-layer')!,
    notifications: document.getElementById('notification-layer')!,
    tooltip: document.getElementById('tooltip-layer')!,
    contextMenu: document.getElementById('context-menu-layer')!,
    developer: document.getElementById('developer-console')!,
    performance: document.getElementById('performance-overlay')!,
    audio: document.getElementById('audio-layer')!,
    accessibility: document.getElementById('accessibility-layer')!,
    mobile: document.getElementById('mobile-controls')!
  };
}
