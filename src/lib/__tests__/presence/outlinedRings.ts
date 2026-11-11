// The golden's rings fed landcover (presence-readers audit 8): for each fixture area, an outline round each of its parks and
// gardens, and two parks of its own named for play, one in a small outline (a community park) and one in a large one (a park).
// Pure data: the capture script (outside the repo) and PS8 build the same input from it.

type Poi = [string, string, string, number, number];
type Feature = { geometry: { type: 'Polygon'; coordinates: [number, number][][] }; properties: { class: string; subclass: string } };

const square = (lon: number, lat: number, side: number): [number, number][][] => {
  const dLon = side / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  const dLat = side / 2 / 110540;
  return [[[lon - dLon, lat - dLat], [lon + dLon, lat - dLat], [lon + dLon, lat + dLat], [lon - dLon, lat + dLat], [lon - dLon, lat - dLat]]];
};
const east = (lon: number, lat: number, m: number) => lon + m / (111320 * Math.cos((lat * Math.PI) / 180));

export function outlined(a: { name: string; at: [number, number]; pois: Poi[] }): { pois: Poi[]; landcover: Feature[] } {
  const [lon, lat] = a.at;
  const small: Poi = [`${a.name} Playground`, 'park', 'park', east(lon, lat, 40), lat];
  const large: Poi = [`${a.name} Ball Field`, 'park', 'park', east(lon, lat, -400), lat];
  const pois = [...a.pois, small, large];
  const landcover: Feature[] = [
    ...a.pois.filter(([, cls]) => cls === 'park' || cls === 'garden').map(([, , , x, y], i): Feature => ({ geometry: { type: 'Polygon', coordinates: square(x, y, 80) }, properties: { class: i % 3 === 2 ? 'wood' : 'grass', subclass: i % 3 === 1 ? 'garden' : 'park' } })),
    { geometry: { type: 'Polygon', coordinates: square(small[3], lat, 60) }, properties: { class: 'grass', subclass: 'park' } },
    { geometry: { type: 'Polygon', coordinates: square(large[3], lat, 300) }, properties: { class: 'grass', subclass: 'park' } },
  ];
  return { pois, landcover };
}
