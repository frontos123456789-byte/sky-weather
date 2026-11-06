type Wmo = { label: string; day: string; night: string };

const T: Record<number, Wmo> = {
  0: { label: "Ясно", day: "☀️", night: "🌙" },
  1: { label: "Преимущественно ясно", day: "🌤️", night: "🌙" },
  2: { label: "Переменная облачность", day: "⛅", night: "☁️" },
  3: { label: "Пасмурно", day: "☁️", night: "☁️" },
  45: { label: "Туман", day: "🌫️", night: "🌫️" },
  48: { label: "Изморозь", day: "🌫️", night: "🌫️" },
  51: { label: "Лёгкая морось", day: "🌦️", night: "🌧️" },
  53: { label: "Морось", day: "🌦️", night: "🌧️" },
  55: { label: "Сильная морось", day: "🌧️", night: "🌧️" },
  56: { label: "Ледяная морось", day: "🌧️", night: "🌧️" },
  57: { label: "Сильная ледяная морось", day: "🌧️", night: "🌧️" },
  61: { label: "Небольшой дождь", day: "🌦️", night: "🌧️" },
  63: { label: "Дождь", day: "🌧️", night: "🌧️" },
  65: { label: "Сильный дождь", day: "🌧️", night: "🌧️" },
  66: { label: "Ледяной дождь", day: "🌧️", night: "🌧️" },
  67: { label: "Сильный ледяной дождь", day: "🌧️", night: "🌧️" },
  71: { label: "Небольшой снег", day: "🌨️", night: "🌨️" },
  73: { label: "Снег", day: "❄️", night: "❄️" },
  75: { label: "Сильный снегопад", day: "❄️", night: "❄️" },
  77: { label: "Снежные зёрна", day: "🌨️", night: "🌨️" },
  80: { label: "Ливни", day: "🌦️", night: "🌧️" },
  81: { label: "Сильные ливни", day: "🌧️", night: "🌧️" },
  82: { label: "Очень сильные ливни", day: "⛈️", night: "⛈️" },
  85: { label: "Снегопады", day: "🌨️", night: "🌨️" },
  86: { label: "Сильные снегопады", day: "❄️", night: "❄️" },
  95: { label: "Гроза", day: "⛈️", night: "⛈️" },
  96: { label: "Гроза с градом", day: "⛈️", night: "⛈️" },
  99: { label: "Сильная гроза с градом", day: "⛈️", night: "⛈️" },
};

export function weatherInfo(code: number, isDay = true) {
  const w = T[code] ?? { label: "Нет данных", day: "🌡️", night: "🌡️" };
  return { label: w.label, icon: isDay ? w.day : w.night };
}
