// hOn dishwasher cards for Home Assistant (Haier, Candy, Hoover) via the hOn integration (gvigroux/hon).
// Inspired by spikey1965/ha-hon-appliance-card (washer + dryer), MIT licence.
//
//   type: custom:hon-dishwasher-card             the machine, with the time left on its display, a progress light strip,
//                                                a look inside (racks, spray arms, water, steam) while it runs,
//                                                salt / rinse aid / door / remote control icons, and Stop / Off buttons.
//   type: custom:hon-dishwasher-programmes-card  programmes as buttons; tap one, confirm, and it starts.
//
// Options (both cards):
//   entity: dish_washer          the start of your entity IDs (binary_sensor.<entity>_status, sensor.<entity>_mode, ...).
//                                Leave it out and the card finds your hOn dishwasher by itself.
//   name: Máquina da loiça       card title
//   colour: "#5ab4ff"            accent colour
//   language: pt                 en or pt (default: Home Assistant's language, else English)
//   names:                       your own programme names, by programme key, e.g.  iot_eco_bldc: Eco diário
// Appliance card only:
//   max_width: 380px
//   rows: [programme, status, ends, options]   which lines show in the box (default all)
//   finish: inox | white | black               colour of the drawn machine (default inox, like the XF 6C2M1PX)
//   phases: { 6: "Hot rinse" }                 your own names for program_phase codes the card doesn't know
// Programmes card only:
//   favourites: [eco, auto_universal, ...]     programme keys (hon.start_program "program" values)
//   programmes: [...]                          full list for "All programmes" (default: read from the machine)

const HDW_VERSION = "1.0.0";

// ---------------------------------------------------------------------------------------------------------------
// hOn codes for dishwashers (machMode / prPhase)
const DW = {
  mode: { 0: "Disconnected", 1: "Ready", 2: "Running", 3: "Delayed start", 4: "Delayed start", 5: "Ready", 6: "Error", 7: "Finished" },
  phase: { 0: "Ready", 1: "Pre-wash", 2: "Washing", 3: "Rinse", 4: "Drying", 5: "Finished", 6: "Hot rinse", 7: "Rinse", 8: "Drying" },
};
const RUNNING = ["2", "3", "4"];          // a cycle is under way (3/4 = waiting for a delayed start)
const DELAYED = ["3", "4"];
const DRY_PHASES = ["4", "8"];

const I18N = {
  en: {
    off_btn: "Off",
    ask_off: (n, run) => `Turn the ${n.toLowerCase()} off?${run ? " This stops the current cycle." : ""}`,
    ask_stop: n => `Stop the ${n.toLowerCase()}? This cancels the current cycle.`,
    no_device: "Couldn't find this dishwasher in Home Assistant. Check the entity option.",
    send_err: m => `Couldn't send that: ${m}`, start_err: m => `Couldn't start: ${m}`,
    prog_code: c => `Programme #${c}`, phase_n: n => `Phase ${n}`,
    progs_title: t => `${t} – programmes`, search: n => `Search ${n} programmes`,
    start_q: (p, n) => `Start ${p} on the ${n.toLowerCase()}?`,
    running_note: n => `The ${n.toLowerCase()} is running. Stop it before starting another programme.`,
    remote_off: n => `Remote Control is off on the ${n.toLowerCase()}. Switch it on at the machine to start programmes from here.`,
    starts_at: t => `Starts ${t}`,
    reading: "Reading the programmes from the machine…",
    no_favs: "Pick your favourite programmes with the favourites option. Tap “All programmes” to see every one.",
  },
  pt: {
    off_btn: "Desligar",
    Off: "Desligada", On: "Ligada", Start: "Iniciar", Stop: "Parar", Cancel: "Cancelar", Yes: "Sim",
    Running: "A lavar", Finished: "Terminado", Ready: "Pronta", "Delayed start": "Início diferido", Disconnected: "Sem ligação", Error: "Erro",
    "Pre-wash": "Pré-lavagem", Washing: "Lavagem", Rinse: "Enxaguamento", Drying: "Secagem", "Hot rinse": "Enxag. quente",
    "Remote control": "Controlo remoto", "Door open": "Porta aberta", "Door closed": "Porta fechada", "Door locked (cycle running)": "Porta fechada (ciclo em curso)",
    "Salt: refill": "Sal: reabastecer", "Salt OK": "Sal OK", "Rinse aid: refill": "Abrilhantador: reabastecer", "Rinse aid OK": "Abrilhantador OK",
    Programme: "Programa", Status: "Estado", Ends: "Termina", Starts: "Começa", Cycles: "Ciclos", Options: "Opções", End: "Fim",
    "Extra dry": "Extra secagem", "Half load": "Meia carga", "Eco express": "Eco express", "Auto door": "Abertura auto",
    Dishwasher: "Máquina da loiça", "All programmes": "Todos os programas", "Favourites only": "Só favoritos",
    ask_off: (n, run) => `${n}: desligar?${run ? " Isto para o ciclo atual." : ""}`,
    ask_stop: n => `${n}: parar? Isto cancela o ciclo atual.`,
    no_device: "Não encontrei a máquina da loiça no Home Assistant. Verifique a opção entity.",
    send_err: m => `Não foi possível enviar: ${m}`, start_err: m => `Não foi possível iniciar: ${m}`,
    prog_code: c => `Programa n.º ${c}`, phase_n: n => `Fase ${n}`,
    progs_title: t => `${t} – programas`, search: n => `Pesquisar em ${n} programas`,
    start_q: (p, n) => `${n}: iniciar ${p}?`,
    running_note: n => `${n}: ciclo em curso. Pare-o antes de iniciar outro programa.`,
    remote_off: n => `${n}: o controlo remoto está desligado. Ligue-o na máquina para iniciar programas a partir daqui.`,
    starts_at: t => `Começa ${t}`,
    reading: "A ler os programas da máquina…",
    no_favs: "Escolha os seus programas favoritos com a opção favourites. Toque em “Todos os programas” para ver todos.",
  },
};
const pickLang = (c, h) => {
  const l = String(c.language || h?.locale?.language || h?.language || "en").toLowerCase().split(/[-_]/)[0];
  return I18N[l] ? l : "en";
};
const tr = (lang, key, ...a) => {
  const v = I18N[lang]?.[key] ?? I18N.en[key] ?? key;
  return typeof v === "function" ? v(...a) : v;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// a programme key -> a readable name: yours > the hOn integration's translation (in HA's language) > made from the key
const progLabel = (k, c, hass, nameState) => {
  if (c.names?.[k]) return c.names[k];
  if (nameState && hass?.formatEntityState) {
    try { const t = hass.formatEntityState(nameState, k); if (t && t !== k) return t; } catch (e) {}
  }
  return String(k).replace(/^iot_/, "").replace(/_soil$/, "").replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase());
};

// finishes of the drawn machine. Default inox = Haier XF 6C2M1PX (I-Pro Shine série 3, livre instalação, inox).
const FINISHES = {
  inox:  { b0: "#9ea4aa", b1: "#e3e6e9", b2: "#a3a9af", top: "#8e949a", kick: "#868c92", logo: "#5b6066", recess: "#3a3e43", brush: "#ffffff" },
  white: { b0: "#e2e5e9", b1: "#f8f9fa", b2: "#dadde1", top: "#c9cdd2", kick: "#cdd1d6", logo: "#9aa0a6", recess: "#3a3e43", brush: "#ffffff" },
  black: { b0: "#1c1f22", b1: "#34383d", b2: "#191c1f", top: "#121416", kick: "#141618", logo: "#8a9096", recess: "#0d0f11", brush: "#ffffff" },
};
const FINISH_ALIASES = { inox: "inox", stainless: "inox", steel: "inox", silver: "inox", white: "white", branco: "white", black: "black", preto: "black", graphite: "black" };

// the machine, drawn front on: 600 x 850 (60 x 85 cm), after the Haier XF 6C2M1PX: a plain brushed-steel door,
// the handle recess centred at the top with the black Dot Matrix display inside it, the logo under it,
// and a separate kick plate. (Its buttons sit on the top edge of the door, so they don't show from the front.)
const machineSVG = f => `<svg class="machine" viewBox="0 0 600 850" aria-hidden="true">
  <defs>
    <linearGradient id="dwbody" x1="0" x2="1"><stop offset="0" stop-color="${f.b0}"/><stop offset=".45" stop-color="${f.b1}"/><stop offset=".6" stop-color="${f.b1}"/><stop offset="1" stop-color="${f.b2}"/></linearGradient>
    <linearGradient id="dwsheen" x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <pattern id="dwbrush" width="600" height="7" patternUnits="userSpaceOnUse"><rect width="600" height="1" fill="${f.brush}" opacity=".06"/><rect y="4" width="600" height="1" fill="#000" opacity=".04"/></pattern>
    <linearGradient id="dwrecess" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".35" stop-color="${f.recess}"/><stop offset="1" stop-color="${f.recess}"/></linearGradient>
    <linearGradient id="dwkick" y1="0" y2="1"><stop offset="0" stop-color="${f.kick}"/><stop offset="1" stop-color="${f.b0}"/></linearGradient>
  </defs>
  <rect x="6" y="4" width="588" height="26" rx="4" fill="${f.top}"/>
  <rect x="6" y="26" width="588" height="4" fill="#00000030"/>
  <rect x="10" y="30" width="580" height="738" rx="3" fill="url(#dwbody)"/>
  <rect x="10" y="30" width="580" height="738" rx="3" fill="url(#dwbrush)"/>
  <rect x="10" y="30" width="580" height="738" rx="3" fill="url(#dwsheen)"/>
  <rect x="10" y="30" width="580" height="738" rx="3" fill="none" stroke="#00000030" stroke-width="2"/>
  <rect x="148" y="42" width="304" height="90" rx="7" fill="url(#dwrecess)"/>
  <rect x="148" y="130" width="304" height="3" rx="1.5" fill="#ffffff55"/>
  <rect x="158" y="74" width="284" height="50" rx="3" fill="#07080a"/>
  <text x="300" y="168" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="19" font-style="italic" font-weight="700" fill="${f.logo}" letter-spacing=".5">Haier</text>
  <rect x="10" y="766" width="580" height="8" fill="#0d0f11"/>
  <rect x="14" y="774" width="572" height="62" rx="3" fill="url(#dwkick)"/>
  <rect x="14" y="774" width="572" height="62" rx="3" fill="url(#dwbrush)"/>
  <rect x="34" y="836" width="34" height="10" rx="2" fill="#2a2d31"/><rect x="532" y="836" width="34" height="10" rx="2" fill="#2a2d31"/>
</svg>`;

// a look inside (3 levels, like the 16-place XF): cutlery tray, upper rack with glasses, lower rack with plates,
// two spray arms. viewBox 460 x 540.
const insideSVG = () => {
  const cutlery = Array.from({ length: 22 }, (_, i) => {
    const x = 30 + i * 19, kind = i % 3;
    return kind === 0 ? `<rect x="${x - 2}" y="30" width="4" height="30" rx="2" fill="#c9d1d9"/><rect x="${x - 4}" y="26" width="8" height="10" rx="2" fill="#c9d1d9"/>`
      : kind === 1 ? `<rect x="${x - 2}" y="28" width="4" height="32" rx="2" fill="#b9c2cb"/><ellipse cx="${x}" cy="28" rx="5" ry="7" fill="#b9c2cb"/>`
      : `<rect x="${x - 1.5}" y="26" width="3" height="34" rx="1.5" fill="#d5dce2"/>`;
  }).join("");
  const glasses = [50, 110, 170, 230, 290, 350, 410].map((x, i) =>
    `<path d="M${x - 20} 200 L${x - 14} ${i % 2 ? 128 : 138} H${x + 14} L${x + 20} 200 Z" fill="#cfe3f2" opacity=".55" stroke="#e9f4ff" stroke-width="2"/>`).join("");
  const plates = Array.from({ length: 13 }, (_, i) => {
    const x = 42 + i * 31, big = i % 3 !== 1, h = big ? 150 : 110;
    return `<rect x="${x - 6}" y="${420 - h}" width="12" height="${h}" rx="6" fill="${big ? "#eef1f4" : "#d9e7f0"}" stroke="#ffffff" stroke-width="1.5"/>`;
  }).join("");
  const wires = (y, n) => Array.from({ length: n }, (_, i) => `<line x1="${24 + i * (412 / (n - 1))}" y1="${y}" x2="${24 + i * (412 / (n - 1))}" y2="${y - 18}" stroke="#9aa3ad" stroke-width="2"/>`).join("");
  return `<svg viewBox="0 0 460 540" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="dwtub" x1="0" x2="1"><stop offset="0" stop-color="#20262c"/><stop offset=".5" stop-color="#39414a"/><stop offset="1" stop-color="#20262c"/></linearGradient></defs>
    <rect width="460" height="540" fill="url(#dwtub)"/>
    <rect x="8" y="0" width="6" height="540" fill="#5b646e"/><rect x="446" y="0" width="6" height="540" fill="#5b646e"/>
    ${cutlery}
    <rect x="18" y="60" width="424" height="6" rx="3" fill="#aeb6bf"/>
    ${glasses}
    <line x1="18" y1="204" x2="442" y2="204" stroke="#aeb6bf" stroke-width="4"/>${wires(204, 15)}
    <g class="arm arm1"><rect x="150" y="230" width="160" height="10" rx="5" fill="#8d97a1"/><circle cx="230" cy="235" r="9" fill="#6f7983"/></g>
    ${plates}
    <line x1="18" y1="424" x2="442" y2="424" stroke="#aeb6bf" stroke-width="4"/>${wires(424, 15)}
    <g class="arm arm2"><rect x="110" y="456" width="240" height="12" rx="6" fill="#8d97a1"/><circle cx="230" cy="462" r="11" fill="#6f7983"/></g>
  </svg>`;
};
// water drops thrown up by the two spray arms
const drops = () => Array.from({ length: 34 }, (_, i) => {
  const lower = i % 2, x = (lower ? 26 : 34) + ((i * 37) % (lower ? 48 : 32)), y = lower ? 85 : 43;
  return `<i style="left:${x}%;top:${y}%;--dx:${((i * 53) % 40) - 20}px;animation-delay:${((i * 0.137) % 1.1).toFixed(2)}s"></i>`;
}).join("");
const wisps = () => Array.from({ length: 7 }, (_, i) =>
  `<i style="left:${12 + i * 12.5}%;animation-delay:${(i * 0.55).toFixed(2)}s"></i>`).join("");
const sparkles = () => [[22, 46], [48, 60], [74, 50], [32, 70], [62, 74], [50, 30], [84, 66]].map(([x, y], i) =>
  `<b style="left:${x}%;top:${y}%;animation-delay:${(i * 0.3).toFixed(1)}s">✦</b>`).join("");

// positions over the 600 x 850 picture, in %: display in the handle recess, progress light under it,
// status icons under the logo, the look inside over the door
const G = { lcd: { x: 26.33, y: 8.71, w: 47.33, h: 5.88 }, strip: { x: 24.67, y: 15.3, w: 50.67 },
  inside: { x: 6.67, y: 27.65, w: 86.67, h: 61.18 },
  icons: [[37.5, 23.4], [45.83, 23.4], [54.17, 23.4], [62.5, 23.4]] };

const CSS = `
:host { --fg:#ececec; --muted:#9a9a9a; --ok:#5fd38a; --warm:#ffb44f; --warn:#ffb44f; display:block; }
ha-card { display:block; background:var(--hon-card-bg,#2a2a2a); border:1px solid #ffffff0f; border-radius:16px; box-shadow:none; padding:12px 14px 14px;
  color:var(--fg); font-family:var(--hon-font,system-ui,-apple-system,"Segoe UI",sans-serif); }
.head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.head .name { font-weight:600; font-size:17px; }
.pill { margin-left:auto; font-size:12px; font-weight:600; padding:3px 10px; border-radius:999px; background:#3a3a3a; color:var(--muted); white-space:nowrap; }
.pill.run { background:color-mix(in srgb, var(--c) 22%, #1f1f1f); color:var(--c); }
.pill.dry { background:#4a3417; color:var(--warm); } .pill.done { background:#1c4430; color:var(--ok); }
.pic { position:relative; margin:0 auto; max-width:var(--maxw,440px); cursor:pointer; container-type:inline-size; aspect-ratio:600/850; }
.pic > svg.machine { position:absolute; inset:0; width:100%; height:100%; filter:drop-shadow(0 6px 14px #0008); }
.at { position:absolute; }
.inside { overflow:hidden; border-radius:2.4cqw; opacity:0; transition:opacity .8s; box-shadow:inset 0 0 6cqw #000c; }
.inside > svg { position:absolute; inset:0; width:100%; height:100%; }
.on .inside { opacity:.97; } .fin .inside { opacity:.9; }
.arm { transform-box:fill-box; transform-origin:center; }
.on.wash .arm { animation:arm 1.1s ease-in-out infinite; } .on.wash .arm2 { animation-duration:1.4s; }
.water, .steam, .shine { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .6s; }
.on.wash .water, .on.dry .steam, .fin .shine { opacity:1; }
.water i { position:absolute; width:.7cqw; height:2.6cqw; border-radius:1cqw; background:#8fd0ff; opacity:0; }
.on.wash .water i { animation:drop 1.1s linear infinite; }
.water::after { content:""; position:absolute; inset:0; background:linear-gradient(#5ab4ff10,#5ab4ff30); }
.steam i { position:absolute; bottom:-10%; width:14%; height:40%; border-radius:50%; background:radial-gradient(#ffffff55,#ffffff00 70%); filter:blur(3px); opacity:0; }
.on.dry .steam i { animation:steam 3.8s ease-in infinite; }
.steam::after { content:""; position:absolute; inset:0; background:linear-gradient(#ff9a3c00 30%,#ff9a3c2a); }
.shine b { position:absolute; font-size:4.5cqw; color:#fff; text-shadow:0 0 2cqw #bfe6ff; opacity:0; transform:translate(-50%,-50%); }
.fin .shine b { animation:spark 2.2s ease-in-out infinite; }
.phase { position:absolute; left:50%; top:4%; transform:translateX(-50%); white-space:nowrap; font-weight:700; font-size:clamp(11px,3.2cqw,15px);
  padding:2px 10px; border-radius:999px; background:#000a; color:var(--c); opacity:0; transition:opacity .6s; z-index:2; }
.on .phase, .fin .phase { opacity:1; } .fin .phase { color:var(--ok); } .dry .phase { color:var(--warm); }
.strip { height:.55%; border-radius:99px; background:#00000030; overflow:hidden; }
.strip .bar { height:100%; width:0; background:var(--c); box-shadow:0 0 8px var(--c); transition:width 1s linear, background .6s; border-radius:99px; }
.dry .strip .bar { background:var(--warm); box-shadow:0 0 8px var(--warm); } .fin .strip .bar { background:var(--ok); box-shadow:0 0 8px var(--ok); }
.lcd { border-radius:3px; display:flex; align-items:center; justify-content:center; gap:.6em; line-height:1; overflow:hidden; container-type:size; }
.lcd .t { font-family:"Dot Matrix","DotGothic16",ui-monospace,"SF Mono",Menlo,monospace; font-weight:600; font-size:56cqh; letter-spacing:.06em;
  font-variant-numeric:tabular-nums; color:#eef4ff; text-shadow:0 0 4px #bcd6ff99; }
.lcd .s { font-family:ui-monospace,"SF Mono",Menlo,monospace; font-size:30cqh; color:#9fb0c4; white-space:nowrap; letter-spacing:.04em; }
.off .lcd .t { color:#3a3f46; text-shadow:none; } .fin .lcd .t { color:var(--ok); text-shadow:0 0 4px #5fd38a88; }
.icon { width:7.2%; aspect-ratio:1; border-radius:50%; display:grid; place-items:center; background:#000a; transform:translate(-50%,-50%); }
.icon[hidden] { display:none; }
.icon ha-icon { --mdc-icon-size:68%; width:68%; color:#9a9a9a; display:grid; place-items:center; }
.icon.lit ha-icon { color:var(--c); } .icon.warn ha-icon { color:var(--warn); } .icon.warn { box-shadow:0 0 0 2px #ffb44f66; }
.panel { position:absolute; left:12%; right:12%; bottom:12%; min-height:9%; box-sizing:border-box; border-radius:12px; background:#1b1d20e6;
  display:grid; align-content:center; gap:3px; padding:6px 12px; font-size:clamp(10px,2.9cqw,13.5px); box-shadow:inset 0 0 0 1px #ffffff12; z-index:2; }
.panel:empty { display:none; }
@container (max-width:320px) { .panel { left:8%; right:8%; gap:1px; padding:4px 8px; line-height:1.25; } }
.row { display:flex; justify-content:space-between; gap:10px; }
.row span:first-child { color:var(--muted); }
.row span:last-child { font-weight:500; text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ctl { display:flex; flex-wrap:wrap; gap:8px; margin:-2px 0 10px; }
.ctl[hidden], .ask[hidden], .ctl button[hidden] { display:none; }
.ctl button, .ask button { display:flex; align-items:center; gap:6px; font:600 13.5px inherit; font-family:inherit; color:#ececec; background:#3a3a3a; border:none;
  border-radius:999px; padding:8px 14px; cursor:pointer; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
.ctl button ha-icon, .ask button ha-icon { --mdc-icon-size:18px; }
.ctl button:active { background:var(--c); color:#000; }
.ask { display:flex; align-items:center; gap:8px; margin:-2px 0 10px; padding:8px 10px; border-radius:12px; background:#1f1f1f; border:1px solid #ff6b6b66; }
.ask span { flex:1; font-size:13.5px; }
.ask .go { background:#e5484d; color:#fff; }
.err { font-size:12.5px; color:#ff8a8a; margin:-4px 0 8px; } .err:empty { display:none; }
@keyframes arm { 0%,100% { transform:scaleX(1); } 50% { transform:scaleX(-1); } }
@keyframes drop { 0% { opacity:0; transform:translate(0,0); } 15% { opacity:.9; } 100% { opacity:0; transform:translate(var(--dx),-14cqw); } }
@keyframes steam { 0% { opacity:0; transform:translateY(0) scale(.6); } 30% { opacity:.9; } 100% { opacity:0; transform:translateY(-55cqw) scale(1.5); } }
@keyframes spark { 0%,100% { opacity:0; transform:translate(-50%,-50%) scale(.4); } 50% { opacity:1; transform:translate(-50%,-50%) scale(1); } }
@media (prefers-reduced-motion:reduce) { .arm,.water i,.steam i,.shine b { animation:none !important; } }
`;

const fmt = s => { s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const hhmm = (d, lang) => d.toLocaleTimeString(lang && lang !== "en" ? lang : [], { hour: "2-digit", minute: "2-digit" });

// find the hOn dishwasher by itself: its machMode sensor has the "dishwasher_mode" translation key
function findPrefix(h) {
  for (const e of Object.values(h?.entities || {}))
    if (e.platform === "hon" && e.translation_key === "dishwasher_mode" && /^sensor\..+_mode$/.test(e.entity_id))
      return e.entity_id.slice(7, -5);
  return null;
}
function setup(c) {
  return { ...c, title: c.name || "Dishwasher", ownTitle: !!c.name, colour: c.colour || c.color || "#5ab4ff",
    finish: FINISH_ALIASES[String(c.finish || "inox").toLowerCase()] || "inox",
    names: c.names && typeof c.names === "object" ? Object.fromEntries(Object.entries(c.names).map(([k, v]) => [String(k), String(v)])) : {},
    phases: c.phases && typeof c.phases === "object" ? c.phases : {} };
}

// shared by both cards: entity lookups on the configured (or found) prefix
const Base = superclass => class extends superclass {
  get _p() { return this._config.entity || (this._found ??= findPrefix(this._hass)) || "dish_washer"; }
  _st(id) { const s = this._hass?.states[id]; return s && !["unknown", "unavailable", ""].includes(s.state) ? s : null; }
  _val(k) { return this._st(`sensor.${this._p}_${k}`)?.state ?? null; }
  _bin(k) { const s = this._st(`binary_sensor.${this._p}_${k}`); return s ? s.state === "on" : null; }
  _dev() { return this._hass?.entities?.[`binary_sensor.${this._p}_status`]?.device_id || this._hass?.entities?.[`sensor.${this._p}_mode`]?.device_id; }
  _tr(key, ...a) { return tr(this._lang, key, ...a); }
  _title() { return this._config.ownTitle ? this._config.title : this._tr(this._config.title); }
};

class HonDishwasherCard extends Base(HTMLElement) {
  setConfig(c) {
    this._config = setup(c);
    if (this.isConnected && (!this.shadowRoot || this._hass)) { this._build(); this._render(); }
  }
  getCardSize() { return 10; }
  static getStubConfig() { return {}; }
  connectedCallback() {
    if (!this.shadowRoot && this._config) { this._build(); this._render(); }
    clearInterval(this._tick); this._tick = setInterval(() => this._time(), 1000);
  }
  disconnectedCallback() { clearInterval(this._tick); }
  set hass(h) {
    this._hass = h; if (!this.shadowRoot) return;
    if (pickLang(this._config, h) !== this._lang) this._build();
    this._render();
  }
  _rowsShown(rows) {
    const w = this._config.rows; if (!Array.isArray(w) || !w.length) return rows;
    const alias = { cycles: "ends", program: "programme", phase: "status", state: "status" };
    const want = new Set(w.map(x => { const k = String(x).toLowerCase().trim(); return alias[k] || k; }));
    return rows.filter(r => want.has(r[2]));
  }

  _build() {
    const c = this._config, T = k => esc(this._tr(k)); this._lang = pickLang(c, this._hass);
    const f = FINISHES[c.finish], icon = (id, i, mdi) =>
      `<div class="at icon" id="${id}" style="left:${G.icons[i][0]}%;top:${G.icons[i][1]}%" hidden><ha-icon icon="${mdi}"></ha-icon></div>`;
    const r = this.shadowRoot || this.attachShadow({ mode: "open" });
    r.innerHTML = `<style>${CSS}</style>
    <ha-card style="--c:${esc(c.colour)}">
      <div class="head"><span class="name">${esc(this._title())}</span><span class="pill" id="pill">${T("Off")}</span></div>
      <div class="ctl" id="ctl" hidden>
        <button id="stop"><ha-icon icon="mdi:stop"></ha-icon>${T("Stop")}</button>
        <button id="off"><ha-icon icon="mdi:power"></ha-icon>${T("off_btn")}</button>
      </div>
      <div class="ask" id="ask" hidden><span id="askT"></span><button id="askNo">${T("Cancel")}</button><button class="go" id="askYes">${T("Yes")}</button></div>
      <div class="err" id="err"></div>
      <div class="pic" id="pic" style="${c.max_width ? `--maxw:${esc(c.max_width)}` : ""}">
        ${machineSVG(f)}
        <div class="at inside" style="left:${G.inside.x}%;top:${G.inside.y}%;width:${G.inside.w}%;height:${G.inside.h}%">
          ${insideSVG()}
          <div class="water">${drops()}</div><div class="steam">${wisps()}</div><div class="shine">${sparkles()}</div>
          <div class="phase" id="phase"></div>
        </div>
        <div class="at strip" style="left:${G.strip.x}%;top:${G.strip.y}%;width:${G.strip.w}%"><div class="bar" id="bar"></div></div>
        <div class="at lcd" style="left:${G.lcd.x}%;top:${G.lcd.y}%;width:${G.lcd.w}%;height:${G.lcd.h}%"><span class="t" id="lcd">--:--</span><span class="s" id="lcdS"></span></div>
        ${icon("wifi", 0, "mdi:wifi")}${icon("door", 1, "mdi:door-closed")}${icon("salt", 2, "mdi:shaker-outline")}${icon("rinse", 3, "mdi:water-plus-outline")}
        <div class="panel" id="rows"></div>
      </div>
    </ha-card>`;
    r.getElementById("stop").addEventListener("click", () => this._ask("stop"));
    r.getElementById("off").addEventListener("click", () => this._ask("off"));
    r.getElementById("askNo").addEventListener("click", () => this._ask(null));
    r.getElementById("askYes").addEventListener("click", () => { const w = this._asking; this._ask(null); if (w) this._send(w); });
    r.getElementById("pic").addEventListener("click", () => this.dispatchEvent(new CustomEvent("hass-more-info",
      { detail: { entityId: `sensor.${this._p}_mode` }, bubbles: true, composed: true })));
  }

  _ask(what) {
    const r = this.shadowRoot, name = this._title(); this._asking = what;
    r.getElementById("ask").hidden = !what;
    if (what) r.getElementById("askT").textContent = what === "off" ? this._tr("ask_off", name, !!this._t?.on) : this._tr("ask_stop", name);
  }
  async _send(action) {
    const r = this.shadowRoot, h = this._hass, dev = this._dev();
    r.getElementById("err").textContent = "";
    if (!dev) { r.getElementById("err").textContent = this._tr("no_device"); return; }
    try {
      // hOn: turn_off = power off; set_mode 1 = back to Ready (cancels the cycle, machine stays on)
      if (action === "off") await h.callService("hon", "turn_off", { device: dev });
      else await h.callService("hon", "set_mode", { device: dev, mode: "1" });
    } catch (e) { r.getElementById("err").textContent = this._tr("send_err", e.message || e); }
  }

  _programme(powered) {
    const nameSt = this._st(`sensor.${this._p}_program_name`), prog = nameSt?.state, code = this._val("program_code");
    try {
      const mine = JSON.parse(localStorage.getItem(`hon-dw-started-${this._p}`) || "null");
      if (mine && powered && Date.now() - mine.at < 6 * 3600e3) return progLabel(mine.k, this._config, this._hass, nameSt);
    } catch (e) {}
    if (prog && !["No program", "home_assistant"].includes(prog)) return progLabel(prog, this._config, this._hass, nameSt);
    return code != null && code !== "0" ? this._tr("prog_code", code) : "—";
  }

  _read() {
    const p = this._p, T = k => this._tr(k), lang = this._lang;
    const status = this._st(`binary_sensor.${p}_status`), mode = this._val("mode"), ph = this._val("program_phase");
    const powered = status?.state === "on" || RUNNING.includes(mode);
    const on = powered && RUNNING.includes(mode), delayed = on && DELAYED.includes(mode);
    const done = !on && mode === "7";
    const dry = on && !delayed && DRY_PHASES.includes(ph);
    const phaseName = ph == null ? "" : this._config.phases[ph] ?? (DW.phase[ph] ? T(DW.phase[ph]) : this._tr("phase_n", ph));
    const modeName = DW.mode[mode] ? T(DW.mode[mode]) : null;
    const phase = delayed ? T("Delayed start") : ph && ph !== "0" ? phaseName : T("Running");
    const pill = on ? phase : done ? T("Finished") : powered ? modeName || T("On") : T("Off");

    // timing: hOn gives start/end timestamps; remaining_time (minutes, delay included) is the fallback
    const rem = this._st(`sensor.${p}_remaining_time`), delay = parseFloat(this._val("delay_time")) || 0;
    let start = Date.parse(this._val("start_time") || "");
    let end = Date.parse(this._val("end_time") || "");
    if ((isNaN(end) || end < Date.now() - 60e3) && on && rem) {
      const key = rem.last_updated + rem.state;
      if (this._remKey !== key) { this._remKey = key; this._remEnd = Date.parse(rem.last_updated) + parseFloat(rem.state) * 60000; }
      end = this._remEnd;
    }
    const runStart = delayed ? NaN : !isNaN(start) ? start : on ? Date.parse(status?.last_changed || "") : NaN;
    const startsAt = delayed ? Date.now() + delay * 60000 : NaN;

    const rows = [[T("Programme"), this._programme(powered), "programme"]];
    rows.push([T("Status"), on ? phase : done ? T("Finished") : powered ? modeName || T("Ready") : T("Off"), "status"]);
    if (delayed && delay) rows.push([T("Starts"), hhmm(new Date(startsAt), lang), "ends"]);
    rows.push([T(on ? "Ends" : "Cycles"), on ? (isNaN(end) ? "—" : hhmm(new Date(end), lang))
      : this._val("total_wash_cycle") ?? this._val("total_programs") ?? "—", "ends"]);
    const opts = [["extra_dry", "Extra dry"], ["half_load", "Half load"], ["eco_express", "Eco express"], ["open_door_at_end", "Auto door"]]
      .filter(([k]) => this._bin(k)).map(([, n]) => T(n));
    if (opts.length && (on || powered)) rows.push([T("Options"), opts.join(" · "), "options"]);
    return { powered, on, delayed, done, dry, phase, pill, start: runStart, end, delay, rows };
  }

  _render() {
    const r = this.shadowRoot, h = this._hass; if (!r || !h) return;
    const s = this._read(), { powered, on, done, dry } = s, p = this._p;
    const card = r.querySelector("ha-card");
    card.classList.toggle("on", on && !s.delayed); card.classList.toggle("off", !on && !done);
    card.classList.toggle("fin", done); card.classList.toggle("dry", dry); card.classList.toggle("wash", on && !dry && !s.delayed);
    const pill = r.getElementById("pill");
    pill.className = "pill" + (dry ? " dry" : on ? " run" : done ? " done" : "");
    pill.textContent = s.pill;
    r.getElementById("phase").textContent = done ? this._tr("Finished") : s.phase;
    this._t = { on, delayed: s.delayed, done, start: s.start, end: s.end, delay: s.delay, ready: powered && !on && !done };

    const remote = this._bin("remote_control");
    r.getElementById("ctl").hidden = !powered || remote === false;
    r.getElementById("stop").hidden = !on;
    if (!powered) this._ask(null);

    const setIcon = (id, show, cls, mdi, title) => {
      const el = r.getElementById(id); el.hidden = !show; if (!show) return;
      el.className = "at icon" + (cls ? " " + cls : ""); el.title = this._tr(title);
      el.querySelector("ha-icon").setAttribute("icon", mdi);
    };
    setIcon("wifi", remote !== null, remote ? "lit" : "", remote ? "mdi:wifi" : "mdi:wifi-off", "Remote control");
    const door = this._bin("door_status");
    setIcon("door", true, door ? "warn" : on ? "lit" : "", door ? "mdi:door-open" : on ? "mdi:lock" : "mdi:door-closed",
      door ? "Door open" : on ? "Door locked (cycle running)" : "Door closed");
    // hOn: saltStatus / rinseAidStatus "1" = needs refilling
    const salt = this._bin("salt"), rinse = this._bin("rinse_aid");
    setIcon("salt", salt !== null, salt ? "warn" : "", "mdi:shaker-outline", salt ? "Salt: refill" : "Salt OK");
    setIcon("rinse", rinse !== null, rinse ? "warn" : "", "mdi:water-plus-outline", rinse ? "Rinse aid: refill" : "Rinse aid OK");

    r.getElementById("rows").innerHTML = this._rowsShown(s.rows).map(([k, x]) => `<div class="row"><span>${esc(k)}</span><span>${esc(x)}</span></div>`).join("");
    this._time();
  }

  _time() {
    const r = this.shadowRoot, t = this._t; if (!r || !t) return;
    const now = Date.now(), left = isNaN(t.end) ? NaN : (t.end - now) / 1000;
    let pct = 0;
    if (t.done) pct = 100;
    else if (t.on && !t.delayed && !isNaN(t.start) && !isNaN(t.end) && t.end > t.start) pct = Math.min(100, Math.max(0, (now - t.start) / (t.end - t.start) * 100));
    r.getElementById("bar").style.width = pct + "%";
    r.getElementById("lcd").textContent = (t.on || t.ready) && !isNaN(left) && left > 0 ? fmt(t.ready ? Math.round(left / 60) * 60 : left)
      : t.done ? this._tr("End") : "--:--";
    r.getElementById("lcdS").textContent = t.delayed ? this._tr("Delayed start") : t.on ? `${Math.round(pct)}%` : t.ready ? this._tr("Ready") : "";
  }
}
if (!customElements.get("hon-dishwasher-card")) customElements.define("hon-dishwasher-card", HonDishwasherCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "hon-dishwasher-card"))
  window.customCards.push({ type: "hon-dishwasher-card", name: "hOn dishwasher", description: "Dishwasher with time left, progress strip and a look inside" });

// ---------------------------------------------------------------------------------------------------------------
// Programmes: favourites as buttons, the full list behind "All programmes", confirm before starting (hon.start_program).
// With no programmes option, the list is read from the machine: hon.start_program with an unknown programme sends
// nothing and answers with every programme it accepts.
const PCSS = `
ha-card { display:block; background:var(--hon-card-bg,#2a2a2a); border:1px solid #ffffff0f; border-radius:16px; box-shadow:none; padding:12px 14px 14px;
  color:#ececec; font-family:var(--hon-font,system-ui,-apple-system,"Segoe UI",sans-serif); }
.head { display:flex; align-items:center; gap:8px; margin-bottom:10px; font-weight:600; font-size:16px; }
.head button { margin-left:auto; } .head button[hidden] { display:none; }
.note { font-size:12.5px; color:#ffb44f; background:#4a341733; border:1px solid #ffb44f33; border-radius:10px; padding:6px 10px; margin-bottom:10px; }
.note.info { color:#9a9a9a; background:#ffffff08; border-color:#ffffff14; }
.note[hidden] { display:none; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(118px,1fr)); gap:8px; }
.grid:empty { display:none; }
.prog { min-height:46px; padding:6px 8px; border-radius:12px; border:1px solid #ffffff10; background:var(--hon-btn-bg,#333); color:#ececec;
  font:500 13.5px inherit; font-family:inherit; text-align:center; cursor:pointer; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
.prog:active, .prog.sel { background:color-mix(in srgb, var(--c) 30%, #333); border-color:var(--c); }
.prog[hidden] { display:none; }
.small { font:500 13px inherit; font-family:inherit; color:#ececec; background:#3a3a3a; border:none; border-radius:999px; padding:6px 12px; cursor:pointer; }
.all { margin-top:10px; display:grid; gap:8px; } .all[hidden] { display:none; }
.all input { font:15px inherit; font-family:inherit; color:#ececec; background:#1f1f1f; border:1px solid #ffffff1a; border-radius:10px; padding:9px 12px; }
.all .grid { max-height:300px; overflow-y:auto; }
.confirm { position:sticky; bottom:0; margin-top:10px; display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px;
  background:#1f1f1f; border:1px solid var(--c); }
.confirm[hidden] { display:none; }
.confirm span { flex:1; font-size:14px; }
.confirm .go { background:var(--c); color:#000; font-weight:700; }
`;
class HonDishwasherProgrammesCard extends Base(HTMLElement) {
  setConfig(c) { this._config = setup(c); if (this.isConnected && this._hass) this._build(); }
  getCardSize() { return 6; }
  static getStubConfig() { return {}; }
  connectedCallback() { if (!this.shadowRoot && this._config && this._hass) this._build(); }
  set hass(h) {
    const first = !this._hass; this._hass = h;
    if (first || pickLang(this._config, h) !== this._lang) this._build();
    this._render();
  }

  _list() {
    if (Array.isArray(this._config.programmes) && this._config.programmes.length) return this._config.programmes.map(String);
    try { const c = JSON.parse(localStorage.getItem(`hon-dw-progs-${this._p}`) || "null"); if (c && Date.now() - c.at < 7 * 864e5) return c.list; } catch (e) {}
    return null;
  }
  // ask the machine which programmes it has (nothing is started: an unknown programme is refused before sending)
  async _fetchList() {
    const dev = this._dev(); if (!dev || this._fetching) return;
    this._fetching = true;
    try { await this._hass.callService("hon", "start_program", { program: "__list_programmes__", parameters: "{}" }, { device_id: dev }); }
    catch (e) {
      const m = /allowed values \[([^\]]*)\]/.exec(e.message || String(e));
      if (m) {
        const list = m[1].split(",").map(s => s.trim()).filter(Boolean);
        try { localStorage.setItem(`hon-dw-progs-${this._p}`, JSON.stringify({ list, at: Date.now() })); } catch (x) {}
        this._build(); this._render();
      }
    } finally { this._fetching = false; }
  }

  _build() {
    const c = this._config, lang = this._lang = pickLang(c, this._hass), T = k => esc(this._tr(k)), title = this._title();
    const all = (this._list() || []).filter(k => !k.endsWith("_soil") || c.programmes), nameSt = this._hass?.states[`sensor.${this._p}_program_name`];
    const L = k => progLabel(k, c, this._hass, nameSt);
    const favs = Array.isArray(c.favourites) && c.favourites.length ? c.favourites.map(String) : [];
    const btn = k => `<button class="prog" data-k="${esc(k)}">${esc(L(k))}</button>`;
    // without favourites the whole list is shown straight away (soil variants hidden: they start the same programme with a soil level)
    const shown = favs.length ? favs : all;
    const r = this.shadowRoot || this.attachShadow({ mode: "open" });
    r.innerHTML = `<style>${PCSS}</style><ha-card style="--c:${esc(c.colour)}">
      <div class="head"><span>${esc(this._tr("progs_title", title))}</span><button class="small" id="more" ${favs.length && all.length ? "" : "hidden"}>${T("All programmes")}</button></div>
      <div class="note" id="note" hidden></div>
      <div class="note info" id="info" ${shown.length ? "hidden" : ""}>${esc(this._tr("reading"))}</div>
      <div class="grid" id="favs">${shown.map(btn).join("")}</div>
      <div class="all" id="all" hidden><input id="q" type="search" placeholder="${esc(this._tr("search", all.length))}">
        <div class="grid" id="list">${[...all].sort((x, y) => L(x).localeCompare(L(y), lang)).map(btn).join("")}</div></div>
      <div class="confirm" id="confirm" hidden><span id="ask"></span>
        <button class="small" id="no">${T("Cancel")}</button><button class="small go" id="yes">${T("Start")}</button></div>
    </ha-card>`;
    r.getElementById("more").addEventListener("click", () => {
      const a = r.getElementById("all"); a.hidden = !a.hidden;
      r.getElementById("more").textContent = this._tr(a.hidden ? "All programmes" : "Favourites only");
    });
    r.getElementById("q").addEventListener("input", e => {
      const q = e.target.value.toLowerCase();
      r.querySelectorAll("#list .prog").forEach(b => { b.hidden = !b.textContent.toLowerCase().includes(q); });
    });
    r.querySelectorAll(".prog").forEach(b => b.addEventListener("click", () => this._pick(b.dataset.k)));
    r.getElementById("no").addEventListener("click", () => this._pick(null));
    r.getElementById("yes").addEventListener("click", () => this._start());
    if (!all.length && this._hass) this._fetchList();
  }
  _pick(k) {
    const r = this.shadowRoot;
    if (k && (this._running || this._remote === false)) {
      r.getElementById("note").animate([{ transform: "scale(1)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }], 300);
      return;
    }
    this._sel = k;
    r.querySelectorAll(".prog").forEach(b => b.classList.toggle("sel", b.dataset.k === k));
    r.getElementById("confirm").hidden = !k;
    if (k) r.getElementById("ask").textContent = this._tr("start_q",
      progLabel(k, this._config, this._hass, this._hass?.states[`sensor.${this._p}_program_name`]), this._title());
  }
  async _start() {
    const k = this._sel, dev = this._dev(), n = this.shadowRoot.getElementById("note");
    this._pick(null);
    if (!k) return;
    if (!dev) { n.hidden = false; n.textContent = this._tr("no_device"); this._err = true; return; }
    try {
      await this._hass.callService("hon", "start_program", { program: k, parameters: "{}" }, { device_id: dev });
      try { localStorage.setItem(`hon-dw-started-${this._p}`, JSON.stringify({ k, at: Date.now() })); } catch (e) {}
    } catch (e) { n.hidden = false; n.textContent = this._tr("start_err", e.message || e); this._err = true; }
  }
  _render() {
    const r = this.shadowRoot, h = this._hass; if (!r || !h || !r.getElementById("note")) return;
    const mode = this._val("mode");
    const running = (this._st(`binary_sensor.${this._p}_status`)?.state === "on" || RUNNING.includes(mode)) && RUNNING.includes(mode);
    this._remote = this._bin("remote_control");
    this._running = running;
    const n = r.getElementById("note"), name = this._title();
    if (!this._err || running) {
      this._err = false;
      n.hidden = !running && this._remote !== false;
      n.textContent = this._tr(running ? "running_note" : "remote_off", name);
    }
    if (running) this._pick(null);
  }
}
if (!customElements.get("hon-dishwasher-programmes-card")) customElements.define("hon-dishwasher-programmes-card", HonDishwasherProgrammesCard);
if (!window.customCards.some(c => c.type === "hon-dishwasher-programmes-card"))
  window.customCards.push({ type: "hon-dishwasher-programmes-card", name: "hOn dishwasher programmes", description: "Start dishwasher programmes" });
console.info(`%c HON-DISHWASHER-CARD %c v${HDW_VERSION} `, "background:#5ab4ff;color:#000;font-weight:700", "background:#222;color:#fff");
