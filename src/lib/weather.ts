export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  rainProbabilityNext2h: number;
  weatherCode: number;
  conditionText: string;
  suitability: 'EXCELLENT' | 'GOOD' | 'CAUTION' | 'BAD';
  suitabilityText: string;
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Ясно',
  1: 'Преимущественно ясно',
  2: 'Переменная облачность',
  3: 'Пасмурно',
  45: 'Туман',
  48: 'Изморозь',
  51: 'Лёгкая морось',
  53: 'Умеренная морось',
  55: 'Плотная морось',
  61: 'Небольшой дождь',
  63: 'Умеренный дождь',
  65: 'Сильный ливень',
  71: 'Лёгкий снег',
  73: 'Снегопад',
  75: 'Сильный снегопад',
  80: 'Кратковременный дождь',
  81: 'Ливневый дождь',
  82: 'Шквалистый ливень',
  95: 'Гроза',
};

export async function fetchLiveWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability,precipitation,temperature_2m&forecast_days=1&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch weather data');
  }

  const data = await res.json();
  const current = data.current;
  const hourly = data.hourly;

  // Calculate rain probability in the next 2 hours
  const now = new Date();
  const currentHour = now.getHours();
  const next2hProbs = hourly.precipitation_probability.slice(currentHour, currentHour + 2);
  const maxRainProb = next2hProbs.length > 0 ? Math.max(...next2hProbs) : 0;

  const temp = Math.round(current.temperature_2m);
  const feelsLike = Math.round(current.apparent_temperature);
  const windSpeed = Math.round(current.wind_speed_10m);
  const rainProb = Math.round(maxRainProb);
  const code = current.weather_code;
  const condition = WEATHER_CODES[code] || 'Облачно';

  // Determine running suitability
  let suitability: WeatherData['suitability'] = 'EXCELLENT';
  let suitabilityText = 'Идеальные условия для бега';

  if (rainProb >= 60 || current.precipitation > 0.5) {
    suitability = 'BAD';
    suitabilityText = `Ожидается дождь (~${rainProb}%). Захвати ветровку!`;
  } else if (windSpeed >= 35) {
    suitability = 'CAUTION';
    suitabilityText = `Сильный порывистый ветер (${windSpeed} км/ч)`;
  } else if (temp > 30) {
    suitability = 'CAUTION';
    suitabilityText = `Жара (${temp}°C). Возьми с собой воду`;
  } else if (temp < -5) {
    suitability = 'CAUTION';
    suitabilityText = `Морозно (${temp}°C). Разогрейся перед стартом`;
  } else if (rainProb >= 30) {
    suitability = 'GOOD';
    suitabilityText = `Возможен кратковременный дождь (${rainProb}%)`;
  }

  return {
    temperature: temp,
    feelsLike,
    humidity: current.relative_humidity_2m,
    windSpeed,
    precipitation: current.precipitation,
    rainProbabilityNext2h: rainProb,
    weatherCode: code,
    conditionText: condition,
    suitability,
    suitabilityText,
  };
}
