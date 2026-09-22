import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { locateOutline, navigateOutline, searchOutline, shareSocialOutline, stopCircleOutline } from 'ionicons/icons';
import { HermesLocation, LocationSearchResult, LocationService, NearbyPlace } from '../../core/services/location.service';

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [FormsModule, DatePipe, IonIcon],
  templateUrl: './location.page.html',
  styleUrl: './location.page.scss',
})
export class LocationPage implements AfterViewInit {
  private readonly locationService = inject(LocationService);
  private readonly destroyRef = inject(DestroyRef);
  private map?: L.Map;
  private currentMarker?: L.Marker;
  private accuracyCircle?: L.Circle;
  private placeLayer = L.layerGroup();
  private watchId = '';

  @ViewChild('map') private mapElement?: ElementRef<HTMLElement>;
  readonly currentLocation = signal<HermesLocation | null>(null);
  readonly nearbyPlaces = signal<NearbyPlace[]>([]);
  readonly searchResults = signal<LocationSearchResult[]>([]);
  readonly tracking = signal(false);
  readonly loading = signal(false);
  readonly message = signal('Pulsa “Mi ubicación” para comenzar.');
  searchText = '';

  readonly locateIcon = locateOutline;
  readonly navigateIcon = navigateOutline;
  readonly searchIcon = searchOutline;
  readonly shareIcon = shareSocialOutline;
  readonly stopIcon = stopCircleOutline;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.watchId) void this.locationService.stopWatch(this.watchId);
      this.map?.remove();
    });
  }

  ngAfterViewInit() {
    if (!this.mapElement) return;
    this.map = L.map(this.mapElement.nativeElement, { zoomControl: true }).setView([18.4861, -69.9312], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.placeLayer.addTo(this.map);
  }

  async locate() {
    if (this.loading()) return;
    this.loading.set(true);
    this.message.set('Obteniendo ubicación precisa…');
    try {
      const location = await this.locationService.current();
      this.showCurrentLocation(location, true);
      this.message.set(`Ubicación obtenida con una precisión aproximada de ${Math.round(location.accuracy)} metros.`);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'No fue posible obtener la ubicación.');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleTracking() {
    if (this.tracking()) {
      await this.locationService.stopWatch(this.watchId);
      this.watchId = '';
      this.tracking.set(false);
      this.message.set('Seguimiento en tiempo real detenido.');
      return;
    }
    try {
      await this.locate();
      this.watchId = await this.locationService.watch((location, error) => {
        if (error) this.message.set(error);
        if (location) this.showCurrentLocation(location, false);
      });
      this.tracking.set(true);
      this.message.set('Compartiendo cambios de ubicación en tiempo real dentro de esta pantalla.');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'No fue posible iniciar el seguimiento.');
    }
  }

  async share() {
    const location = this.currentLocation();
    if (!location) return;
    try {
      await this.locationService.share(location);
      this.message.set('Ubicación preparada para compartir.');
    } catch {
      this.message.set('No fue posible abrir las opciones para compartir.');
    }
  }

  async search() {
    if (this.searchText.trim().length < 3) return;
    this.loading.set(true);
    this.message.set('Buscando ubicación…');
    try {
      const results = await this.locationService.search(this.searchText);
      this.searchResults.set(results);
      this.message.set(results.length ? `${results.length} ubicaciones encontradas.` : 'No encontramos resultados para esa búsqueda.');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'No fue posible completar la búsqueda.');
    } finally {
      this.loading.set(false);
    }
  }

  selectSearchResult(result: LocationSearchResult) {
    this.map?.setView([result.latitude, result.longitude], 16);
    L.marker([result.latitude, result.longitude], { icon: this.placeIcon() }).addTo(this.placeLayer).bindPopup(result.name).openPopup();
  }

  async loadNearby() {
    let location = this.currentLocation();
    if (!location) {
      await this.locate();
      location = this.currentLocation();
    }
    if (!location) return;
    this.loading.set(true);
    this.message.set('Consultando restaurantes, tiendas y lugares turísticos…');
    try {
      const places = await this.locationService.nearby(location);
      this.nearbyPlaces.set(places);
      this.placeLayer.clearLayers();
      places.forEach(place => L.marker([place.latitude, place.longitude], { icon: this.placeIcon() })
        .addTo(this.placeLayer)
        .bindPopup(`<strong>${this.escape(place.name)}</strong><br>${place.category} · ${place.distanceMeters} m`));
      this.message.set(places.length ? `${places.length} lugares cercanos encontrados.` : 'No se encontraron lugares cercanos.');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'No fue posible consultar lugares cercanos.');
    } finally {
      this.loading.set(false);
    }
  }

  focusPlace(place: NearbyPlace) {
    this.map?.setView([place.latitude, place.longitude], 17);
  }

  private showCurrentLocation(location: HermesLocation, center: boolean) {
    this.currentLocation.set(location);
    const point: L.LatLngExpression = [location.latitude, location.longitude];
    if (!this.currentMarker) {
      this.currentMarker = L.marker(point, { icon: this.currentIcon() }).addTo(this.map!).bindPopup('Tu ubicación actual');
      this.accuracyCircle = L.circle(point, { radius: location.accuracy, color: '#17448f', fillOpacity: .08 }).addTo(this.map!);
    } else {
      this.currentMarker.setLatLng(point);
      this.accuracyCircle?.setLatLng(point).setRadius(location.accuracy);
    }
    if (center) this.map?.setView(point, 17);
  }

  private currentIcon() {
    return L.divIcon({ className: 'hermes-map-marker', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] });
  }

  private placeIcon() {
    return L.divIcon({ className: 'hermes-place-marker', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
  }

  private escape(value: string) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
  }
}
