import { Component, inject, AfterViewInit, OnDestroy, signal, effect, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { TripService, Trip } from '../../../core/services/trip.service';
import { CarService, Car } from '../../../core/services/car.service';
import { UserService } from '../../../core/services/user.service';
import { CompanyService } from '../../../core/services/company.service';
import { ChatService } from '../../../core/services/chat.service';
import { UserProfile } from '../../../core/auth/auth.service';
import { combineLatest, startWith, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

// Configuration Icônes Leaflet
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
      <div class="absolute top-4 left-4 right-14 md:right-auto md:w-96 bg-white p-4 rounded-xl shadow-lg z-[1000] border border-gray-200 flex flex-col gap-3">
        <div class="flex justify-between items-center">
           <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2"><span class="text-xl">🌍</span> Flotte Live</h2>
           <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 animate-pulse">{{ filteredCount() }} / {{ totalCount() }} Actifs</span>
        </div>
        <form [formGroup]="filterForm" class="flex flex-col gap-2">
           <div class="flex items-center gap-2 mb-1">
               <input type="checkbox" formControlName="inProgressOnly" id="mapInProgress" class="h-4 w-4 text-indigo-600 border-gray-300 rounded">
               <label for="mapInProgress" class="text-sm text-gray-700 font-medium">Uniquement "En cours"</label>
           </div>
           <div>
              <select formControlName="company" class="w-full text-sm border-gray-300 rounded-md bg-gray-50 p-2">
                 <option value="">Toutes les sociétés</option>
                 @for (company of activeCompanies(); track company.uid) { <option [value]="company.name">{{ company.name }}</option> }
              </select>
           </div>
           <div><input formControlName="search" type="text" placeholder="Rechercher..." class="w-full text-sm border-gray-300 rounded-md bg-gray-50 p-2"></div>
        </form>
      </div>
      <div id="map" class="flex-1 w-full h-full z-0 bg-gray-100"></div>
    </div>
  `,
  styles: [`:host { display: block; height: 100%; width: 100%; } #map { height: 100%; width: 100%; }`]
})
export class LiveMapComponent implements AfterViewInit, OnDestroy {
  private tripService = inject(TripService);
  private carService = inject(CarService);
  private userService = inject(UserService);
  private companyService = inject(CompanyService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private fb = inject(FormBuilder);
  
  private map: L.Map | undefined;
  private markers: L.LayerGroup = L.layerGroup();
  private readonly TUNISIA_BOUNDS = L.latLngBounds([30.2, 7.5], [37.6, 11.6]);

  activeCompanies = this.companyService.activeCompanies;
  filterForm = this.fb.group({ company: [''], inProgressOnly: [true], search: [''] });

  private combinedData$ = combineLatest([
    this.tripService.getTrips(),
    this.carService.getCars(),
    this.userService.getAllUsers(),
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.value))
  ]).pipe(
    map(([trips, cars, users, filters]: [Trip[], Car[], UserProfile[], any]) => {
      const activeTrips = trips.filter((t: Trip) => t.status === 'IN_PROGRESS' && t.currentLocation);
      const enrichedTrips = activeTrips.map((trip: Trip) => {
        const car = cars.find((c: Car) => c.uid === trip.carId);
        const driver = users.find((u: UserProfile) => u.uid === car?.assignedDriverId);
        return { trip, car, driver };
      });
      const searchTerm = (filters?.search || '').toLowerCase();
      return enrichedTrips.filter((item: any) => {
         const matchCompany = !filters?.company || item.driver?.company === filters.company || item.trip.company === filters.company;
         const matchSearch = !searchTerm || item.car?.plate?.toLowerCase().includes(searchTerm) || item.trip.currentLocation?.city.toLowerCase().includes(searchTerm);
         return matchCompany && (filters?.inProgressOnly ? item.trip.status === 'IN_PROGRESS' : true);
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
        
        // 1. ID UNIQUE POUR LE BOUTON (Essentiel pour le cibler après le rendu)
        const chatBtnId = `chat-btn-${driver?.uid}`;
        
        // 2. TEMPLATE HTML (Avec le bouton injecté)
        const popupContent = `
          <div class="font-sans p-1 min-w-[220px]">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                <div class="font-bold text-indigo-700 text-sm">${car?.model || 'Véhicule'}</div>
                <div class="text-xs bg-gray-100 px-1 rounded font-mono">${car?.plate}</div>
            </div>
            <div class="text-xs text-gray-600 space-y-1">
               <div class="flex items-center gap-2"><span>🏢</span> <strong>${driver?.company || 'N/A'}</strong></div>
               <div class="flex items-center gap-2"><span>🧢</span> ${driver?.email?.split('@')[0]}</div>
               <div class="flex items-center gap-2 text-indigo-600 font-bold"><span>📞</span> ${driver?.phoneNumber || 'N/A'}</div>
               <div class="flex items-center gap-2 text-gray-400 mt-2"><span>📍</span> ${trip.currentLocation.city}</div>
            </div>
            
            <div class="mt-3 pt-2 border-t border-gray-100 flex gap-2">
               <button id="${chatBtnId}" class="flex-1 bg-indigo-50 text-indigo-700 py-1.5 rounded text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1 border border-indigo-200 cursor-pointer">
                  <span>💬</span> Chat
               </button>
               
               <a href="https://www.google.com/maps/dir/?api=1&origin=$?q=${encodeURIComponent(trip.departure)}&destination=${encodeURIComponent(trip.destination)}&waypoints=${trip.currentLocation.lat},${trip.currentLocation.lng}&travelmode=driving" 
                  target="_blank" 
                  class="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs font-bold hover:bg-blue-700 text-center no-underline block">
                  📍 Suivre
               </a>
            </div>
          </div>
        `;

        const marker = L.marker([trip.currentLocation.lat, trip.currentLocation.lng])
          .bindPopup(popupContent);

        // 3. LOGIQUE D'ATTACHEMENT DU CLICK (Quand le popup s'ouvre)
        marker.on('popupopen', () => {
           if (driver) {
              setTimeout(() => { // Petit délai de sécurité pour le DOM
                  const btn = document.getElementById(chatBtnId);
                  if (btn) {
                     btn.onclick = (e) => {
                        e.preventDefault(); // Empêcher comportement par défaut
                        // IMPORTANT: Revenir dans la Zone Angular pour la navigation
                        this.ngZone.run(() => {
                            this.openChat(driver);
                        });
                     };
                  }
              }, 50);
           }
        });

        marker.addTo(this.markers);
      }
    });

    if (data.length > 0) {
       const group = L.featureGroup(this.markers.getLayers() as L.Marker[]);
       this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  openChat(driver: UserProfile) {
     this.chatService.startChatWith(driver);
     this.router.navigate(['/admin/chat']);
  }
}
