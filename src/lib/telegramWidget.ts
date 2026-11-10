import zlib from 'zlib';

export interface CoinsStreakWidgetState {
  /** Total earned RUSH coins */
  coins: number;
  /** Daily flame streak count (consecutive days) */
  streak: number;
  /** 7-element boolean array for Mon..Sun */
  days: boolean[];
  /** Current day index (0=Mon .. 6=Sun) */
  todayIdx: number;
  /** Whether today's daily login coin bonus was claimed */
  dailyClaimed: boolean;
  /** Streak Freeze shields owned */
  freezes: number;
  /** Total km farmed this week */
  weekKm: number;
  /** Status line in HUD */
  note?: string;
}

export function getTodayWeekdayIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function getMultiplier(streak: number): number {
  if (streak >= 7) return 3.0;
  if (streak >= 5) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

export function getDefaultCoinsStreakState(): CoinsStreakWidgetState {
  const todayIdx = getTodayWeekdayIndex();
  const days = [false, false, false, false, false, false, false];
  // Auto-light today's flame upon entering!
  for (let i = Math.max(0, todayIdx - 2); i <= todayIdx; i++) {
    days[i] = true;
  }
  const streak = Math.max(1, days.filter(Boolean).length);
  const mult = getMultiplier(streak);
  const dailyBonus = Math.round(25 * mult);

  return {
    coins: 120 + dailyBonus,
    streak,
    days,
    todayIdx,
    dailyClaimed: true,
    freezes: 0,
    weekKm: 4.5,
    note: `🔥 Огонёк за вход! +${dailyBonus} 🪙 (множитель x${mult})`,
  };
}

export function parseCoinsWidgetState(raw?: string | null): CoinsStreakWidgetState {
  if (!raw) return getDefaultCoinsStreakState();
  try {
    const p = JSON.parse(raw);
    const def = getDefaultCoinsStreakState();
    return {
      coins: typeof p.coins === 'number' ? Math.max(0, p.coins) : def.coins,
      streak: typeof p.streak === 'number' ? Math.max(1, p.streak) : def.streak,
      days: Array.isArray(p.days) && p.days.length === 7 ? p.days : def.days,
      todayIdx: typeof p.todayIdx === 'number' ? p.todayIdx : def.todayIdx,
      dailyClaimed: typeof p.dailyClaimed === 'boolean' ? p.dailyClaimed : true,
      freezes: typeof p.freezes === 'number' ? p.freezes : 0,
      weekKm: typeof p.weekKm === 'number' ? p.weekKm : def.weekKm,
      note: typeof p.note === 'string' ? p.note : def.note,
    };
  } catch {
    return getDefaultCoinsStreakState();
  }
}

export function applyCoinsWidgetAction(state: CoinsStreakWidgetState, action: string): CoinsStreakWidgetState {
  const next: CoinsStreakWidgetState = {
    ...state,
    days: [...state.days],
  };

  if (!next.days[next.todayIdx]) {
    next.days[next.todayIdx] = true;
    next.streak = Math.max(1, next.days.filter(Boolean).length);
  }
  const mult = getMultiplier(next.streak);

  if (action === 'run1km') {
    const earned = Math.round(50 * mult);
    next.coins += earned;
    next.weekKm = Math.round((next.weekKm + 1.0) * 10) / 10;
    next.note = `🏃 +1 км! Начислено +${earned} 🪙 (x${mult})`;
  } else if (action === 'daily') {
    if (!next.dailyClaimed) {
      const bonus = Math.round(25 * mult);
      next.coins += bonus;
      next.dailyClaimed = true;
      next.note = `🔥 Ежедневный бонус +${bonus} 🪙 получен!`;
    } else {
      next.note = `🔥 Огонёк горит! Множитель x${mult} активен`;
    }
  } else if (action === 'buy_freeze') {
    if (next.coins >= 150) {
      next.coins -= 150;
      next.freezes = (next.freezes || 0) + 1;
      next.note = `❄️ Заморозка стрика куплена! (В запасе: ${next.freezes})`;
    } else {
      next.note = `Нужно ещё ${150 - next.coins} 🪙 для Заморозки`;
    }
  } else if (action === 'buy_pass') {
    if (next.coins >= 300) {
      next.coins -= 300;
      next.note = '👑 Street Pass на 3 дня активирован!';
    } else {
      next.note = `Нужно ещё ${300 - next.coins} 🪙 для Street Pass`;
    }
  }

  return next;
}

/**
 * Generates ultra-compact self-contained HTML for Telegram Bot API 10.4 In-Message Widget:
 * Move-to-Earn RUSH Coins Wallet + Daily Flame Streak Multiplier + In-Message Shop.
 * Guaranteed < 4 KB when compressed with zlib level 9.
 */
export function buildCoinsStreakWidgetHtml(): string {
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
.mult{background:rgba(255,107,0,.2);border:1px solid rgba(255,107,0,.6);color:#FED7AA;font-size:10px;font-weight:900;padding:3px 9px;border-radius:999px}
.mult b{color:#C6FF33}
.wallet{background:linear-gradient(135deg,#12151F,#1A142D);border:1px solid rgba(125,57,235,.45);border-radius:14px;padding:11px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
.bal-lbl{font-size:9px;color:#A78BFA;font-weight:800;letter-spacing:.8px;text-transform:uppercase;margin-bottom:2px}
.bal{font-size:28px;font-weight:900;color:#fff;line-height:1;display:flex;align-items:center;gap:5px}
.bal small{font-size:12px;color:#C6FF33;font-weight:900}
.rate{text-align:right}
.rate b{display:block;font-size:13px;font-weight:900;color:#C6FF33}
.rate span{font-size:9px;color:#9CA3AF}
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:10px}
.day{background:#12151F;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:5px 2px;text-align:center}
.day span{display:block;font-size:8px;color:#8E95A5;font-weight:700;margin-bottom:2px}
.day i{display:inline-flex;width:18px;height:18px;border-radius:50%;align-items:center;justify-content:center;font-style:normal;font-size:10px;background:#1A1F2E;color:#555}
.day.on{border-color:rgba(255,140,0,.55);background:rgba(255,107,0,.14)}
.day.on span{color:#FDBA74}
.day.on i{background:linear-gradient(135deg,#FF8C00,#FF3D00);color:#fff;box-shadow:0 0 8px rgba(255,107,0,.45)}
.day.cur{border-color:#C6FF33}
.shop{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:9px}
.rew{background:#12151F;border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:7px 8px;text-align:left;cursor:pointer;color:#fff}
.rew:active{transform:scale(.96)}
.rew b{display:block;font-size:10px;font-weight:800;color:#fff}
.rew span{font-size:9px;color:#C6FF33;font-weight:700}
.note{font-size:10px;color:#FDBA74;text-align:center;margin-bottom:9px;font-weight:700}
.btns{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.btn{border:none;border-radius:999px;padding:9px 6px;font-size:11px;font-weight:900;cursor:pointer}
.btn:active{transform:scale(.95)}
.b-run{background:#C6FF33;color:#08090C}
.b-fl{background:linear-gradient(135deg,#FF8C00,#FF4500);color:#fff}
</style>
</head>
<body>
<div class="top">
  <div class="brand"><span class="dot"></span>RUSH COINS &amp; СТРИК</div>
  <div class="mult">🔥 <span id="st">3</span> ДН • <b id="mt">x1.5</b></div>
</div>
<div class="wallet">
  <div>
    <div class="bal-lbl">МОЙ БАЛАНС</div>
    <div class="bal">🪙 <span id="cn">158</span> <small>RUSH</small></div>
  </div>
  <div class="rate">
    <b id="rt">+75 🪙 / км</b>
    <span id="wk">За неделю: 4.5 км</span>
  </div>
</div>
<div class="days" id="days"></div>
<div class="shop">
  <button class="rew" onclick="act('buy_freeze')"><b>❄️ Заморозка (<span id="fz">0</span>)</b><span>Цена: 150 🪙</span></button>
  <button class="rew" onclick="act('buy_pass')"><b>👑 Street Pass 3 дн</b><span>Цена: 300 🪙</span></button>
</div>
<div class="note" id="nt">🔥 Огонёк за вход начислен!</div>
<div class="btns">
  <button class="btn b-fl" onclick="act('daily')">🔥 Мой огонёк</button>
  <button class="btn b-run" onclick="act('run1km')">🏃 Фарм +1 км</button>
</div>
<script>
const L=['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
let S={coins:158,streak:3,days:[1,1,1,0,0,0,0],todayIdx:2,dailyClaimed:true,freezes:0,weekKm:4.5,note:'🔥 Огонёк зажжён!'};
function mult(s){return s>=7?3:s>=5?2:s>=3?1.5:1;}
function parse(r){try{if(r){const p=JSON.parse(r);if(p&&typeof p.coins==='number')S=p;}}catch(e){}}
function render(){
  if(S.days&&typeof S.todayIdx==='number'&&!S.days[S.todayIdx]){
    S.days[S.todayIdx]=true;
    S.streak=Math.max(1,S.days.filter(Boolean).length);
  }
  const m=mult(S.streak||1);
  document.getElementById('cn').textContent=S.coins;
  document.getElementById('st').textContent=S.streak||1;
  document.getElementById('mt').textContent='x'+m;
  document.getElementById('rt').textContent='+'+Math.round(50*m)+' 🪙 / км';
  document.getElementById('wk').textContent='За неделю: '+(S.weekKm||0)+' км';
  document.getElementById('fz').textContent=S.freezes||0;
  document.getElementById('nt').textContent=S.note||'Бегай каждый день и копи монеты!';
  const d=document.getElementById('days');
  d.innerHTML='';
  L.forEach((lbl,i)=>{
    const on=S.days&&S.days[i];
    const cur=i===S.todayIdx;
    const el=document.createElement('div');
    el.className='day'+(on?' on':'')+(cur?' cur':'');
    el.innerHTML='<span>'+lbl+'</span><i>'+(on?'🔥':'•')+'</i>';
    d.appendChild(el);
  });
}
function act(a){
  const m=mult(S.streak||1);
  if(a==='run1km'){
    const e=Math.round(50*m);S.coins+=e;S.weekKm=Math.round(((S.weekKm||0)+1)*10)/10;
    S.note='🏃 +1 км! Заработано +'+e+' 🪙 (x'+m+')';
  }else if(a==='buy_freeze'){
    if(S.coins>=150){S.coins-=150;S.freezes=(S.freezes||0)+1;S.note='❄️ Заморозка куплена!';}
    else{S.note='Нужно ещё '+(150-S.coins)+' 🪙 для Заморозки';}
  }else if(a==='buy_pass'){
    if(S.coins>=300){S.coins-=300;S.note='👑 Street Pass на 3 дня активирован!';}
    else{S.note='Нужно ещё '+(300-S.coins)+' 🪙 для Street Pass';}
  }else if(a==='daily'){
    S.note='🔥 Огонёк горит! Множитель фарма x'+m;
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
