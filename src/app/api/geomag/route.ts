import { fail, json } from "@/lib/api";
import { GEOMAG_REVALIDATE, getGeomag } from "@/lib/geomag";

export async function GET() {
  try {
    return json(await getGeomag(), GEOMAG_REVALIDATE);
  } catch {
    return fail("Данные NOAA SWPC по Kp-индексу временно недоступны");
  }
}
