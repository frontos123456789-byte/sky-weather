import type { GeoResult, WeatherData } from "./types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export const WEATHER_REVALIDATE = 600; // 10 min

async function getJson<T>(url: string, revalidate: number): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate },
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
  return (await res.json()) as T;
}

type OpenMeteoResponse = {
  utc_offset_seconds: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    precipitation: number;
    cloud_cover: number;
    weather_code: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: (number | null)[];
    precipitation: number[];
    weather_code: number[];
    uv_index: (number | null)[];
    visibility: (number | null)[];
    is_day: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: (number | null)[];
    precipitation_sum: number[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: number[];
  };
};

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "precipitation",
      "cloud_cover",
      "weather_code",
      "is_day",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "uv_index",
      "visibility",
      "is_day",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
    wind_speed_unit: "ms",
    timezone: "auto",
    forecast_days: "8",
  });

  const d = await getJson<OpenMeteoResponse>(
    `${FORECAST_URL}?${params}`,
    WEATHER_REVALIDATE,
  );

  const nowKey = d.current.time.slice(0, 13); // YYYY-MM-DDTHH
  let idx = d.hourly.time.findIndex((t) => t.startsWith(nowKey));
  if (idx < 0) idx = 0;

  const hourly = d.hourly.time.slice(idx, idx + 24).map((time, i) => ({
    time,
    temp: d.hourly.temperature_2m[idx + i],
    precipProb: d.hourly.precipitation_probability[idx + i] ?? null,
    precip: d.hourly.precipitation[idx + i] ?? 0,
    code: d.hourly.weather_code[idx + i],
    isDay: d.hourly.is_day[idx + i] === 1,
  }));

  const daily = d.daily.time.slice(0, 7).map((date, i) => ({
    date,
    code: d.daily.weather_code[i],
    tMax: d.daily.temperature_2m_max[i],
    tMin: d.daily.temperature_2m_min[i],
    precipSum: d.daily.precipitation_sum[i] ?? 0,
    precipProbMax: d.daily.precipitation_probability_max[i] ?? null,
    windMax: d.daily.wind_speed_10m_max[i],
    uvMax: d.daily.uv_index_max[i] ?? null,
    sunrise: d.daily.sunrise[i],
    sunset: d.daily.sunset[i],
  }));

  const c = d.current;
  return {
    timezone: d.timezone,
    utcOffsetSeconds: d.utc_offset_seconds,
    current: {
      time: c.time,
      temp: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      pressureHpa: c.pressure_msl,
      windSpeed: c.wind_speed_10m,
      windDir: c.wind_direction_10m,
      windGust: c.wind_gusts_10m,
      precipitation: c.precipitation,
      cloudCover: c.cloud_cover,
      code: c.weather_code,
      isDay: c.is_day === 1,
      uvIndex: d.hourly.uv_index[idx] ?? null,
      visibilityKm:
        d.hourly.visibility[idx] != null
          ? Math.round(((d.hourly.visibility[idx] as number) / 1000) * 10) / 10
          : null,
    },
    hourly,
    daily,
  };
}

type GeocodeResponse = {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    country?: string;
  }[];
};

export async function searchCities(query: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: "6",
    language: "ru",
    format: "json",
  });
  const d = await getJson<GeocodeResponse>(`${GEOCODE_URL}?${params}`, 86400);
  return (d.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    region: r.admin1,
    country: r.country,
  }));
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<{ name: string; country?: string } | null> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    localityLanguage: "ru",
  });
  try {
    const d = await getJson<{
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    }>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
      86400,
    );
    const name = d.city || d.locality || d.principalSubdivision;
    return name ? { name, country: d.countryName } : null;
  } catch {
    return null;
  }
}
