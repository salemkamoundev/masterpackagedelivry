import { Component, inject, OnInit, AfterViewInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import * as L from 'leaflet';
import { TripService, Trip } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { UserService } from '../../../core/services/user.service';
import { CompanyService } from '../../../core/services/company.service';
import { combineLatest, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl, iconUrl, shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-live-map',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex flex-col h-full w-full relative overflow-hidden">
      
      <!-- Header & Filtres (Z-INDEX 1000 : sous la sidebar à 10000) -->
      <!-- Padding réduit (p-3) et Gap réduit (gap-2) pour supprimer l'espace vide -->
      <div class="absolute top-4 left-4 right-14 md:right-auto md:w-80 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg z-[1000] border border-gray-200 flex flex-col gap-2">
        
        <div class="flex justify-between items-center">
           <h2 class="text-base font-bold text-gray-800 flex items-center gap-2"><span class="text-lg">🌍</span> Flotte Live</h2>
           <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 animate-pulse">{{ filteredCount() }} / {{ totalCount() }} Actifs</span>
        </div>
        
        <form [formGroup]="filterForm" class="flex flex-col gap-2">
           <div class="flex items-center gap-2">
               <input type="checkbox" formControlName="inProgressOnly" id="mapInProgress" class="h-3.5 w-3.5 text-indigo-600 border-gray-300 rounded">
               <label for="mapInProgress" class="text-xs text-gray-700 font-medium">Uniquement "En cours"</label>
           </div>
           
           <div>
              <select formControlName="company" class="w-full text-xs border-gray-300 rounded-md bg-gray-50 py-1.5">
                 <option value="">Toutes les sociétés</option>
                 @for (company of activeCompanies(); track company.uid) { <option [value]="company.name">{{ company.name }}</option> }
              </select>
           </div>
        </form>
      </div>
      
      <div id="map" class="flex-1 w-full h-full z-0 bg-gray-100"></div>
    </div>
  `,
  styles: [`:host { display: block; height: 100%; width: 100%; } #map { height: 100%; width: 100%; }`]
})
export class LiveMapComponent implements AfterViewInit, OnDestroy {
  // ... Code TypeScript inchangé ...
  private tripService = inject(TripService);
  private carService = inject(CarService);
  private userService = inject(UserService);
  private companyService = inject(CompanyService);
  private fb = inject(FormBuilder);
  private map: L.Map | undefined;
  private markers: L.LayerGroup = L.layerGroup();
  private readonly TUNISIA_BOUNDS = L.latLngBounds([30.2, 7.5], [37.6, 11.6]);

  activeCompanies = this.companyService.activeCompanies;
  
  filterForm = this.fb.group({ company: [''], inProgressOnly: [true] }); // Suppression de 'search'

  private combinedData$ = combineLatest([
    this.tripService.getTrips(),
    this.carService.getCars(),
    this.userService.getAllUsers(),
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.value))
  ]).pipe(
    map(([trips, cars, users, filters]) => {
      const activeTrips = trips.filter(t => t.status === 'IN_PROGRESS' && t.currentLocation);
      const enrichedTrips = activeTrips.map(trip => {
        const car = cars.find(c => c.uid === trip.carId);
        const driver = users.find(u => u.uid === car?.assignedDriverId);
        return { trip, car, driver };
      });
      
      return enrichedTrips.filter(item => {
         const matchCompany = !filters.company || item.driver?.company === filters.company || item.trip.company === filters.company;
         // Suppression de la logique de recherche textuelle
         return matchCompany && (filters.inProgressOnly ? item.trip.status === 'IN_PROGRESS' : true);
      });
    })
  );

  liveData = toSignal(this.combinedData$, { initialValue: [] });
  filteredCount = signal(0);
  totalCount = signal(0);

  constructor() {
    effect(() => {
      const data = this.liveData();
      this.filteredCount.set(data.length);
      setTimeout(() => this.updateMarkers(data), 200);
    });
    this.tripService.getTrips().subscribe(trips => this.totalCount.set(trips.filter(t => t.status === 'IN_PROGRESS').length));
  }

  ngAfterViewInit(): void { setTimeout(() => this.initMap(), 100); }
  ngOnDestroy(): void { if (this.map) this.map.remove(); }

  private initMap(): void {
    if (this.map) return;
    this.map = L.map('map', { zoomControl: false, attributionControl: false });
    this.map.fitBounds(this.TUNISIA_BOUNDS);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);
    this.markers.addTo(this.map);
    setTimeout(() => { this.map?.invalidateSize(); this.map?.fitBounds(this.TUNISIA_BOUNDS); }, 300);
  }

  private updateMarkers(data: any[]): void {
    if (!this.map) return;
    this.markers.clearLayers();
    data.forEach(item => {
      const { trip, car, driver } = item;
      if (trip.currentLocation) {
        const content = `<div><strong>${car?.model}</strong><br>📍 ${trip.currentLocation.city}</div>`;
        L.marker([trip.currentLocation.lat, trip.currentLocation.lng]).bindPopup(content).addTo(this.markers);
      }
    });
  }
}
