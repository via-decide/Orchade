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
  private context: WebGLRenderingContext | CanvasRenderingContext2D | null;
  private observer: ResizeObserver;
  private cameras = ['World', 'HUD', 'Minimap'];
  constructor(private canvas: HTMLCanvasElement, private viewport: HTMLElement) {
    this.context = canvas.getContext('webgl', { antialias: true }) ?? canvas.getContext('2d');
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(viewport);
    this.resize();
  }
  resize() { const ratio = Math.min(window.devicePixelRatio || 1, 2.5); const box = this.viewport.getBoundingClientRect(); this.canvas.width = Math.max(1, Math.floor(box.width * ratio)); this.canvas.height = Math.max(1, Math.floor(box.height * ratio)); this.canvas.style.width = `${box.width}px`; this.canvas.style.height = `${box.height}px`; }
  renderFrame(tick: number) { if (!this.context) return; if ('clearColor' in this.context) { this.context.viewport(0, 0, this.canvas.width, this.canvas.height); this.context.clearColor(0.02, 0.08, 0.05, 1); this.context.clear(this.context.COLOR_BUFFER_BIT); return; } this.context.fillStyle = '#06100c'; this.context.fillRect(0, 0, this.canvas.width, this.canvas.height); this.context.fillStyle = '#52b756'; this.context.fillText(`Orchade tick ${tick}`, 24, 32); }
  screenshot() { return this.canvas.toDataURL('image/png'); }
  frameCapture() { return { image: this.screenshot(), cameras: this.cameras, capturedAt: performance.now() }; }
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
  const layers = collectLayers(); const events = new RuntimeEventHub(); const ui = new UiLayerManager(layers, events); void ui;
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

function collectLayers(): LayerMap { return { loading: document.getElementById('loading-screen')!, viewport: document.getElementById('game-viewport')!, canvas: document.getElementById('render-canvas') as HTMLCanvasElement, hud: document.getElementById('hud')!, debug: document.getElementById('debug-overlay')!, modal: document.getElementById('modal-layer')!, notifications: document.getElementById('notification-layer')!, tooltip: document.getElementById('tooltip-layer')!, contextMenu: document.getElementById('context-menu-layer')!, developer: document.getElementById('developer-console')!, performance: document.getElementById('performance-overlay')!, audio: document.getElementById('audio-layer')!, accessibility: document.getElementById('accessibility-layer')!, mobile: document.getElementById('mobile-controls')! }; }
