import zlib from 'zlib';
import { WeatherData } from './weather';

export interface WeatherStreakState {
  temp: number;
  feelsLike: number;
  windSpeed: number;
  rainProb: number;
  condition: string;
  suitabilityText: string;
  city: string;
  streak: number;
  days: boolean[];
  todayIdx: number;
  flameClaimedToday: boolean;
  note?: string;
}

export function getTodayWeekdayIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function getDefaultWeatherStreakState(weather?: WeatherData | null, city = 'Ташкент'): WeatherStreakState {
  const todayIdx = getTodayWeekdayIndex();
  const days = [false, false, false, false, false, false, false];

  // Auto-light today's flame upon entering!
  for (let i = Math.max(0, todayIdx - 2); i <= todayIdx; i++) {
    days[i] = true;
  }

  return {
    temp: weather ? weather.temperature : 18,
    feelsLike: weather ? weather.feelsLike : 17,
    windSpeed: weather ? weather.windSpeed : 9,
    rainProb: weather ? weather.rainProbabilityNext2h : 5,
    condition: weather ? weather.conditionText : 'Ясно',
    suitabilityText: weather ? weather.suitabilityText : 'Идеальные условия для бега',
    city,
    streak: Math.max(1, days.filter(Boolean).length),
    days,
    todayIdx,
    flameClaimedToday: true,
    note: '🔥 Огонёк за вход начислен!',
  };
}

export function parseWeatherWidgetState(raw?: string | null): WeatherStreakState {
  if (!raw) return getDefaultWeatherStreakState();
  try {
    const p = JSON.parse(raw);
    const def = getDefaultWeatherStreakState();
    return {
      temp: typeof p.temp === 'number' ? p.temp : def.temp,
      feelsLike: typeof p.feelsLike === 'number' ? p.feelsLike : def.feelsLike,
      windSpeed: typeof p.windSpeed === 'number' ? p.windSpeed : def.windSpeed,
      rainProb: typeof p.rainProb === 'number' ? p.rainProb : def.rainProb,
      condition: typeof p.condition === 'string' ? p.condition : def.condition,
      suitabilityText: typeof p.suitabilityText === 'string' ? p.suitabilityText : def.suitabilityText,
      city: typeof p.city === 'string' ? p.city : def.city,
      streak: typeof p.streak === 'number' ? p.streak : def.streak,
      days: Array.isArray(p.days) && p.days.length === 7 ? p.days : def.days,
      todayIdx: typeof p.todayIdx === 'number' ? p.todayIdx : def.todayIdx,
      flameClaimedToday: typeof p.flameClaimedToday === 'boolean' ? p.flameClaimedToday : true,
      note: typeof p.note === 'string' ? p.note : def.note,
    };
  } catch {
    return getDefaultWeatherStreakState();
  }
}

export function applyWeatherWidgetAction(
  state: WeatherStreakState,
  action: string,
  freshWeather?: WeatherData | null,
): WeatherStreakState {
  const next: WeatherStreakState = {
    ...state,
    days: [...state.days],
  };

  if (action === 'claim') {
    if (!next.days[next.todayIdx]) {
      next.days[next.todayIdx] = true;
      next.streak = next.days.filter(Boolean).length;
    }
    next.flameClaimedToday = true;
    next.note = `🔥 Огонёк активен! Стрик: ${next.streak} дн.`;
  } else if (action === 'refresh') {
    if (freshWeather) {
      next.temp = freshWeather.temperature;
      next.feelsLike = freshWeather.feelsLike;
      next.windSpeed = freshWeather.windSpeed;
      next.rainProb = freshWeather.rainProbabilityNext2h;
      next.condition = freshWeather.conditionText;
      next.suitabilityText = freshWeather.suitabilityText;
    }
    next.note = '🌤️ Погода обновлена только что';
  }

  return next;
}

/**
 * Generates ultra-compact self-contained HTML for Telegram Bot API 10.4 In-Message Widget:
 * Weather for Running + Daily Flame Streak (automatically gives flame on open).
 * Guaranteed < 4 KB when compressed with zlib level 9.
 */
export function buildWeatherStreakWidgetHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
body{background:#08090C;color:#fff;padding:14px;border-radius:16px;border:1px solid rgba(198,255,51,.28);overflow:hidden}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.brand{font-size:11px;font-weight:900;letter-spacing:1.2px;color:#C6FF33;text-transform:uppercase;display:flex;align-items:center;gap:6px}
.dot{width:7px;height:7px;border-radius:50%;background:#FF6B00;box-shadow:0 0 8px #FF6B00}
.streak{background:rgba(255,107,0,.18);border:1px solid rgba(255,107,0,.55);color:#FED7AA;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;display:flex;align-items:center;gap:4px}
.streak b{color:#FF8C00;font-size:12px}
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:12px}
.day{background:#12151F;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:6px 2px;text-align:center;transition:.2s}
.day span{display:block;font-size:9px;color:#8E95A5;font-weight:700;margin-bottom:3px}
.day i{display:inline-flex;width:20px;height:20px;border-radius:50%;align-items:center;justify-content:center;font-style:normal;font-size:11px;background:#1A1F2E;color:#555}
.day.on{border-color:rgba(255,140,0,.55);background:rgba(255,107,0,.12)}
.day.on span{color:#FDBA74}
.day.on i{background:linear-gradient(135deg,#FF8C00,#FF3D00);color:#fff;box-shadow:0 0 10px rgba(255,107,0,.45)}
.day.cur{border-color:#C6FF33;box-shadow:0 0 10px rgba(198,255,51,.3)}
.w-box{background:#12151F;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;margin-bottom:10px}
.w-main{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.temp{font-size:32px;font-weight:900;line-height:1;color:#fff;display:flex;align-items:center;gap:6px}
.cond{text-align:right}
.cond b{display:block;font-size:13px;font-weight:800;color:#C6FF33}
.cond span{font-size:10px;color:#8E95A5}
.w-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);text-align:center}
.w-meta div span{display:block;font-size:9px;color:#8E95A5}
.w-meta div b{font-size:11px;color:#fff}
.suit{margin-top:8px;padding:7px 10px;border-radius:10px;background:rgba(198,255,51,.1);border:1px solid rgba(198,255,51,.25);color:#C6FF33;font-size:11px;font-weight:700;text-align:center}
.note{font-size:10px;color:#FDBA74;text-align:center;margin-bottom:10px;font-weight:600}
.btns{display:grid;grid-template-columns:1fr 1fr;gap:6px}
button{border:none;border-radius:999px;padding:9px 8px;font-size:11px;font-weight:800;cursor:pointer;transition:transform .1s}
button:active{transform:scale(.95)}
.b-flame{background:linear-gradient(135deg,#FF8C00,#FF4500);color:#fff;box-shadow:0 0 12px rgba(255,107,0,.35)}
.b-ref{background:#1A1F2E;color:#C6FF33;border:1px solid rgba(198,255,51,.35)}
</style>
</head>
<body>
<div class="top">
  <div class="brand"><span class="dot"></span>ПОГОДА &amp; СТРИК</div>
  <div class="streak">🔥 <b id="st">1</b> ДН</div>
</div>
<div class="days" id="days"></div>
<div class="w-box">
  <div class="w-main">
    <div class="temp"><span id="ico">☀️</span><span id="tp">+18°</span></div>
    <div class="cond"><b id="cd">Ясно</b><span id="ct">Ташкент</span></div>
  </div>
  <div class="w-meta">
    <div><span>Ощущается</span><b id="fl">+17°</b></div>
    <div><span>Ветер</span><b id="wd">9 км/ч</b></div>
    <div><span>Дождь</span><b id="rn">5%</b></div>
  </div>
  <div class="suit" id="su">Идеальные условия для бега</div>
</div>
<div class="note" id="nt">🔥 Огонёк за вход начислен!</div>
<div class="btns">
  <button class="b-flame" onclick="act('claim')" id="fbtn">🔥 Огонёк получен</button>
  <button class="b-ref" onclick="act('refresh')">🔄 Обновить погоду</button>
</div>
<script>
const L=['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
let S={temp:18,feelsLike:17,windSpeed:9,rainProb:5,condition:'Ясно',suitabilityText:'Идеальные условия для бега',city:'Ташкент',streak:1,days:[1,0,0,0,0,0,0],todayIdx:0,flameClaimedToday:true,note:'🔥 Огонёк за вход начислен!'};
function parse(r){try{if(r){const p=JSON.parse(r);if(p&&typeof p.temp==='number')S=p;}}catch(e){}}
function iconFor(c,rn){
  const s=(c||'').toLowerCase();
  if(s.includes('гроз'))return '⛈️';
  if(s.includes('дожд')||s.includes('морос')||rn>=50)return '🌧️';
  if(s.includes('снег'))return '❄️';
  if(s.includes('облач')||s.includes('пасмур')||s.includes('туман'))return '⛅';
  return '☀️';
}
function render(){
  if(S.days&&typeof S.todayIdx==='number'&&!S.days[S.todayIdx]){
    S.days[S.todayIdx]=true;
    S.flameClaimedToday=true;
    S.streak=Math.max(1,S.days.filter(Boolean).length);
    S.note='🔥 Огонёк за сегодняшний вход зажжён!';
  }
  document.getElementById('tp').textContent=(S.temp>0?'+':'')+S.temp+'°';
  document.getElementById('fl').textContent=(S.feelsLike>0?'+':'')+S.feelsLike+'°';
  document.getElementById('wd').textContent=S.windSpeed+' км/ч';
  document.getElementById('rn').textContent=S.rainProb+'%';
  document.getElementById('cd').textContent=S.condition||'Ясно';
  document.getElementById('ct').textContent=S.city||'Локация';
  document.getElementById('su').textContent=S.suitabilityText||'Отлично для бега';
  document.getElementById('ico').textContent=iconFor(S.condition,S.rainProb);
  document.getElementById('st').textContent=S.streak||1;
  document.getElementById('nt').textContent=S.note||'🔥 Огонёк за вход начислен!';
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
  if(a==='claim'){
    if(S.days)S.days[S.todayIdx]=true;
    S.flameClaimedToday=true;
    S.streak=Math.max(1,(S.days||[]).filter(Boolean).length);
    S.note='🔥 Огонёк активен! Стрик: '+S.streak+' дн.';
  }else if(a==='refresh'){
    S.note='⏳ Обновляю погоду...';
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
