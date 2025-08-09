// Laura-Simulator v3 — Chaos Arcade (humor, shortcuts, haptics, QTE boss)

const UI = sel => document.querySelector(sel);
const ui = {
  soundBtn: UI('#soundBtn'),
  hapticsBtn: UI('#hapticsBtn'),
  helpBtn: UI('#helpBtn'),
  restartBtn: UI('#restartBtn'),
  bestTime: UI('#bestTime'),
  bestScore: UI('#bestScore'),
  scoreVal: UI('#scoreVal'),
  comboBar: UI('#comboBar'),
  comboVal: UI('#comboVal'),
  chaosBar: UI('#chaosBar'),
  chaosVal: UI('#chaosVal'),
  timeVal: UI('#timeVal'),
  prompt: UI('#prompt'),
  choices: UI('#choices'),
  logList: UI('#logList'),
  mouth: UI('#mouth'),
  bubble: UI('#bubble'),
  confetti: UI('#confetti'),
  help: UI('#help'),
  end: UI('#end'),
  endTitle: UI('#endTitle'),
  endText: UI('#endText'),
  playAgain: UI('#playAgain'),
  boss: UI('#boss'),
  bossText: UI('#bossText'),
  bossRage: UI('#bossRage'),
  seq: UI('#seq'),
  bossGiveUp: UI('#bossGiveUp'),
};

const state = {
  score: 0,
  combo: 1,
  comboProg: 0, // 0..100
  chaos: 0,     // 0..100
  time: 3*60,
  alive: true,
  tick: null,
  startedAt: null,
  soundOn: false,
  haptics: true,
  audio: null,
  bossActive: false,
};

// Sound (WebAudio)
function initAudio(){
  if (state.audio) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
  state.audio = { ctx, master };
}
function tone(f=440,d=0.12,t="sine",v=0.35){
  if (!state.soundOn || !state.audio) return;
  const {ctx,master}=state.audio; const o=ctx.createOscillator(); const g=ctx.createGain();
  o.type=t;o.frequency.value=f; g.gain.value=0; o.connect(g).connect(master);
  const n=ctx.currentTime; g.gain.linearRampToValueAtTime(v,n+0.01); g.gain.exponentialRampToValueAtTime(0.0001,n+d);
  o.start(n); o.stop(n+d+0.02);
}
const sfx = {
  click: ()=>tone(750,0.08,"square",0.25),
  good:  ()=>{tone(620,0.10,"triangle",0.3); setTimeout(()=>tone(780,0.12,"triangle",0.25),90)},
  bad:   ()=>{tone(220,0.18,"sawtooth",0.35);},
  cry:   ()=>{tone(320,0.15,"triangle",0.3); setTimeout(()=>tone(260,0.18,"sawtooth",0.28),100)},
  boss:  ()=>{tone(130,0.25,"sawtooth",0.4); setTimeout(()=>tone(230,0.2,"square",0.35),200)},
  win:   ()=>{tone(660,0.12,"triangle",0.35); setTimeout(()=>tone(880,0.16,"triangle",0.35),120); setTimeout(()=>tone(990,0.18,"triangle",0.35),220)},
  lose:  ()=>{tone(200,0.22,"sawtooth",0.4); setTimeout(()=>tone(160,0.30,"sawtooth",0.35),140)},
  lol:   ()=>{tone(300,0.07,"square",0.2); setTimeout(()=>tone(500,0.07,"square",0.2),70); setTimeout(()=>tone(700,0.07,"square",0.2),140);},
};

// Haptics
function buzz(pattern=[20]){
  if (!state.haptics) return;
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

// Utils
function fmtTime(s){const m=String(Math.floor(s/60)).padStart(2,"0");const ss=String(s%60).padStart(2,"0");return `${m}:${ss}`;}
function log(line){const li=document.createElement('li');li.innerHTML=line;ui.logList.prepend(li);}
function bubble(text,ms=1100){ui.bubble.textContent=text;ui.bubble.classList.remove('hidden');setTimeout(()=>ui.bubble.classList.add('hidden'),ms);}
function setMouthCry(on){ui.mouth.classList.toggle('cry',on);}
function confetti(){
  ui.confetti.innerHTML="";
  const n=18;
  for(let i=0;i<n;i++){
    const span=document.createElement('span');
    span.style.position='absolute';
    span.style.left=Math.random()*100+'%';
    span.style.top='-10px';
    span.style.fontSize=(12+Math.random()*12)+'px';
    span.textContent=['✨','🎉','🧃','🧸','🍪'][Math.floor(Math.random()*5)];
    ui.confetti.appendChild(span);
    const y=120+Math.random()*200;
    span.animate([{transform:`translateY(0)`},{transform:`translateY(${y}px)`}],{duration:800+Math.random()*600,fill:'forwards'});
  }
}

// Silly scenarios
const ZICKS = ["NEIN!!", "FALSCH!!", "IHHH", "Das ist illegal!", "MÖCHTE JETZT!", "Uff, cringe.", "Du bist lahm."];
const scenarios = [
  s("Du gibst Laura eine Banane. Sie wollte Quetschbanane aus der goldenen Schüssel.", 
    ["Mit Gabel zerquetschen (live ASMR)", "Goldene Schüssel mimt man halt", "Einfach Banane dabben lassen"],
    ["asmr","pretend","dab"]),
  s("Du spielst Musik. Es ist NICHT die Babyhai-Remix-Version.", 
    ["Beatbox-Remix (peinlich, aber laut)", "Bluetooth mit Toaster koppeln", "Mikro in die Ente halten"],
    ["remix","toaster","ente"]),
  s("Du baust einen Turm. Laura zerstört ihn wie Godzilla.", 
    ["Größeren Turm bauen (Flex)", "Papierkrone verleihen: 'Bürgermeisterin von Kaputt'", "UNO Karte +4 ziehen"],
    ["bigturm","krone","uno"]),
  s("Falsche Sockenfarbe. Weltuntergang Deluxe.", 
    ["Socken innen nach außen (neue Farbe?)", "Beide Füße unterschiedlich (Fashion)", "Socken-Rap droppen"],
    ["insideout","mixmatch","rap"]),
  s("Snack-Zeit. Du reichst Reiswaffel. Sie will 'das Runde, aber eckig'.",
    ["Keks rund abschneiden (Kunst!)", "Eckigen Teller rund denken", "Keks in Pixeln servieren"],
    ["craft","philosophy","pixels"]),
  s("Sie will den Lichtschalter 47 mal drücken. Mietvertrag weint.",
    ["Speedrun PB 47, LET'S GO", "Schalter-Moderator: 'Und… AUS!'", "Ich winke dem Stromzähler"],
    ["speedrun","moderator","strom"]),
];

function s(prompt,choices,ids){return {prompt, choices: choices.map((c,i)=>({text:c, tag: ids[i]}))};}

// Action effects (purely for comedy/arcade)
const effects = {
  asmr:      {score:+60, chaos:+8,  combo:+1, say:"*quatsch quatsch*"},
  pretend:   {score:+40, chaos:+12, combo:+1, say:"'Goldene' ist Einstellungssache."},
  dab:       {score:+70, chaos:+15, combo:+2, say:"Laura dabbed. Publikum booed."},
  remix:     {score:+55, chaos:+10, combo:+1, say:"Babyhai x Drum'n'Bass 🔥"},
  toaster:   {score:+30, chaos:+20, combo:0,  say:"Toaster connected: 'brrrr'"},
  ente:      {score:+45, chaos:+9,  combo:+1, say:"Enten-Autotune aktiviert."},
  bigturm:   {score:+65, chaos:+14, combo:+2, say:"Mach’s größer. Immer hilft."},
  krone:     {score:+80, chaos:+12, combo:+2, say:"Ihre Majestät genehmigt."},
  uno:       {score:+20, chaos:+25, combo:0,  say:"+4 auf deine Nerven."},
  insideout: {score:+35, chaos:+9,  combo:+1, say:"Lifehack oder so."},
  mixmatch:  {score:+70, chaos:+10, combo:+2, say:"Streetwear 3000."},
  rap:       {score:+55, chaos:+18, combo:+1, say:"'Socke links ist wild…'"},
  craft:     {score:+50, chaos:+12, combo:+1, say:"Keks-Designer: du."},
  philosophy:{score:+42, chaos:+8,  combo:+1, say:"Form ist nur Konzept."},
  pixels:    {score:+66, chaos:+16, combo:+2, say:"Minecraft-Keks."},
  speedrun:  {score:+77, chaos:+19, combo:+2, say:"WR? vielleicht."},
  moderator: {score:+48, chaos:+11, combo:+1, say:"'Danke, das war’s'"},
  strom:     {score:+25, chaos:+21, combo:0,  say:"Zähler applauds."},
};

function updateHUD(){
  ui.scoreVal.textContent = state.score;
  ui.comboVal.textContent = `x${state.combo}`;
  ui.comboBar.style.width = `${state.comboProg}%`;
  ui.chaosBar.style.width = `${state.chaos}%`;
  ui.chaosVal.textContent = Math.round(state.chaos);
  ui.timeVal.textContent = fmtTime(state.time);
}

function renderScenario(){
  const sc = scenarios[Math.floor(Math.random()*scenarios.length)];
  ui.prompt.textContent = sc.prompt;
  ui.choices.innerHTML = "";
  sc.choices.forEach((c, idx)=>{
    const b=document.createElement('button');
    b.innerHTML = `<b>${idx+1}.</b> ${c.text}`;
    b.addEventListener('click', ()=> choose(c.tag, c.text));
    ui.choices.appendChild(b);
  });
}

function choose(tag, text){
  if (!state.alive || state.bossActive) return;
  sfx.click(); buzz([12]);
  // Laura reacts
  setMouthCry(true); sfx.cry(); bubble(ZICKS[Math.floor(Math.random()*ZICKS.length)]);
  log(`Laura: 😭 <small>(du: „${text}“)</small>`);
  // apply effect after short chaos
  setTimeout(()=>{
    setMouthCry(false);
    const e = effects[tag];
    const comboMult = state.combo;
    const deltaScore = Math.max(0, e.score * comboMult);
    state.score += deltaScore;
    state.chaos = Math.min(100, state.chaos + e.chaos);
    // combo logic
    if (e.combo>0){
      state.combo = Math.min(9, state.combo + e.combo);
      state.comboProg = Math.min(100, state.comboProg + 20);
      sfx.good(); bubble(e.say, 900); confetti();
    } else {
      // break combo a bit
      state.combo = Math.max(1, Math.floor(state.combo*0.6));
      state.comboProg = Math.max(0, state.comboProg - 25);
      sfx.bad(); bubble("lol nope", 700);
    }
    // passive decay of combo meter
    updateHUD();
    maybeAchievements(tag, deltaScore);
    if (state.chaos >= 100){ startBoss(); }
    else { renderScenario(); }
  }, 650);
}

function tick(){
  if (!state.alive) return;
  state.time--;
  // combo meter bleeds slowly
  state.comboProg = Math.max(0, state.comboProg - 2);
  if (state.comboProg===0 && state.combo>1) state.combo--;
  // random micro-chaos
  if (state.time % 9 === 0) state.chaos = Math.min(100, state.chaos + 1);
  updateHUD();
  if (state.time<=0){ end(true); }
}

function start(){
  state.score=0; state.combo=1; state.comboProg=0; state.chaos=0; state.time=3*60; state.alive=true; state.bossActive=false;
  ui.logList.innerHTML=""; updateHUD(); renderScenario();
  clearInterval(state.tick); state.tick=setInterval(tick,1000);
  state.startedAt=Date.now();
}

// Bossfight (QTE)
const QKEYS = ["J","K","L",";"];
function startBoss(){
  state.bossActive = true; sfx.boss(); buzz([60,30,60]);
  ui.boss.showModal();
  let rage = 0; // 0..100 (fill = lose)
  ui.bossRage.style.width = `${rage}%`;
  const seq = Array.from({length:5+Math.floor(Math.random()*3)}, ()=> QKEYS[Math.floor(Math.random()*QKEYS.length)]);
  ui.seq.innerHTML = "";
  seq.forEach(k=>{ const div=document.createElement('div'); div.className='box'; div.textContent=k; ui.seq.appendChild(div); });

  let idx = 0;
  function advance(ok){
    if (ok){ idx++; sfx.good(); buzz([10]); ui.seq.children[idx-1].style.borderColor="#3ddc97"; }
    else { rage = Math.min(100, rage+25); ui.bossRage.style.width=`${rage}%`; sfx.bad(); buzz([40]); shake(); }
    if (idx>=seq.length){
      // win
      ui.boss.close(); state.bossActive=false;
      state.chaos = 10; state.score += 200; confetti(); sfx.win(); bubble("Boss besiegt 🔥",1000);
      renderScenario(); updateHUD(); return;
    }
    if (rage>=100){
      // lose
      ui.boss.close(); sfx.lose(); state.alive=false; end(false);
    }
  }

  function onKey(e){
    if (!state.bossActive) return;
    const key = e.key.toUpperCase();
    if (QKEYS.includes(key) || (key===';' && QKEYS.includes(';'))){
      advance(key === seq[idx]);
    }
  }
  window.addEventListener('keydown', onKey, { once:false });
  // slow rage increase over time
  const bossTimer = setInterval(()=>{
    if (!state.bossActive){ clearInterval(bossTimer); window.removeEventListener('keydown', onKey); return;}
    rage = Math.min(100, rage+5); ui.bossRage.style.width=`${rage}%`;
    if (rage>=100){ clearInterval(bossTimer); window.removeEventListener('keydown', onKey); ui.boss.close(); sfx.lose(); state.alive=false; end(false); }
  }, 700);

  ui.bossGiveUp.onclick = ()=>{
    ui.boss.close(); clearInterval(bossTimer); window.removeEventListener('keydown', onKey);
    state.alive=false; end(false);
  };
}

function shake(){
  document.body.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:180});
}

// Achievements (silly)
function toast(txt){
  log(`🏆 ${txt}`);
  bubble(txt, 900);
  sfx.lol(); confetti();
}
function maybeAchievements(tag, deltaScore){
  if (deltaScore>=200) toast("Point Goblin");
  if (tag==="mixmatch" && state.combo>=5) toast("Fashion Icon");
  if (tag==="speedrun" && state.chaos>=90) toast("Light Switch Any%");
}

// End
function end(win){
  clearInterval(state.tick);
  const survived = Math.max(0, ((Date.now()-state.startedAt)/1000)|0);
  const prevBest = parseInt(localStorage.getItem("lauraBestTime")||"0",10);
  const prevScore = parseInt(localStorage.getItem("lauraHighScore")||"0",10);
  if (survived>prevBest) localStorage.setItem("lauraBestTime", String(survived));
  if (state.score>prevScore) localStorage.setItem("lauraHighScore", String(state.score));
  ui.bestTime.textContent = fmtTime(parseInt(localStorage.getItem("lauraBestTime")||"0",10));
  ui.bestScore.textContent = localStorage.getItem("lauraHighScore")||"0";

  ui.endTitle.textContent = win ? "W" : "L";
  ui.endText.textContent = win
    ? "Du hast das Chaos überlebt. Screenshot an die Gruppe, danke."
    : "Laura hat dich geclapped. Versuch’s nochmal, Speedrunner.";
  (win ? sfx.win : sfx.lose)();
  buzz(win ? [40,40,40] : [120,50,120]);
  ui.end.showModal();
}

// Controls & init
function bindShortcuts(){
  window.addEventListener('keydown', (e)=>{
    if (state.bossActive) return;
    const n = Number(e.key);
    if ([1,2,3].includes(n)){
      const btn = ui.choices.children[n-1];
      if (btn){ btn.click(); }
    }
  });
}

function init(){
  ui.helpBtn.addEventListener('click', ()=> ui.help.showModal());
  ui.playAgain.addEventListener('click', ()=>{ ui.end.close(); start(); });
  ui.restartBtn.addEventListener('click', start);

  ui.soundBtn.addEventListener('click', ()=>{
    if (!state.audio) initAudio();
    state.soundOn = !state.soundOn;
    ui.soundBtn.setAttribute('aria-pressed', String(state.soundOn));
    ui.soundBtn.textContent = state.soundOn ? "🔊 Sound" : "🔈 Sound";
    if (state.soundOn) sfx.click();
  });

  ui.hapticsBtn.addEventListener('click', ()=>{
    state.haptics = !state.haptics;
    ui.hapticsBtn.setAttribute('aria-pressed', String(state.haptics));
    ui.hapticsBtn.textContent = state.haptics ? "📳 Haptics" : "📴 Haptics";
    if (state.haptics) buzz([30]);
  });

  ui.bestTime.textContent = fmtTime(parseInt(localStorage.getItem("lauraBestTime")||"0",10));
  ui.bestScore.textContent = localStorage.getItem("lauraHighScore")||"0";
  bindShortcuts();
  start();
}

document.addEventListener('DOMContentLoaded', ()=>{
  // pre-init audio context lazily
  document.body.addEventListener('pointerdown', ()=>{ if (!state.audio && state.soundOn) initAudio(); }, { once:true });
  init();
});
