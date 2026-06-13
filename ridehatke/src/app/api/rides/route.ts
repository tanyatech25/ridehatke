import { NextResponse } from 'next/server';
import { scrapeLivePrices } from '@/lib/scraper';

// Geocoding helper using Nominatim API (OpenStreetMap)
async function geocode(address: string) {
  try {
    const searchQuery = address.toLowerCase().includes("india") ? address : `${address}, India`;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`, {
      headers: {
        'User-Agent': 'RideHatkeAggregator/1.0 (contact@ridehatke.com)'
      }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        coords: [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number],
        name: data[0].display_name?.split(',').slice(0, 2).join(',').trim() || address
      };
    }
  } catch (error) {
    console.error("Geocoding error", error);
  }
  return null;
}

// Fallback Haversine formula (when OSRM fails)
function getDistance(coord1: [number, number], coord2: [number, number]) {
  const R = 6371;
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format duration into human-readable string
function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { pickup, dropoff } = body;

  // 1. Geocode both locations
  const pickupResult = await geocode(pickup);
  const dropoffResult = await geocode(dropoff);

  const pickupCoords = pickupResult?.coords || [28.6139, 77.2090] as [number, number];
  const dropoffCoords = dropoffResult?.coords || [28.4595, 77.0266] as [number, number];
  const pickupName = pickupResult?.name || pickup;
  const dropoffName = dropoffResult?.name || dropoff;

  let distanceKm = getDistance(pickupCoords, dropoffCoords);
  let durationSeconds: number | null = null;
  let routeCoordinates: [number, number][] | null = null;

  // 2. Fetch ACTUAL road directions from OSRM API
  try {
    const routeRes = await fetch(
      `http://router.project-osrm.org/route/v1/driving/${pickupCoords[1]},${pickupCoords[0]};${dropoffCoords[1]},${dropoffCoords[0]}?overview=full&geometries=geojson`
    );
    const routeData = await routeRes.json();
    if (routeData.routes && routeData.routes.length > 0) {
      distanceKm = routeData.routes[0].distance / 1000;       // meters → km
      durationSeconds = routeData.routes[0].duration;          // real driving time in seconds
      routeCoordinates = routeData.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
    }
  } catch (e) {
    console.error("OSRM error", e);
  }

  // Fallback: estimate duration from distance if OSRM failed (avg 40 km/h in India)
  const drivingMinutes = durationSeconds
    ? Math.round(durationSeconds / 60)
    : Math.round((distanceKm / 40) * 60);

  // 3. Determine if this is outstation (> 50 km) — pricing changes significantly
  const isOutstation = distanceKm > 50;

  // 4. Realistic pricing models per provider
  const basePrices = [
    {
      provider: "Uber", type: "UberGo",
      base: 50, perKm: isOutstation ? 12 : 14, multiplier: 1.1,
      minFare: 80, available: true
    },
    {
      provider: "Uber", type: "UberXL",
      base: 80, perKm: isOutstation ? 17 : 19, multiplier: 1.1,
      minFare: 150, available: true
    },
    {
      provider: "Ola", type: "Mini",
      base: 45, perKm: isOutstation ? 11 : 13, multiplier: 1.0,
      minFare: 70, available: true
    },
    {
      provider: "Ola", type: "Prime Sedan",
      base: 60, perKm: isOutstation ? 15 : 17, multiplier: 1.0,
      minFare: 120, available: true
    },
    {
      provider: "Rapido", type: "Bike",
      base: 20, perKm: 5, multiplier: 0.9,
      minFare: 25, available: distanceKm <= 30  // Bikes don't do long distance
    },
    {
      provider: "Rapido", type: "Auto",
      base: 30, perKm: 8, multiplier: 0.95,
      minFare: 35, available: distanceKm <= 50  // Autos don't do outstation
    },
    {
      provider: "BluSmart", type: "Electric Sedan",
      base: 50, perKm: isOutstation ? 14 : 15, multiplier: 1.05,
      minFare: 99, available: distanceKm <= 100  // EV range limit
    }
  ];

  // 5. Attempt to scrape live pricing data from web
  const scraperResult = await scrapeLivePrices(pickup, dropoff);
  const liveMultiplier = scraperResult.success ? scraperResult.liveMultiplier! : 1.0;

  // 6. Calculate prices
  const results = basePrices
    .filter(p => p.available)
    .map((p, index) => {
      // Realistic surge: peak hours get 1.2-1.5x, off-peak 0.9-1.1x
      const surge = (0.95 + (Math.random() * 0.2)) * liveMultiplier;

      let price = Math.round((p.base + (distanceKm * p.perKm)) * p.multiplier * surge);
      price = Math.max(price, p.minFare); // Enforce minimum fare

      // Add toll charges for long distance routes (approx ₹2/km for highways)
      if (isOutstation) {
        const tollEstimate = Math.round(distanceKm * 1.5);
        price += tollEstimate;
      }

      return {
        id: index.toString(),
        provider: p.provider,
        type: p.type,
        price: price,
        eta: formatDuration(drivingMinutes),
      };
    });

  // Sort by price (cheapest first)
  results.sort((a, b) => a.price - b.price);

  return NextResponse.json({
    results,
    distanceKm: Math.round(distanceKm * 10) / 10,
    drivingTime: formatDuration(drivingMinutes),
    routeCoordinates,
    pickupCoords,
    dropoffCoords,
    pickupName,
    dropoffName,
    isOutstation,
  });
}
