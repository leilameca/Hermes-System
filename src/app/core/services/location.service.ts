import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';

export interface HermesLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

export interface LocationSearchResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export type LocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unavailable';

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: { name?: string; amenity?: string; shop?: string; tourism?: string };
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  // Consulta el permiso sin abrir el aviso del sistema.
  async permissionState(): Promise<LocationPermissionState> {
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await Geolocation.checkPermissions();
        if (permission.location === 'granted') return 'granted';
        if (permission.location === 'denied') return 'denied';
        return 'prompt';
      } catch {
        return 'unavailable';
      }
    }

    // Los navegadores solo permiten GPS desde HTTPS o localhost.
    if (!window.isSecureContext) return 'unavailable';
    if (!navigator.permissions?.query) return 'prompt';
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch {
      // Safari puede no exponer el estado, pero muestra su aviso al solicitar GPS.
      return 'prompt';
    }
  }

  // Pide permiso y obtiene la ubicacion actual.
  async current(): Promise<HermesLocation> {
    // En la web el navegador pide su propio permiso.
    if (Capacitor.isNativePlatform()) {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== 'granted') throw new Error('Debes permitir el acceso a la ubicación para usar el GPS.');
      }
    }

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      });
      return this.mapPosition(position);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('denied') || message.includes('permission')) {
        throw new Error('El permiso de ubicación está bloqueado. Actívalo en los ajustes del navegador o del teléfono.');
      }
      throw error;
    }
  }

  async watch(callback: (location: HermesLocation | null, error?: string) => void): Promise<string> {
    return Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 15000 }, (position, error) => {
      if (error) {
        callback(null, error.message);
        return;
      }
      if (position) callback(this.mapPosition(position));
    });
  }

  stopWatch(id: string): Promise<void> {
    return Geolocation.clearWatch({ id });
  }

  async share(location: HermesLocation): Promise<void> {
    const url = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=17/${location.latitude}/${location.longitude}`;
    await Share.share({
      title: 'Mi ubicación desde Hermes',
      text: `Esta es mi ubicación actual: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
      url,
      dialogTitle: 'Compartir ubicación',
    });
  }

  // Busca una direccion con OpenStreetMap.
  async search(query: string): Promise<LocationSearchResult[]> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'do');
    url.searchParams.set('q', query.trim());
    const response = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    if (!response.ok) throw new Error('El servicio de búsqueda no respondió correctamente.');
    const rows = await response.json() as Array<{ place_id: number; display_name: string; lat: string; lon: string }>;
    return rows.map(row => ({
      id: String(row.place_id),
      name: row.display_name,
      latitude: Number(row.lat),
      longitude: Number(row.lon),
    }));
  }

  // Busca lugares que esten a menos de 1.5 km.
  async nearby(location: HermesLocation): Promise<NearbyPlace[]> {
    const query = `[out:json][timeout:20];(nwr(around:1500,${location.latitude},${location.longitude})[amenity~"restaurant|cafe|fast_food"];nwr(around:1500,${location.latitude},${location.longitude})[shop];nwr(around:1500,${location.latitude},${location.longitude})[tourism]);out center 30;`;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }),
    });
    if (!response.ok) throw new Error('No fue posible consultar los lugares cercanos.');
    const data = await response.json() as { elements: OverpassElement[] };
    return data.elements
      .map(element => {
        const latitude = Number(element.lat ?? element.center?.lat);
        const longitude = Number(element.lon ?? element.center?.lon);
        const category = element.tags?.amenity ? 'Comida' : element.tags?.shop ? 'Tienda' : 'Turismo';
        return {
          id: `${element.type}-${element.id}`,
          name: element.tags?.name ?? `${category} cercano`,
          category,
          latitude,
          longitude,
          distanceMeters: this.distance(location.latitude, location.longitude, latitude, longitude),
        } as NearbyPlace;
      })
      .filter(place => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 20);
  }

  private mapPosition(position: Position): HermesLocation {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  }

  private distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const radius = 6371000;
    const toRadians = (value: number) => value * Math.PI / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
}
