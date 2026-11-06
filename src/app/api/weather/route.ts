import { fail, json, parseCoords } from "@/lib/api";
import { getWeather, WEATHER_REVALIDATE } from "@/lib/weather";

export async function GET(request: Request) {
  const c = parseCoords(new URL(request.url));
  if (!c) return fail("Некорректные координаты", 400);
  try {
    return json(await getWeather(c.lat, c.lon), WEATHER_REVALIDATE);
  } catch {
    return fail("Сервис погоды (Open-Meteo) временно недоступен");
  }
}
