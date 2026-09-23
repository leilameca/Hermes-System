import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { locateOutline, navigateOutline, searchOutline, shareSocialOutline, stopCircleOutline } from 'ionicons/icons';
import { HermesLocation, LocationSearchResult, LocationService, NearbyPlace } from '../../core/services/location.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerLocationEvent, HermesDataService } from '../../core/services/hermes-data.service';

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
  private readonly auth = inject(AuthService);
  private readonly data = inject(HermesDataService);
  private map?: L.Map;
  private currentMarker?: L.Marker;
  private accuracyCircle?: L.Circle;
  private placeLayer = L.layerGroup();
  private watchId = '';
  private readonly trackingSessionId = crypto.randomUUID();
  private lastPersistedAt = 0;
  private adminRefreshTimer?: number;

  @ViewChild('map') private mapElement?: ElementRef<HTMLElement>;
  readonly currentLocation = signal<HermesLocation | null>(null);
  readonly nearbyPlaces = signal<NearbyPlace[]>([]);
  readonly searchResults = signal<LocationSearchResult[]>([]);
  readonly tracking = signal(false);
  readonly loading = signal(false);
  readonly message = signal('Pulsa “Mi ubicación” para comenzar.');
  searchText = '';
  readonly role = computed(() => this.auth.user()?.role ?? 'cliente');
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly adminView = signal<'customers' | 'personal'>('customers');
  readonly showCustomerTracking = computed(() => this.isAdmin() && this.adminView() === 'customers');
  readonly customerLocations = this.data.customerLocations;
  readonly latestCustomerLocations = computed(() => {
    const seen = new Set<string>();
    return this.customerLocations().filter(row => {
      if (seen.has(row.customerId)) return false;
      seen.add(row.customerId);
      return true;
    });
  });

  readonly locateIcon = locateOutline;
  readonly navigateIcon = navigateOutline;
  readonly searchIcon = searchOutline;
  readonly shareIcon = shareSocialOutline;
  readonly stopIcon = stopCircleOutline;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.watchId) void this.locationService.stopWatch(this.watchId);
      if (this.adminRefreshTimer) window.clearInterval(this.adminRefreshTimer);
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
    if (this.isAdmin()) {
      void this.refreshAdminLocations();
      this.adminRefreshTimer = window.setInterval(() => void this.refreshAdminLocations(), 20000);
    }
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
        if (location) {
          this.showCurrentLocation(location, false);
          if (this.role() === 'cliente') void this.persistLocation(location);
        }
      });
      this.tracking.set(true);
      this.message.set(this.role() === 'cliente'
        ? 'Compartiendo tu ubicación con la empresa mientras esta pantalla permanezca abierta.'
        : 'Seguimiento en tiempo real activo dentro de esta pantalla.');
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

  customerName(customerId: string): string {
    return this.data.customers().find(customer => customer.id === customerId)?.name ?? 'Cliente';
  }

  focusCustomer(location: CustomerLocationEvent) {
    this.map?.setView([location.latitude, location.longitude], 17);
  }

  async setAdminView(view: 'customers' | 'personal') {
    if (!this.isAdmin()) return;
    if (view === 'customers' && this.tracking()) await this.toggleTracking();
    this.adminView.set(view);
    this.placeLayer.clearLayers();
    if (view === 'customers') {
      await this.refreshAdminLocations();
    } else {
      this.message.set('Usa Mi ubicación para localizarte, compartir o iniciar tu seguimiento en tiempo real.');
      if (this.currentLocation()) this.showCurrentLocation(this.currentLocation()!, true);
    }
  }

  async refreshAdminLocations() {
    if (!this.showCustomerTracking()) return;
    this.loading.set(true);
    try {
      await this.data.refresh();
      this.drawCustomerLocations();
      this.message.set(this.latestCustomerLocations().length
        ? `${this.latestCustomerLocations().length} clientes con ubicación registrada.`
        : 'Todavía ningún cliente ha compartido su ubicación.');
    } finally {
      this.loading.set(false);
    }
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

  private async persistLocation(location: HermesLocation) {
    const now = Date.now();
    if (now - this.lastPersistedAt < 10000) return;
    this.lastPersistedAt = now;
    try {
      await this.data.recordCustomerLocation({
        sessionId: this.trackingSessionId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        recordedAt: new Date(location.timestamp).toISOString(),
      });
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'No fue posible guardar la ubicación en la empresa.');
    }
  }

  private drawCustomerLocations() {
    this.placeLayer.clearLayers();
    const byCustomer = new Map<string, CustomerLocationEvent[]>();
    this.customerLocations().forEach(location => {
      const rows = byCustomer.get(location.customerId) ?? [];
      rows.push(location);
      byCustomer.set(location.customerId, rows);
    });
    byCustomer.forEach(rows => {
      const ordered = [...rows].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
      const latest = ordered[ordered.length - 1];
      L.marker([latest.latitude, latest.longitude], { icon: this.customerIcon() })
        .addTo(this.placeLayer)
        .bindPopup(`<strong>${this.escape(this.customerName(latest.customerId))}</strong><br>Actualizado ${new Date(latest.recordedAt).toLocaleString('es-DO')}`);
      if (ordered.length > 1) {
        L.polyline(ordered.map(row => [row.latitude, row.longitude] as L.LatLngTuple), { color: '#17448f', weight: 3, opacity: .7 }).addTo(this.placeLayer);
      }
    });
    const first = this.latestCustomerLocations()[0];
    if (first) this.map?.setView([first.latitude, first.longitude], 13);
  }

  private currentIcon() {
    return L.divIcon({ className: 'hermes-map-marker', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] });
  }

  private placeIcon() {
    return L.divIcon({ className: 'hermes-place-marker', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
  }

  private customerIcon() {
    return L.divIcon({ className: 'hermes-customer-marker', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14] });
  }

  private escape(value: string) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
  }
}
