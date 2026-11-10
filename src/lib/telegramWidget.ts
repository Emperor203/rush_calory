import zlib from 'zlib';

export interface StreakResultsWidgetState {
  /** Daily flame streak count (consecutive days) */
  streak: number;
  /** 7-element boolean array for Mon..Sun */
  days: boolean[];
  /** Current day index (0=Mon .. 6=Sun) */
  todayIdx: number;
  /** Total distance run in km */
  totalKm: number;
  /** Total calories burned in kcal */
  totalKcal: number;
  /** Number of completed workouts */
  runsCount: number;
  /** Personal best single run distance in km */
  bestKm: number;
  /** Status note shown in HUD */
  note?: string;
}

export function getTodayWeekdayIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function getDefaultStreakResultsState(): StreakResultsWidgetState {
  const todayIdx = getTodayWeekdayIndex();
  const days = [false, false, false, false, false, false, false];
  // Auto-light today's flame upon entering
  for (let i = Math.max(0, todayIdx - 2); i <= todayIdx; i++) {
    days[i] = true;
  }
  const streak = Math.max(1, days.filter(Boolean).length);

  return {
    streak,
    days,
    todayIdx,
    totalKm: 0,
    totalKcal: 0,
    runsCount: 0,
    bestKm: 0,
    note: '🔥 Огонёк за вход зажжён! Стрик активен',
  };
}

export function parseStreakResultsState(raw?: string | null): StreakResultsWidgetState {
  if (!raw) return getDefaultStreakResultsState();
  try {
    const p = JSON.parse(raw);
    const def = getDefaultStreakResultsState();
    return {
      streak: typeof p.streak === 'number' ? Math.max(1, p.streak) : def.streak,
      days: Array.isArray(p.days) && p.days.length === 7 ? p.days : def.days,
      todayIdx: typeof p.todayIdx === 'number' ? p.todayIdx : def.todayIdx,
      totalKm: typeof p.totalKm === 'number' ? Math.max(0, p.totalKm) : 0,
      totalKcal: typeof p.totalKcal === 'number' ? Math.max(0, p.totalKcal) : 0,
      runsCount: typeof p.runsCount === 'number' ? Math.max(0, p.runsCount) : 0,
      bestKm: typeof p.bestKm === 'number' ? Math.max(0, p.bestKm) : 0,
      note: typeof p.note === 'string' ? p.note : def.note,
    };
  } catch {
    return getDefaultStreakResultsState();
  }
}

export function applyStreakResultsAction(
  state: StreakResultsWidgetState,
  action: string,
): StreakResultsWidgetState {
  const next: StreakResultsWidgetState = {
    ...state,
    days: [...state.days],
  };

  if (!next.days[next.todayIdx]) {
    next.days[next.todayIdx] = true;
    next.streak = Math.max(1, next.days.filter(Boolean).length);
  }

  if (action === 'add_run') {
    next.totalKm = Math.round((next.totalKm + 1.0) * 10) / 10;
    next.totalKcal = next.totalKcal + 72;
    next.runsCount = next.runsCount + 1;
    next.bestKm = Math.max(next.bestKm, 1.0);
    next.note = `🏁 +1.0 км добавлено в результаты!`;
  } else if (action === 'claim') {
    next.note = `🔥 Огонёк активен! Стрик: ${next.streak} дн. подряд`;
  }

  return next;
}

/**
 * Generates ultra-compact self-contained HTML for Telegram Bot API 10.4 In-Message Widget:
 * Daily Flame Streak + Athlete Real Results & Rank Progression.
 * Guaranteed < 4 KB when compressed with zlib level 9.
 */
export function buildStreakResultsWidgetHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
body{background:#08090C;color:#fff;padding:13px;border-radius:16px;border:1px solid rgba(198,255,51,.3);overflow:hidden}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.brand{font-size:10px;font-weight:900;letter-spacing:1.1px;color:#C6FF33;text-transform:uppercase;display:flex;align-items:center;gap:5px}
.dot{width:7px;height:7px;border-radius:50%;background:#FF6B00;box-shadow:0 0 8px #FF6B00}
.streak{background:rgba(255,107,0,.2);border:1px solid rgba(255,107,0,.6);color:#FED7AA;font-size:10px;font-weight:900;padding:3px 9px;border-radius:999px}
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:10px}
.day{background:#12151F;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:5px 2px;text-align:center}
.day span{display:block;font-size:8px;color:#8E95A5;font-weight:700;margin-bottom:2px}
.day i{display:inline-flex;width:18px;height:18px;border-radius:50%;align-items:center;justify-content:center;font-style:normal;font-size:10px;background:#1A1F2E;color:#555}
.day.on{border-color:rgba(255,140,0,.55);background:rgba(255,107,0,.14)}
.day.on span{color:#FDBA74}
.day.on i{background:linear-gradient(135deg,#FF8C00,#FF3D00);color:#fff;box-shadow:0 0 8px rgba(255,107,0,.45)}
.day.cur{border-color:#C6FF33}
.rank{background:#12151F;border:1px solid rgba(125,57,235,.45);border-radius:12px;padding:10px 11px;margin-bottom:10px}
.r-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:11px;font-weight:900}
.r-name{color:#fff}
.r-next{color:#C6FF33;font-size:10px}
.bar-bg{height:8px;background:#08090C;border-radius:999px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}
.bar{height:100%;background:linear-gradient(90deg,#C6FF33,#7D39EB);border-radius:999px;transition:.3s}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
.card{background:#12151F;border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:8px 6px;text-align:center}
.card span{display:block;font-size:8px;color:#8E95A5;text-transform:uppercase;font-weight:700;margin-bottom:2px}
.card b{font-size:15px;font-weight:900;color:#fff}
.card.hi b{color:#C6FF33}
.note{font-size:10px;color:#FDBA74;text-align:center;margin-bottom:9px;font-weight:700}
.btns{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.btn{border:none;border-radius:999px;padding:9px 6px;font-size:11px;font-weight:900;cursor:pointer}
.btn:active{transform:scale(.95)}
.b-fl{background:linear-gradient(135deg,#FF8C00,#FF4500);color:#fff}
.b-run{background:#C6FF33;color:#08090C}
</style>
</head>
<body>
<div class="top">
  <div class="brand"><span class="dot"></span>СТРИК &amp; РЕЗУЛЬТАТЫ</div>
  <div class="streak">🔥 <span id="st">3</span> ДН ПОДРЯД</div>
</div>
<div class="days" id="days"></div>
<div class="rank">
  <div class="r-top"><span class="r-name" id="rn">🪵 ДЕРЕВО</span><span class="r-next" id="nx">До БРОНЗЫ: 5.0 км</span></div>
  <div class="bar-bg"><div class="bar" id="bar" style="width:10%"></div></div>
</div>
<div class="grid">
  <div class="card hi"><span>Пробег</span><b id="km">0.0 км</b></div>
  <div class="card"><span>Сожжено</span><b id="kc">0 ккал</b></div>
  <div class="card"><span>Забегов</span><b id="rc">0</b></div>
</div>
<div class="note" id="nt">🔥 Огонёк за вход зажжён!</div>
<div class="btns">
  <button class="btn b-fl" onclick="act('claim')">🔥 Мой огонёк</button>
  <button class="btn b-run" onclick="act('add_run')">🏁 +1 км в зачёт</button>
</div>
<script>
const L=['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
const T=[{n:'🪵 ДЕРЕВО',m:0,x:5},{n:'🥉 БРОНЗА',m:5,x:25},{n:'🥈 СЕРЕБРО',m:25,x:60},{n:'🥇 ЗОЛОТО',m:60,x:150},{n:'💎 ПЛАТИНА',m:150,x:300},{n:'⚡ КАРБОН',m:300,x:9999}];
let S={streak:3,days:[1,1,1,0,0,0,0],todayIdx:2,totalKm:0,totalKcal:0,runsCount:0,bestKm:0,note:'🔥 Огонёк за вход зажжён!'};
function parse(r){try{if(r){const p=JSON.parse(r);if(p&&typeof p.streak==='number')S=p;}}catch(e){}}
function render(){
  if(S.days&&typeof S.todayIdx==='number'&&!S.days[S.todayIdx]){
    S.days[S.todayIdx]=true;
    S.streak=Math.max(1,S.days.filter(Boolean).length);
  }
  const km=S.totalKm||0;
  let ti=0;for(let i=0;i<T.length;i++){if(km>=T[i].m&&km<T[i].x){ti=i;break;}}
  const cur=T[ti],nxt=T[ti+1];
  document.getElementById('rn').textContent=cur.n;
  if(nxt){
    const rem=Math.max(0,nxt.m-km).toFixed(1);
    const pct=Math.min(100,Math.max(4,Math.round(((km-cur.m)/(nxt.m-cur.m))*100)));
    document.getElementById('nx').textContent='До '+nxt.n+': '+rem+' км';
    document.getElementById('bar').style.width=pct+'%';
  }else{
    document.getElementById('nx').textContent='MAX РАНГ!';
    document.getElementById('bar').style.width='100%';
  }
  document.getElementById('st').textContent=S.streak||1;
  document.getElementById('km').textContent=km.toFixed(1)+' км';
  document.getElementById('kc').textContent=(S.totalKcal||0)+' ккал';
  document.getElementById('rc').textContent=S.runsCount||0;
  document.getElementById('nt').textContent=S.note||'🔥 Огонёк активен!';
  const d=document.getElementById('days');d.innerHTML='';
  L.forEach((lbl,i)=>{
    const on=S.days&&S.days[i],c=i===S.todayIdx;
    const el=document.createElement('div');
    el.className='day'+(on?' on':'')+(c?' cur':'');
    el.innerHTML='<span>'+lbl+'</span><i>'+(on?'🔥':'•')+'</i>';
    d.appendChild(el);
  });
}
function act(a){
  if(a==='add_run'){
    S.totalKm=Math.round(((S.totalKm||0)+1)*10)/10;
    S.totalKcal=(S.totalKcal||0)+72;
    S.runsCount=(S.runsCount||0)+1;
    S.note='🏁 +1.0 км добавлено в результаты!';
  }else if(a==='claim'){
    S.note='🔥 Огонёк горит! Стрик: '+(S.streak||1)+' дн.';
  }
  render();
  if(typeof TelegramWidget!=='undefined'&&TelegramWidget.request){
    TelegramWidget.request(a).then(res=>{if(res&&res.result){parse(res.result);render();}}).catch(()=>{});
  }
}
if(typeof TelegramWidget!=='undefined'){
  parse(TelegramWidget.chatData);
  if(TelegramWidget.onEvent){
    TelegramWidget.onEvent('chatDataChanged',()=>{parse(TelegramWidget.chatData);render();});
  }
}
render();
</script>
</body>
</html>`;
}
