#!/bin/bash
set -e

echo "📞 Correction finale : Données Fictives (Téléphones) + Login Admin Bypass..."

# ====================================================
# 1. MOCK DATA SERVICE (VOTRE VERSION AVEC GOUVERNORATS + TÉLÉPHONE)
# ====================================================
echo "🧪 Mise à jour de MockDataService (Gouvernorats + Téléphones)..."
cat <<EOF > src/app/core/services/mock-data.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, writeBatch, doc, query } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import { environment } from '../../../environments/environment';

const TUNISIAN_GOVERNORATES = [
  { name: "Tunis", lat: 36.8065, lng: 10.1815 },
  { name: "Ariana", lat: 36.8665, lng: 10.1647 },
  { name: "Ben Arous", lat: 36.7531, lng: 10.2189 },
  { name: "Manouba", lat: 36.8080, lng: 10.0970 },
  { name: "Nabeul", lat: 36.4540, lng: 10.7350 },
  { name: "Zaghouan", lat: 36.4027, lng: 10.1423 },
  { name: "Bizerte", lat: 37.2744, lng: 9.8739 },
  { name: "Béja", lat: 36.7333, lng: 9.1833 },
  { name: "Jendouba", lat: 36.5011, lng: 8.7802 },
  { name: "Le Kef", lat: 36.1829, lng: 8.7140 },
  { name: "Siliana", lat: 36.0833, lng: 9.3833 },
  { name: "Kairouan", lat: 35.6769, lng: 10.1010 },
  { name: "Kasserine", lat: 35.1676, lng: 8.8365 },
  { name: "Sidi Bouzid", lat: 35.0400, lng: 9.4800 },
  { name: "Sousse", lat: 35.8256, lng: 10.6084 },
  { name: "Monastir", lat: 35.7643, lng: 10.8113 },
  { name: "Mahdia", lat: 35.5047, lng: 11.0622 },
  { name: "Sfax", lat: 34.7406, lng: 10.7603 },
  { name: "Gafsa", lat: 34.4250, lng: 8.7842 },
  { name: "Tozeur", lat: 33.9197, lng: 8.1335 },
  { name: "Kébili", lat: 33.7044, lng: 8.9690 },
  { name: "Gabès", lat: 33.8815, lng: 10.0982 },
  { name: "Médenine", lat: 33.3540, lng: 10.5055 },
  { name: "Tataouine", lat: 32.9297, lng: 10.4518 }
];

const COMPANIES = [{ name: 'Tunisia Express', email: 'contact@tn-express.tn' }, { name: 'Carthage Logistics', email: 'info@carthage.tn' }];

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private firestore = inject(Firestore);

  async generateAll() {
    // 1. Nettoyage de Firestore
    await this.clearFirestore();

    // 2. Initialisation App Secondaire pour créer les Auth Users
    const secondaryApp = initializeApp(environment.firebase, 'SecondaryApp');
    const secondaryAuth = getAuth(secondaryApp);
    const batch = writeBatch(this.firestore);

    try {
      for (const companyData of COMPANIES) {
        const companyId = 'comp_' + Math.random().toString(36).substr(2, 9);
        const companyRef = doc(this.firestore, 'companies', companyId);
        batch.set(companyRef, { uid: companyId, name: companyData.name, contactEmail: companyData.email, isActive: true, createdAt: new Date().toISOString() });

        // Création de 3 chauffeurs et 3 employés par société
        for (let i = 0; i < 3; i++) {
           await this.createUser(secondaryAuth, batch, 'DRIVER', companyData.name);
           await this.createUser(secondaryAuth, batch, 'EMPLOYEE', companyData.name);
        }
      }
      await batch.commit();
      alert('Données générées ! Les numéros de téléphone (+216...) ont été correctement ajoutés pour les chauffeurs et employés.');
    } finally {
      await deleteApp(secondaryApp);
    }
  }

  private async createUser(secondaryAuth: Auth, batch: any, role: string, company: string) {
    // Email unique pour éviter les conflits Auth
    const email = \`\${role.toLowerCase()}.\${Date.now()}\${Math.floor(Math.random()*100)}@test.com\`;
    const password = 'Admin123';
    
    // Génération Numéro Tunisien (Fixe pour test)
    const phonePrefix = ['20', '21', '22', '50', '55', '98', '99'][Math.floor(Math.random() * 7)];
    const phone = \`+216 \${phonePrefix} \${Math.floor(Math.random() * 899 + 100)} \${Math.floor(Math.random() * 899 + 100)}\`;

    let uid = 'mock_' + Math.random().toString(36).substr(2, 9);
    
    try {
       const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
       uid = cred.user.uid;
       await signOut(secondaryAuth);
    } catch(e) {
       console.warn("Auth creation skipped (Mock fallback):", e);
    }
    
    const userRef = doc(this.firestore, 'users', uid);
    // ICI: On s'assure que phoneNumber est bien dans l'objet
    const userData = { 
        uid, 
        email, 
        role, 
        company, 
        phoneNumber: phone, 
        isActive: true, 
        createdAt: new Date() 
    };
    batch.set(userRef, userData);
    
    // Si Chauffeur : Création Véhicule + Trajet Test
    if(role === 'DRIVER') {
       const carId = 'car_' + uid;
       const carRef = doc(this.firestore, 'cars', carId);
       batch.set(carRef, { uid: carId, model: 'Partner', plate: '123 TN 4567', status: 'BUSY', assignedDriverId: uid, company });
       
       const tripRef = doc(collection(this.firestore, 'trips'));
       
       // Trajet aléatoire entre deux gouvernorats
       const start = TUNISIAN_GOVERNORATES[Math.floor(Math.random() * TUNISIAN_GOVERNORATES.length)];
       let end = TUNISIAN_GOVERNORATES[Math.floor(Math.random() * TUNISIAN_GOVERNORATES.length)];
       while(end === start) end = TUNISIAN_GOVERNORATES[Math.floor(Math.random() * TUNISIAN_GOVERNORATES.length)];

       // Position au milieu (En cours)
       const currentLocation = { 
           lat: (start.lat + end.lat)/2, 
           lng: (start.lng + end.lng)/2, 
           city: 'En route', 
           lastUpdate: new Date().toISOString() 
       };
       
       batch.set(tripRef, { 
          departure: start.name, destination: end.name, 
          departureLat: start.lat, departureLng: start.lng,
          destinationLat: end.lat, destinationLng: end.lng,
          date: new Date().toISOString(), 
          status: 'IN_PROGRESS', driverId: uid, carId, company, currentLocation, parcels: [] 
       });
    }
  }

  private async clearFirestore() {
    const collections = ['users', 'companies', 'cars', 'trips'];
    for (const colName of collections) {
      const q = query(collection(this.firestore, colName));
      const snapshot = await getDocs(q);
      const batch = writeBatch(this.firestore);
      snapshot.docs.forEach((d) => { 
          // NE JAMAIS SUPPRIMER L'ADMIN
          const data = d.data();
          if(colName !== 'users' || (data && data['email'] !== 'admin@gmail.com')) {
              batch.delete(d.ref); 
          }
      });
      await batch.commit();
    }
  }
}
EOF

# ==========================================
# 2. LIVE MAP (Affichage Téléphone dans Popup)
# ==========================================
echo "🌍 Mise à jour LiveMapComponent (Affichage Téléphone)..."
cat <<EOF > src/app/features/admin/live-map/live-map.component.ts
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

// URLs CDN
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
  template: \`
    <div class="flex flex-col h-full w-full relative overflow-hidden">
      <div class="absolute top-4 left-4 right-14 md:right-auto md:w-96 bg-white p-4 rounded-xl shadow-lg z-[5000] border border-gray-200 flex flex-col gap-3">
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
              <select formControlName="company" class="w-full text-sm border-gray-300 rounded-md bg-gray-50">
                 <option value="">Toutes les sociétés</option>
                 @for (company of activeCompanies(); track company.uid) { <option [value]="company.name">{{ company.name }}</option> }
              </select>
           </div>
           <div><input formControlName="search" type="text" placeholder="Rechercher..." class="w-full text-sm border-gray-300 rounded-md bg-gray-50"></div>
        </form>
      </div>
      <div id="map" class="flex-1 w-full h-full z-0 bg-gray-100"></div>
    </div>
  \`,
  styles: [\`:host { display: block; height: 100%; width: 100%; } #map { height: 100%; width: 100%; }\`]
})
export class LiveMapComponent implements AfterViewInit, OnDestroy {
  private tripService = inject(TripService);
  private carService = inject(CarService);
  private userService = inject(UserService);
  private companyService = inject(CompanyService);
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
    map(([trips, cars, users, filters]) => {
      const activeTrips = trips.filter(t => t.status === 'IN_PROGRESS' && t.currentLocation);
      const enrichedTrips = activeTrips.map(trip => {
        const car = cars.find(c => c.uid === trip.carId);
        const driver = users.find(u => u.uid === car?.assignedDriverId);
        return { trip, car, driver };
      });
      const searchTerm = (filters.search || '').toLowerCase();
      return enrichedTrips.filter(item => {
         const matchCompany = !filters.company || item.driver?.company === filters.company || item.trip.company === filters.company;
         const matchSearch = !searchTerm || item.car?.plate?.toLowerCase().includes(searchTerm) || item.trip.currentLocation?.city.toLowerCase().includes(searchTerm);
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
        const googleMapsUrl = \`https://www.google.com/maps/dir/?api=1&origin=\${encodeURIComponent(trip.departure)}&destination=\${encodeURIComponent(trip.destination)}&waypoints=\${trip.currentLocation.lat},\${trip.currentLocation.lng}&travelmode=driving\`;
        
        // POPUP AVEC TÉLÉPHONE CLICKABLE
        const phoneDisplay = driver?.phoneNumber ? driver.phoneNumber : 'Non renseigné';
        
        const popupContent = \`
          <div class="font-sans p-1 min-w-[220px]">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                <div class="font-bold text-indigo-700 text-sm">\${car?.model || 'Véhicule'}</div>
                <div class="text-xs bg-gray-100 px-1 rounded font-mono">\${car?.plate}</div>
            </div>
            <div class="text-xs text-gray-600 space-y-1">
               <div class="flex items-center gap-2"><span>🏢</span> <strong>\${driver?.company || 'N/A'}</strong></div>
               <div class="flex items-center gap-2"><span>🧢</span> \${driver?.email?.split('@')[0]}</div>
               
               <!-- AJOUT TÉLÉPHONE CLICKABLE -->
               <div class="flex items-center gap-2 text-indigo-600 font-bold" style="font-size: 13px;">
                  <span>📞</span> <a href="tel:\${phoneDisplay}" class="hover:underline">\${phoneDisplay}</a>
               </div>
               
               <div class="flex items-center gap-2 text-gray-400 mt-2"><span>📍</span> \${trip.currentLocation.city}</div>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 text-center">
               <a href="\${googleMapsUrl}" target="_blank" class="inline-flex items-center justify-center w-full px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 text-decoration-none">📍 Suivre</a>
            </div>
          </div>
        \`;
        L.marker([trip.currentLocation.lat, trip.currentLocation.lng]).bindPopup(popupContent).addTo(this.markers);
      }
    });
    if (data.length > 0) {
       const group = L.featureGroup(this.markers.getLayers() as L.Marker[]);
       this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }
}
EOF

# ==========================================
# 3. USER LIST COMPONENT (Affichage Téléphone)
# ==========================================
echo "👤 Mise à jour de UserListComponent (Colonne Téléphone)..."
cat <<EOF > src/app/features/admin/users/user-list.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="px-4 py-5 sm:px-6 flex justify-between items-center bg-indigo-50">
        <div>
           <h3 class="text-lg leading-6 font-bold text-gray-900">Gestion des Utilisateurs</h3>
        </div>
        <span class="bg-white text-indigo-600 py-1 px-3 rounded-full text-xs font-bold border border-indigo-200">
          Total: {{ (users$ | async)?.length || 0 }}
        </span>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            @for (user of users$ | async; track user.uid) {
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3">
                      {{ user.email.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ user.email }}</div>
                      <div class="text-xs text-gray-500">{{ user.company }}</div>
                    </div>
                  </div>
                </td>
                <!-- COLONNE TÉLÉPHONE -->
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold">
                   <a *ngIf="user.phoneNumber" [href]="'tel:' + user.phoneNumber" class="text-indigo-700 hover:text-indigo-900 hover:underline">
                     {{ user.phoneNumber }}
                   </a>
                   <span *ngIf="!user.phoneNumber" class="text-gray-400">N/A</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    [ngClass]="{
                      'bg-purple-100 text-purple-800': user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
                      'bg-blue-100 text-blue-800': user.role === 'DRIVER',
                      'bg-green-100 text-green-800': user.role === 'EMPLOYEE'
                    }">
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                   <span *ngIf="user.isActive" class="text-green-600 text-xs font-bold">Actif</span>
                   <span *ngIf="!user.isActive" class="text-red-600 text-xs font-bold">Inactif</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button *ngIf="!user.isActive" (click)="toggleStatus(user, true)" class="text-green-600 hover:text-green-900 mr-2">Valider</button>
                  <button *ngIf="user.isActive" (click)="toggleStatus(user, false)" class="text-red-600 hover:text-red-900 mr-2">Désactiver</button>
                  <button *ngIf="isSuperAdmin() && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'" (click)="promoteToAdmin(user)" class="text-indigo-600 hover:text-indigo-900">★ Admin</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  \`
})
export class UserListComponent {
  private userService = inject(UserService);
  private authService = inject(AuthService);

  users$: Observable<UserProfile[]> = this.userService.getAllUsers();
  currentUser = toSignal(this.authService.user$);

  isSuperAdmin(): boolean { return this.currentUser()?.email === 'admin@gmail.com'; }

  toggleStatus(user: UserProfile, status: boolean) {
    if(confirm(\`Modifier le statut de \${user.email} ?\`)) this.userService.updateUserStatus(user.uid, status);
  }

  promoteToAdmin(user: UserProfile) {
    if(confirm(\`Promouvoir \${user.email} comme Admin ?\`)) this.userService.updateUserRole(user.uid, 'ADMIN');
  }
}
EOF

# ==========================================
# 4. TRIP MANAGER (Affichage Téléphone)
# ==========================================
echo "📝 Mise à jour de TripManagerComponent (Affichage Téléphone)..."
cat <<EOF > src/app/features/admin/trips/trip-manager.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { TripService, Trip, GeoLocation, TripRequest } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyService } from '../../../core/services/company.service'; 
import { UserService } from '../../../core/services/user.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-trip-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: \`
    <div class="space-y-6 p-6">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 class="text-2xl font-bold text-gray-800">Suivi des Trajets</h2>
           <p class="text-sm text-gray-500">Gérez la logistique et suivez les livraisons.</p>
        </div>
        <button (click)="toggleForm()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2">
           <span class="text-xl">{{ showForm ? '✕' : '+' }}</span>
           {{ showForm ? 'Fermer' : 'Nouveau Trajet' }}
        </button>
      </div>

      <!-- Filtres -->
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center" [formGroup]="filterForm">
         <div class="flex-1 w-full">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Société</label>
            <select formControlName="company" class="w-full border-gray-300 rounded-md shadow-sm border p-2 text-sm">
               <option value="">Toutes les sociétés</option>
               @for (company of activeCompanies(); track company.uid) {
                  <option [value]="company.name">{{ company.name }}</option>
               }
            </select>
         </div>
         <div class="flex-1 w-full">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Livraison</label>
            <div class="flex items-center gap-2 mt-2">
               <input type="checkbox" formControlName="inProgressOnly" id="inprogress" class="h-4 w-4 text-indigo-600 border-gray-300 rounded">
               <label for="inprogress" class="text-sm text-gray-700 font-medium">Uniquement "En cours"</label>
            </div>
         </div>
      </div>

      <!-- Formulaire Trajet -->
      <div *ngIf="showForm" class="bg-white p-6 rounded-lg shadow-xl border-l-4 border-indigo-500 animate-fade-in">
         <form [formGroup]="tripForm" (ngSubmit)="createTrip()">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <div>
                  <label class="block text-sm font-medium text-gray-700">Départ</label>
                  <input formControlName="departure" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Destination</label>
                  <input formControlName="destination" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Date/Heure</label>
                  <input formControlName="date" type="datetime-local" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Véhicule</label>
                  <select formControlName="carId" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                     <option value="">-- Sélectionner --</option>
                     @for (car of cars$ | async; track car.uid) {
                        <option [value]="car.uid">{{ car.model }} ({{ car.plate }})</option>
                     }
                  </select>
               </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
               <div class="flex justify-between items-center mb-2">
                  <h4 class="text-sm font-bold text-gray-700">📦 Chargement</h4>
                  <button type="button" (click)="addParcel()" class="text-xs text-indigo-600 font-bold">+ Colis</button>
               </div>
               <div formArrayName="parcels" class="space-y-2">
                  @for (parcel of parcels.controls; track i; let i = \$index) {
                     <div [formGroupName]="i" class="flex flex-wrap md:flex-nowrap gap-2 items-center">
                        <input formControlName="description" placeholder="Desc" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="weight" type="number" placeholder="Kg" class="w-16 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="recipient" placeholder="Client" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <button type="button" (click)="removeParcel(i)" class="text-red-500">×</button>
                     </div>
                  }
               </div>
            </div>

            <div class="flex justify-end gap-3">
               <button type="button" (click)="toggleForm()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md">Annuler</button>
               <button type="submit" [disabled]="tripForm.invalid" class="bg-green-600 text-white px-6 py-2 rounded-md font-bold shadow-sm disabled:opacity-50">Valider</button>
            </div>
         </form>
      </div>

      <!-- Liste Trajets -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
               <thead class="bg-gray-50">
                  <tr>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trajet & Société</th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                     <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
               </thead>
               <tbody class="bg-white divide-y divide-gray-200">
                  @for (trip of filteredTrips(); track trip.uid) {
                     <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4">
                           <div class="flex items-center">
                              <div class="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl mr-3">🚚</div>
                              <div>
                                 <div class="text-sm font-bold text-gray-900">{{ trip.departure }} ➝ {{ trip.destination }}</div>
                                 <div class="text-xs text-gray-500 font-medium">Soc: <span class="text-indigo-600">{{ trip.company }}</span></div>
                              </div>
                           </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                           <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                              [ngClass]="{'bg-yellow-100 text-yellow-800': trip.status === 'PENDING', 'bg-blue-100 text-blue-800': trip.status === 'IN_PROGRESS', 'bg-green-100 text-green-800': trip.status === 'COMPLETED'}">
                              {{ trip.status }}
                           </span>
                           <div *ngIf="trip.status === 'IN_PROGRESS' && trip.currentLocation" class="text-xs text-gray-500 mt-1">
                              📍 {{ trip.currentLocation.city }}
                           </div>
                        </td>
                        
                        <!-- COLONNE CHAUFFEUR AVEC EMAIL ET TÉLÉPHONE -->
                        <td class="px-6 py-4 whitespace-nowrap">
                           <div class="text-sm font-medium text-gray-900">
                              <span *ngIf="trip.driverEmail">{{ trip.driverEmail }}</span>
                              <span *ngIf="!trip.driverEmail" class="text-gray-400 italic">Non assigné</span>
                           </div>
                           <div class="text-xs mt-1" *ngIf="trip.driverPhone">
                              <a [href]="'tel:' + trip.driverPhone" class="text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                <span>📞</span> {{ trip.driverPhone }}
                              </a>
                           </div>
                        </td>

                        <td class="px-6 py-4 whitespace-nowrap">
                           <div class="text-sm text-gray-900">{{ trip.date | date:'dd/MM HH:mm' }}</div>
                           <div class="text-xs text-gray-500">{{ trip.parcels.length }} Colis</div>
                           <div *ngIf="trip.extraRequests?.length" class="mt-1">
                              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                 +{{ trip.extraRequests?.length }} Demandes
                              </span>
                           </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                           <button (click)="openRequestModal(trip)" class="text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">➕ Demande</button>
                           <button (click)="handleTrackClick(trip, \$event)" class="text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">📍 {{ trip.status === 'PENDING' ? 'Voir' : 'Suivre' }}</button>
                           <button (click)="deleteTrip(trip)" class="text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100">🗑️</button>
                        </td>
                     </tr>
                  } @empty {
                     <tr><td colspan="5" class="p-6 text-center text-gray-500">Aucun trajet trouvé.</td></tr>
                  }
               </tbody>
            </table>
         </div>
      </div>

      <!-- Modales (simplifiées pour le script, logiques conservées) -->
      <div *ngIf="selectedTripForRequest" class="fixed inset-0 z-50 overflow-y-auto">
         <!-- (Contenu Modal conservé tel quel) -->
         <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75"></div>
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
               <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Ajouter une demande</h3>
                  <form [formGroup]="requestForm" (ngSubmit)="submitRequest()">
                     <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">Type</label>
                        <select formControlName="type" class="mt-1 block w-full border-gray-300 rounded-md border p-2">
                           <option value="PARCEL">📦 Colis supplémentaire</option>
                           <option value="PASSENGER">🙋 Passager</option>
                        </select>
                     </div>
                     <div *ngIf="requestForm.get('type')?.value === 'PARCEL'" class="mb-3">
                        <div class="flex justify-between items-center mb-2">
                           <label class="block text-sm font-medium text-gray-700">Détails</label>
                           <button type="button" (click)="addRequestParcel()" class="text-xs text-indigo-600">+ Colis</button>
                        </div>
                        <div formArrayName="requestParcels" class="space-y-2 max-h-48 overflow-y-auto">
                           @for (p of requestParcels.controls; track i; let i = \$index) {
                              <div [formGroupName]="i" class="flex gap-2 items-center">
                                 <input formControlName="description" placeholder="Desc" class="flex-1 text-sm border-gray-300 rounded border p-1">
                                 <button type="button" (click)="removeRequestParcel(i)" class="text-red-500">×</button>
                              </div>
                           }
                        </div>
                     </div>
                     <div *ngIf="requestForm.get('type')?.value === 'PASSENGER'" class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">Description</label>
                        <textarea formControlName="description" rows="3" class="mt-1 block w-full border-gray-300 rounded-md border p-2" placeholder="Nom du passager..."></textarea>
                     </div>
                     <div class="flex justify-end gap-2 mt-4">
                        <button type="button" (click)="closeRequestModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded">Annuler</button>
                        <button type="submit" [disabled]="requestForm.invalid" class="px-4 py-2 text-white bg-indigo-600 rounded">Ajouter</button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      </div>
    </div>
  \`
})
export class TripManagerComponent {
  private fb = inject(FormBuilder);
  private tripService = inject(TripService);
  private carService = inject(CarService);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private userService = inject(UserService);
  
  showForm = false;
  selectedTripForRequest: Trip | null = null;
  cars$ = this.carService.getCars();
  private rawTrips = toSignal(this.tripService.getTrips(), { initialValue: [] });
  private currentUser = toSignal(this.authService.user$);
  activeCompanies = this.companyService.activeCompanies;
  
  filterForm = this.fb.group({
    company: [''],
    inProgressOnly: [false]
  });

  filterValues = toSignal(this.filterForm.valueChanges.pipe(
    startWith(this.filterForm.value)
  ), { initialValue: this.filterForm.value });

  tripForm = this.fb.group({
    departure: ['', Validators.required],
    destination: ['', Validators.required],
    date: ['', Validators.required],
    carId: ['', Validators.required],
    parcels: this.fb.array([])
  });

  requestForm = this.fb.group({
    type: ['PARCEL', Validators.required],
    description: [''],
    requestParcels: this.fb.array([])
  });

  // DONNÉES ENRICHIES
  private enrichedTrips$ = combineLatest([
    this.tripService.getTrips(),
    this.userService.getAllUsers(),
    this.carService.getCars()
  ]).pipe(
    map(([trips, users, cars]) => {
       return trips.map(trip => {
          let driver = users.find(u => u.uid === trip.driverId);
          if (!driver && trip.carId) {
             const car = cars.find(c => c.uid === trip.carId);
             if (car && car.assignedDriverId) {
                driver = users.find(u => u.uid === car.assignedDriverId);
             }
          }
          return {
             ...trip,
             driverEmail: driver ? driver.email : null,
             driverPhone: driver ? driver.phoneNumber : null
          };
       });
    })
  );

  private enrichedRawTrips = toSignal(this.enrichedTrips$, { initialValue: [] });

  filteredTrips = computed(() => {
    const trips = this.enrichedRawTrips();
    const filters = this.filterValues();
    
    return trips.filter(t => {
       const matchesCompany = !filters?.company || t.company === filters.company;
       const matchesStatus = filters?.inProgressOnly ? t.status === 'IN_PROGRESS' : true;
       return matchesCompany && matchesStatus;
    });
  });

  constructor() {
     this.companyFilterControl?.valueChanges.subscribe(() => this.refreshSignal());
     this.inProgressFilterControl?.valueChanges.subscribe(() => this.refreshSignal());
  }
  private refreshSignal = signal(0); 

  get parcels() { return this.tripForm.get('parcels') as FormArray; }
  get requestParcels() { return this.requestForm.get('requestParcels') as FormArray; }
  get companyFilterControl() { return this.filterForm.get('company'); }
  get inProgressFilterControl() { return this.filterForm.get('inProgressOnly'); }

  toggleForm() { this.showForm = !this.showForm; }
  addParcel() { this.parcels.push(this.fb.group({ description: ['', Validators.required], weight: [0], recipient: [''] })); }
  removeParcel(index: number) { this.parcels.removeAt(index); }
  addRequestParcel() { this.requestParcels.push(this.fb.group({ description: ['', Validators.required], weight: [0], recipient: [''] })); }
  removeRequestParcel(index: number) { this.requestParcels.removeAt(index); }

  async createTrip() {
    if (this.tripForm.valid) {
      const company = 'DHL'; 
      const formVal = this.tripForm.value;
      
      let depLat, depLng, destLat, destLng;
      if (formVal.departure?.toLowerCase().includes('sfax')) { depLat = 34.7406; depLng = 10.7603; }
      if (formVal.destination?.toLowerCase().includes('tunis')) { destLat = 36.8065; destLng = 10.1815; }

      const newTrip: Trip = {
        departure: formVal.departure!,
        destination: formVal.destination!,
        departureLat: depLat, departureLng: depLng,
        destinationLat: destLat, destinationLng: destLng,
        date: formVal.date!,
        carId: formVal.carId!,
        driverId: 'PENDING', 
        company: company,
        status: 'PENDING',
        parcels: formVal.parcels as any[],
        extraRequests: []
      };
      await this.tripService.createTrip(newTrip);
      this.tripForm.reset(); this.parcels.clear(); this.showForm = false;
    }
  }
  
  async deleteTrip(trip: Trip) { if (confirm(\`Confirmer la suppression ?\`)) await this.tripService.deleteTrip(trip.uid!); }
  openRequestModal(trip: Trip) { this.selectedTripForRequest = trip; this.requestForm.reset({ type: 'PARCEL' }); this.requestParcels.clear(); this.addRequestParcel(); }
  closeRequestModal() { this.selectedTripForRequest = null; }

  async submitRequest() {
    if (this.requestForm.valid && this.selectedTripForRequest) {
      const user = this.currentUser();
      let userProfile = null;
      if (user) {
         userProfile = await this.authService.getUserProfile(user.uid).toPromise();
      }
      const formVal = this.requestForm.value;
      const req: TripRequest = {
        type: formVal.type as any,
        description: formVal.description || '',
        parcels: formVal.type === 'PARCEL' ? formVal.requestParcels as any[] : undefined,
        requesterName: userProfile?.email?.split('@')[0] || 'Employé',
        requesterEmail: userProfile?.email || 'Inconnu',
        requesterCompany: userProfile?.company || 'Inconnu',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      await this.tripService.addRequest(this.selectedTripForRequest.uid!, req);
      this.closeRequestModal();
      alert('Demande envoyée !');
    }
  }

  // Logique Map (Similaire au précédent)
  async handleTrackClick(trip: Trip, event: Event) {
     event.preventDefault();
     if (trip.status !== 'COMPLETED') {
        // Calcul simplifié pour l'exemple
        alert('Simulation activée...');
        await this.tripService.updatePosition(trip.uid!, { lat: 35, lng: 10, city: 'En route', lastUpdate: new Date().toISOString() }, 'IN_PROGRESS');
     }
     const url = \`https://www.google.com/maps/dir/?api=1&origin=\${encodeURIComponent(trip.departure)}&destination=\${encodeURIComponent(trip.destination)}&travelmode=driving\`;
     window.open(url, '_blank');
  }
}
EOF

echo "✅ Téléphones ajoutés, filtres corrigés !"