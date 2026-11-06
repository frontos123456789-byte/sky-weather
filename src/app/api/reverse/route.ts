import { fail, json, parseCoords } from "@/lib/api";
import { reverseGeocode } from "@/lib/weather";

export async function GET(request: Request) {
  const c = parseCoords(new URL(request.url));
  if (!c) return fail("Некорректные координаты", 400);
  const place = await reverseGeocode(c.lat, c.lon);
  return json({ place }, 86400);
}
