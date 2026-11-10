import zlib from 'zlib';

export interface BatteryWidgetState {
  /** Calories accumulated/eaten today that need to be burned */
  kcal: number;
  /** Target daily goal in kcal */
  goalKcal: number;
  /** Streak count in consecutive days */
  streak: number;
  /** 7-element boolean array for Mon..Sun (0=Mon .. 6=Sun) */
  days: boolean[];
  /** Index of current day (0=Mon .. 6=Sun) */
  todayIdx: number;
  /** Last action note shown in HUD */
  note?: string;
}

export function getDefaultWidgetState(): BatteryWidgetState {
  // Convert JS getDay() (0=Sun..6=Sat) -> 0=Mon..6=Sun
  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

  // Give user an encouraging starting streak up to yesterday
  const days = [false, false, false, false, false, false, false];
  for (let i = Math.max(0, todayIdx - 2); i < todayIdx; i++) {
    days[i] = true;
  }

  return {
    kcal: 350,
    goalKcal: 600,
    streak: Math.max(1, days.filter(Boolean).length + 1),
    days,
    todayIdx,
    note: 'Заряд готов к пробежке',
  };
}

export function parseWidgetState(raw?: string | null): BatteryWidgetState {
  if (!raw) return getDefaultWidgetState();
  try {
    const parsed = JSON.parse(raw);
    const def = getDefaultWidgetState();
    return {
      kcal: typeof parsed.kcal === 'number' ? Math.max(0, Math.min(3000, parsed.kcal)) : def.kcal,
      goalKcal: typeof parsed.goalKcal === 'number' ? parsed.goalKcal : def.goalKcal,
      streak: typeof parsed.streak === 'number' ? parsed.streak : def.streak,
      days: Array.isArray(parsed.days) && parsed.days.length === 7 ? parsed.days : def.days,
      todayIdx: typeof parsed.todayIdx === 'number' ? parsed.todayIdx : def.todayIdx,
      note: typeof parsed.note === 'string' ? parsed.note : def.note,
    };
  } catch {
    return getDefaultWidgetState();
  }
}

export function applyWidgetAction(state: BatteryWidgetState, action: string): BatteryWidgetState {
  const next: BatteryWidgetState = {
    ...state,
    days: [...state.days],
  };

  if (action === 'add150') {
    next.kcal = Math.min(3000, next.kcal + 150);
    next.note = '+150 ккал (перекус / кофе)';
  } else if (action === 'add300') {
    next.kcal = Math.min(3000, next.kcal + 300);
    next.note = '+300 ккал (пицца / бургер)';
  } else if (action === 'burn200') {
    next.kcal = Math.max(0, next.kcal - 200);
    next.note = '-200 ккал сожжено на трассе!';
    if (next.kcal === 0 && !next.days[next.todayIdx]) {
      next.days[next.todayIdx] = true;
      next.streak = next.days.filter(Boolean).length;
      next.note = 'День закрыт! Стрик продлён!';
    }
  } else if (action === 'done') {
    const wasDone = next.days[next.todayIdx];
    next.days[next.todayIdx] = !wasDone;
    if (!wasDone) {
      next.kcal = 0;
      next.note = 'День закрыт! Так держать!';
    } else {
      next.note = 'Отметка дня снята';
    }
    next.streak = Math.max(1, next.days.filter(Boolean).length);
  } else if (action === 'reset') {
    next.kcal = 0;
    next.note = 'Батарейка сброшена на 0 ккал';
  }

  return next;
}

/**
 * Generates ultra-compact self-contained HTML for Telegram Bot API 10.4 In-Message Widget.
 * Guaranteed < 4 KB when compressed with zlib level 9.
 */
export function buildBatteryStreakWidgetHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
body{background:#08090C;color:#fff;padding:14px;border-radius:16px;border:1px solid rgba(198,255,51,.25);overflow:hidden}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.brand{font-size:11px;font-weight:900;letter-spacing:1.2px;color:#C6FF33;text-transform:uppercase;display:flex;align-items:center;gap:6px}
.dot{width:7px;height:7px;border-radius:50%;background:#C6FF33;box-shadow:0 0 8px #C6FF33}
.streak{background:rgba(125,57,235,.22);border:1px solid rgba(125,57,235,.55);color:#E9D5FF;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px}
.streak b{color:#C6FF33}
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:14px}
.day{background:#12151F;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:6px 2px;text-align:center;transition:.2s}
.day span{display:block;font-size:9px;color:#8E95A5;font-weight:700;margin-bottom:3px}
.day i{display:inline-flex;width:18px;height:18px;border-radius:50%;align-items:center;justify-content:center;font-style:normal;font-size:10px;font-weight:900;background:#1A1F2E;color:#555}
.day.on{border-color:rgba(198,255,51,.5);background:rgba(198,255,51,.08)}
.day.on span{color:#C6FF33}
.day.on i{background:#C6FF33;color:#08090C;box-shadow:0 0 10px rgba(198,255,51,.4)}
.day.cur{border-color:#7D39EB;box-shadow:0 0 10px rgba(125,57,235,.35)}
.bat-box{background:#12151F;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;margin-bottom:12px}
.stats{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px}
.kcal{font-size:28px;font-weight:900;line-height:1;color:#fff}
.kcal small{font-size:12px;color:#8E95A5;font-weight:700;margin-left:3px}
.km{text-align:right}
.km b{display:block;font-size:16px;font-weight:900;color:#C6FF33}
.km span{font-size:10px;color:#8E95A5}
.bar-wrap{height:14px;background:#08090C;border-radius:999px;padding:2px;border:1px solid rgba(255,255,255,.1);overflow:hidden}
.bar{height:100%;border-radius:999px;background:linear-gradient(90deg,#C6FF33,#7D39EB);transition:width .3s ease;min-width:6%}
.note{font-size:10px;color:#9CA3AF;margin-top:7px;display:flex;justify-content:space-between}
.btns{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
button{border:none;border-radius:999px;padding:9px 8px;font-size:11px;font-weight:800;cursor:pointer;transition:transform .1s}
button:active{transform:scale(.95)}
.b-add{background:#1A1F2E;color:#fff;border:1px solid rgba(255,255,255,.12)}
.b-burn{background:#7D39EB;color:#fff}
.b-done{background:#C6FF33;color:#08090C}
</style>
</head>
<body>
<div class="top">
  <div class="brand"><span class="dot"></span>БАТАРЕЙКА ДНЯ</div>
  <div class="streak">🔥 СТРИК: <b id="st">1</b> ДН</div>
</div>
<div class="days" id="days"></div>
<div class="bat-box">
  <div class="stats">
    <div class="kcal"><span id="kc">350</span><small>ккал</small></div>
    <div class="km"><b id="km">3.2 км</b><span>на маршруте</span></div>
  </div>
  <div class="bar-wrap"><div class="bar" id="bar" style="width:58%"></div></div>
  <div class="note"><span id="nt">Заряд готов к пробежке</span><span id="pct">58%</span></div>
</div>
<div class="btns">
  <button class="b-add" onclick="act('add150')">+150 ккал ☕</button>
  <button class="b-add" onclick="act('add300')">+300 ккал 🍕</button>
  <button class="b-burn" onclick="act('burn200')">-200 ккал 🏃</button>
  <button class="b-done" onclick="act('done')" id="dbtn">✅ Закрыть день</button>
</div>
<script>
const L=['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
let S={kcal:350,goalKcal:600,streak:1,days:[0,0,0,0,0,0,0],todayIdx:0,note:'Заряд готов'};
function parse(r){try{if(r){const p=JSON.parse(r);if(p&&typeof p.kcal==='number')S=p;}}catch(e){}}
function render(){
  document.getElementById('kc').textContent=S.kcal;
  const dist=S.kcal<=0?'0.0':Math.min(5.8,Math.max(1.2,Math.round((S.kcal/110)*10)/10)).toFixed(1);
  document.getElementById('km').textContent=dist+' км';
  document.getElementById('st').textContent=S.streak||1;
  document.getElementById('nt').textContent=S.note||'Готов к старту';
  const pct=Math.min(100,Math.round((S.kcal/(S.goalKcal||600))*100));
  document.getElementById('pct').textContent=pct+'%';
  const b=document.getElementById('bar');
  b.style.width=(S.kcal===0?4:pct)+'%';
  b.style.background=S.kcal>700?'linear-gradient(90deg,#F59E0B,#EF4444)':'linear-gradient(90deg,#C6FF33,#7D39EB)';
  const d=document.getElementById('days');
  d.innerHTML='';
  L.forEach((lbl,i)=>{
    const on=S.days&&S.days[i];
    const cur=i===S.todayIdx;
    const el=document.createElement('div');
    el.className='day'+(on?' on':'')+(cur?' cur':'');
    el.innerHTML='<span>'+lbl+'</span><i>'+(on?'✓':(cur?'⚡':'•'))+'</i>';
    d.appendChild(el);
  });
  document.getElementById('dbtn').textContent=(S.days&&S.days[S.todayIdx])?'↩️ Отменить день':'✅ Закрыть день';
}
function act(a){
  if(a==='add150'){S.kcal=Math.min(3000,S.kcal+150);S.note='+150 ккал (перекус)';}
  else if(a==='add300'){S.kcal=Math.min(3000,S.kcal+300);S.note='+300 ккал (пицца)';}
  else if(a==='burn200'){S.kcal=Math.max(0,S.kcal-200);S.note='-200 ккал сожжено!';if(S.kcal===0&&!S.days[S.todayIdx]){S.days[S.todayIdx]=1;S.streak=S.days.filter(Boolean).length;}}
  else if(a==='done'){const w=S.days[S.todayIdx];S.days[S.todayIdx]=!w;if(!w){S.kcal=0;S.note='День закрыт!';}else{S.note='Отметка снята';}S.streak=Math.max(1,S.days.filter(Boolean).length);}
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

export function getCompressedWidgetByteLength(): number {
  const html = buildBatteryStreakWidgetHtml();
  return zlib.deflateSync(Buffer.from(html, 'utf-8'), { level: 9 }).length;
}
