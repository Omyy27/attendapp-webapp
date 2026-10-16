// Mapbox: geocodificación (API Geocoding v6) y tiles para Leaflet.
// NEXT_PUBLIC_MAPBOX_TOKEN debe ser un token PÚBLICO (pk.…): se usa en el navegador.
// Restringirlo por URL en el panel de Mapbox.

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
export const MAPBOX_STYLE = "streets-v12";

export interface PlaceQuery {
  name: string;
  address: string;
  city: string;
  country: string;
}

export type GeocodeResult = { lat: number; lng: number; label: string } | { error: string };

interface GeocodeFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    full_address?: string;
    name?: string;
    coordinates?: { latitude: number; longitude: number };
  };
}

type Attempt = { feature: GeocodeFeature } | { none: true } | { error: string };

async function forward(q: string): Promise<Attempt> {
  const params = new URLSearchParams({
    q,
    language: "es",
    limit: "1",
    access_token: MAPBOX_TOKEN,
  });

  let res: Response;
  try {
    res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`);
  } catch {
    return { error: "Error al buscar. Verifica tu conexión." };
  }

  if (res.status === 401 || res.status === 403) {
    return {
      error:
        "Mapbox rechazó el token. Verifica que sea un token público (pk.) y que su restricción de URL incluya este sitio.",
    };
  }
  if (!res.ok) return { error: "Mapbox no pudo procesar la búsqueda. Intenta de nuevo." };

  const data = (await res.json()) as { features?: GeocodeFeature[] };
  const feature = data.features?.[0];
  return feature ? { feature } : { none: true };
}

function coordinatesOf(feature: GeocodeFeature): { lat: number; lng: number } | null {
  const c = feature.properties?.coordinates;
  if (c) return { lat: c.latitude, lng: c.longitude };
  const g = feature.geometry?.coordinates;
  return g ? { lat: g[1], lng: g[0] } : null;
}

const join = (...parts: string[]) =>
  parts
    .map((p) => p.replace(/#/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ");

/**
 * Busca un lugar. Si con el nombre del salón no hay resultados, reintenta solo con
 * dirección + ciudad + país: el nombre suele confundir al geocodificador.
 */
export async function geocodePlace({ name, address, city, country }: PlaceQuery): Promise<GeocodeResult> {
  if (!MAPBOX_TOKEN) {
    return { error: "Falta configurar el token de Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN)." };
  }

  const withoutName = join(address, city, country);
  if (!withoutName) {
    return { error: "Escribe la dirección, ciudad y país para buscar en el mapa" };
  }

  const queries = [join(name, address, city, country), withoutName].filter(
    (q, i, all) => all.indexOf(q) === i
  );

  for (const q of queries) {
    const attempt = await forward(q);
    if ("error" in attempt) return attempt;
    if ("feature" in attempt) {
      const coords = coordinatesOf(attempt.feature);
      if (coords) {
        return { ...coords, label: attempt.feature.properties?.full_address || q };
      }
    }
  }
  return { error: "No se encontró la dirección. Intenta con más detalle." };
}
