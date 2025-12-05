#!/bin/bash
set -e

echo "🚀 Mise à jour du module Trajets (Multi-sociétés, Géolocalisation & Google Maps)..."

# 1. Mise à jour du Service Trip (Ajout Company + Location + Delete)
echo "📦 Mise à jour de TripService..."
cat <<EOF > src/app/core/services/trip.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Parcel {
  description: string;
  weight: number;
  recipient: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  city: string; // "Supposition de la ville"
  lastUpdate: string;
}

export interface Trip {
  uid?: string;
  departure: string;
  destination: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  driverId: string;
  carId: string;
  company: string; // Pour le filtrage par société
  currentLocation?: GeoLocation; // Position approximative
  parcels: Parcel[];
}

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private firestore = inject(Firestore);
  private tripsCollection = collection(this.firestore, 'trips');

  getTrips(): Observable<Trip[]> {
    return collectionData(this.tripsCollection, { idField: 'uid' }) as Observable<Trip[]>;
  }

  createTrip(trip: Trip) {
    return addDoc(this.tripsCollection, trip);
  }

  deleteTrip(tripId: string) {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return deleteDoc(tripRef);
  }

  // Simulation de la mise à jour de position (pour la démo)
  updatePosition(tripId: string, location: GeoLocation) {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return updateDoc(tripRef, { 
      currentLocation: location,
      status: 'IN_PROGRESS'
    });
  }
}
EOF

# 2. Mise à jour du Composant TripManager (Filtres & Map & Delete)
echo "🗺️ Mise à jour de TripManagerComponent..."
cat <<EOF > src/app/features/admin/trips/trip-manager.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { TripService, Trip } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { AuthService } from '../../../core/auth/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-trip-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: \`
    <div class="space-y-6">
      
      <!-- Header & Actions -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 class="text-2xl font-bold text-gray-800">Suivi des Trajets</h2>
           <p class="text-sm text-gray-500">Gérez la logistique et suivez les livraisons en temps réel.</p>
        </div>
        <button (click)="toggleForm()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-all">
           <span class="text-xl">{{ showForm ? '✕' : '+' }}</span>
           {{ showForm ? 'Fermer' : 'Nouveau Trajet' }}
        </button>
      </div>

      <!-- Section Filtres -->
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
         <div class="flex-1 w-full">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrer par Société</label>
            <select [formControl]="companyFilterControl" class="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border">
               <option value="">Toutes les sociétés</option>
               <option value="DHL">DHL</option>
               <option value="FedEx">FedEx</option>
               <option value="UPS">UPS</option>
               <option value="Interne">Interne</option>
            </select>
         </div>
         <div class="flex-1 w-full">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">État de la livraison</label>
            <div class="flex items-center gap-2 mt-2">
               <input type="checkbox" [formControl]="inProgressFilterControl" id="inprogress" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
               <label for="inprogress" class="text-sm text-gray-700 font-medium">Afficher uniquement "En cours"</label>
            </div>
         </div>
      </div>

      <!-- Formulaire Création (Visible si showForm = true) -->
      <div *ngIf="showForm" class="bg-white p-6 rounded-lg shadow-xl border-l-4 border-indigo-500 animate-fade-in">
         <h3 class="text-lg font-bold text-gray-800 mb-4">Planifier une expédition</h3>
         <form [formGroup]="tripForm" (ngSubmit)="createTrip()">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <div>
                  <label class="block text-sm font-medium text-gray-700">Départ (Ville)</label>
                  <input formControlName="departure" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="Ex: Paris">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Destination (Ville)</label>
                  <input formControlName="destination" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="Ex: Lyon">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Date de départ</label>
                  <input formControlName="date" type="date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
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

            <!-- Colis -->
            <div class="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
               <div class="flex justify-between items-center mb-2">
                  <h4 class="text-sm font-bold text-gray-700">📦 Chargement</h4>
                  <button type="button" (click)="addParcel()" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-white px-2 py-1 rounded border border-indigo-200 shadow-sm">+ Ajouter un colis</button>
               </div>
               <div formArrayName="parcels" class="space-y-2">
                  @for (parcel of parcels.controls; track i; let i = \$index) {
                     <div [formGroupName]="i" class="flex flex-wrap md:flex-nowrap gap-2 items-center">
                        <input formControlName="description" placeholder="Description" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="weight" type="number" placeholder="Kg" class="w-20 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="recipient" placeholder="Client" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <button type="button" (click)="removeParcel(i)" class="text-red-500 hover:bg-red-50 p-1 rounded transition">🗑️</button>
                     </div>
                  }
               </div>
            </div>

            <div class="flex justify-end gap-3">
               <button type="button" (click)="toggleForm()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Annuler</button>
               <button type="submit" [disabled]="tripForm.invalid" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-bold shadow-sm disabled:opacity-50">
                  Valider le Trajet
               </button>
            </div>
         </form>
      </div>

      <!-- Liste des Trajets (Tableau) -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
               <thead class="bg-gray-50">
                  <tr>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trajet & Société</th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut & Position</th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détails</th>
                     <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
               </thead>
               <tbody class="bg-white divide-y divide-gray-200">
                  @for (trip of filteredTrips(); track trip.uid) {
                     <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4">
                           <div class="flex items-center">
                              <div class="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl mr-3">
                                 🚚
                              </div>
                              <div>
                                 <div class="text-sm font-bold text-gray-900">{{ trip.departure }} <span class="text-gray-400">➝</span> {{ trip.destination }}</div>
                                 <div class="text-xs text-gray-500 font-medium">Soc: <span class="text-indigo-600">{{ trip.company }}</span></div>
                              </div>
                           </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                           <div class="flex flex-col gap-1">
                              <!-- Badge Statut -->
                              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit"
                                 [ngClass]="{
                                    'bg-yellow-100 text-yellow-800': trip.status === 'PENDING',
                                    'bg-blue-100 text-blue-800': trip.status === 'IN_PROGRESS',
                                    'bg-green-100 text-green-800': trip.status === 'COMPLETED'
                                 }">
                                 {{ trip.status === 'IN_PROGRESS' ? 'En cours de livraison' : trip.status }}
                              </span>
                              
                              <!-- Position Approximative (Si en cours) -->
                              @if (trip.status === 'IN_PROGRESS' && trip.currentLocation) {
                                 <div class="flex items-center text-xs text-gray-600 mt-1 animate-pulse">
                                    <span class="mr-1">📡</span> 
                                    Actuellement vers : <span class="font-bold ml-1">{{ trip.currentLocation.city }}</span>
                                 </div>
                              }
                           </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                           <div class="text-sm text-gray-900">{{ trip.date | date:'shortDate' }}</div>
                           <div class="text-xs text-gray-500">{{ trip.parcels.length }} Colis chargé(s)</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           <div class="flex justify-end gap-2">
                              <!-- BOUTON GOOGLE MAPS INTELLIGENT -->
                              <a [href]="getGoogleMapsUrl(trip)" target="_blank" 
                                 class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                 title="Ouvrir dans Google Maps">
                                 <span class="mr-1.5 text-red-500 text-sm">📍</span> 
                                 {{ trip.status === 'IN_PROGRESS' ? 'Suivre' : 'Voir Trajet' }}
                              </a>
                              
                              <!-- Bouton Simuler (Pour la démo) -->
                              @if (trip.status !== 'COMPLETED') {
                                 <button (click)="simulateMovement(trip)" class="text-indigo-600 hover:text-indigo-900 text-xs underline">
                                    Simuler Avancée
                                 </button>
                              }
                              
                              <!-- BOUTON SUPPRIMER -->
                              <button (click)="deleteTrip(trip)" class="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded transition" title="Supprimer le trajet">
                                 🗑️
                              </button>
                           </div>
                        </td>
                     </tr>
                  } @empty {
                     <tr>
                        <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                           <p class="text-lg">Aucun trajet trouvé.</p>
                           <p class="text-sm">Modifiez vos filtres ou créez un nouveau trajet.</p>
                        </td>
                     </tr>
                  }
               </tbody>
            </table>
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
  
  showForm = false;
  
  // Data Streams
  cars$ = this.carService.getCars();
  private rawTrips = toSignal(this.tripService.getTrips(), { initialValue: [] });
  private currentUser = toSignal(this.authService.user$);

  // Filters Controls
  companyFilterControl = this.fb.control('');
  inProgressFilterControl = this.fb.control(false);

  // Formulaire
  tripForm = this.fb.group({
    departure: ['', Validators.required],
    destination: ['', Validators.required],
    date: ['', Validators.required],
    carId: ['', Validators.required],
    parcels: this.fb.array([])
  });

  // Filter Logic (Signal Computed)
  // Combine les filtres et les données brutes
  filteredTrips = computed(() => {
    const trips = this.rawTrips();
    const companyFilter = this.companyFilterControl.value;
    const statusFilter = this.inProgressFilterControl.value; // true/false

    return trips.filter(t => {
       const matchesCompany = companyFilter ? t.company === companyFilter : true;
       const matchesStatus = statusFilter ? t.status === 'IN_PROGRESS' : true;
       return matchesCompany && matchesStatus;
    });
  });

  constructor() {
     // Réagir aux changements des contrôles de filtre pour déclencher la détection de changement si besoin
     // Angular Signals gère ça via les templates, mais ici nous utilisons computed() qui est clean.
     // Pour que computed() se mette à jour, il faut que ses dépendances soient des signaux.
     // Petite astuce : on convertit les valueChanges en signal si on veut du pur réactif,
     // mais ici Angular change detection standard suffira car les controls sont liés via [formControl].
     // Correction pour la réactivité immédiate : 
     this.companyFilterControl.valueChanges.subscribe(() => this.refreshSignal());
     this.inProgressFilterControl.valueChanges.subscribe(() => this.refreshSignal());
  }
  
  // Hack simple pour forcer le re-calcul du computed si on n'utilise pas toSignal sur les inputs
  private refreshSignal = signal(0); 

  // Accesseurs Formulaire
  get parcels() { return this.tripForm.get('parcels') as FormArray; }

  toggleForm() { this.showForm = !this.showForm; }

  addParcel() {
    this.parcels.push(this.fb.group({
      description: ['', Validators.required],
      weight: [0, Validators.required],
      recipient: ['', Validators.required]
    }));
  }

  removeParcel(index: number) { this.parcels.removeAt(index); }

  async createTrip() {
    if (this.tripForm.valid) {
      const user = this.currentUser();
      // On récupère le profil complet pour avoir la "company" de l'admin qui crée
      // Pour simplifier ici, on va mocker ou supposer une company par défaut si non trouvée
      const company = 'DHL'; // Idéalement: await userService.getUserProfile(user.uid).company

      const formVal = this.tripForm.value;
      const newTrip: Trip = {
        departure: formVal.departure!,
        destination: formVal.destination!,
        date: formVal.date!,
        carId: formVal.carId!,
        driverId: 'PENDING', 
        company: company, // Assignation auto
        status: 'PENDING',
        parcels: formVal.parcels as any[]
      };

      await this.tripService.createTrip(newTrip);
      this.tripForm.reset();
      this.parcels.clear();
      this.showForm = false;
    }
  }

  // Suppression
  async deleteTrip(trip: Trip) {
    if (confirm(\`Êtes-vous sûr de vouloir supprimer le trajet \${trip.departure} -> \${trip.destination} ?\`)) {
      await this.tripService.deleteTrip(trip.uid!);
    }
  }

  // --- LOGIQUE GOOGLE MAPS ---
  getGoogleMapsUrl(trip: Trip): string {
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const origin = encodeURIComponent(trip.departure);
    const dest = encodeURIComponent(trip.destination);
    
    let url = \`\${baseUrl}&origin=\${origin}&destination=\${dest}&travelmode=driving\`;

    // Si on a une position actuelle approximative, on l'ajoute comme waypoint
    if (trip.status === 'IN_PROGRESS' && trip.currentLocation) {
       const waypoint = \`\${trip.currentLocation.lat},\${trip.currentLocation.lng}\`;
       url += \`&waypoints=\${waypoint}\`;
    }

    return url;
  }

  // --- SIMULATION POUR LA DÉMO ---
  simulateMovement(trip: Trip) {
     // Simule une avancée vers une ville intermédiaire aléatoire
     const cities = ['Orléans', 'Tours', 'Dijon', 'Macon', 'Valence'];
     const randomCity = cities[Math.floor(Math.random() * cities.length)];
     
     // Coordonnées bidons pour l'exemple (Centre France)
     const lat = 46 + Math.random(); 
     const lng = 2 + Math.random();

     this.tripService.updatePosition(trip.uid!, {
        lat: lat,
        lng: lng,
        city: randomCity, // Supposition de la ville
        lastUpdate: new Date().toISOString()
     });
     
     alert(\`Position mise à jour : \${randomCity}. Le statut passe en "En cours". Vérifiez le bouton Maps !\`);
  }
}
EOF