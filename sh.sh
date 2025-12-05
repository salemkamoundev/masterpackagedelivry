#!/bin/bash
set -e

echo "🚀 Mise à jour du flux Google : Choix obligatoire du Rôle et redirection intelligente..."

mkdir -p src/app/core/auth/complete-profile
mkdir -p src/app/features/driver/dashboard

# ==========================================
# 1. MISE À JOUR AUTH SERVICE
# ==========================================
# On supprime la création automatique de profil par défaut.
# On ajoute une méthode publique pour créer le profil manuellement.

echo "🔐 Mise à jour de AuthService..."
cat <<EOF > src/app/core/auth/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, user, User } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

export interface UserProfile {
  uid: string;
  email: string;
  role: 'DRIVER' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN';
  company: string;
  isActive: boolean;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  user$ = user(this.auth);
  currentUserProfile = signal<UserProfile | null>(null);

  constructor() {}

  // Login Email/Password
  login(email: string, pass: string) {
    return from(signInWithEmailAndPassword(this.auth, email, pass));
  }

  // Login Google (Ne crée PLUS le profil automatiquement)
  loginGoogle() {
    const provider = new GoogleAuthProvider();
    return from(signInWithPopup(this.auth, provider));
  }

  // Inscription Email (Crée le profil immédiatement)
  register(email: string, pass: string, role: 'DRIVER' | 'EMPLOYEE', company: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, pass)).pipe(
      switchMap(credential => this.createProfile(credential.user, role, company))
    );
  }

  // Méthode publique pour créer le profil (utilisée par Register et CompleteProfile)
  createProfile(user: User, role: 'DRIVER' | 'EMPLOYEE', company: string) {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      role: role,
      company: company,
      isActive: false, // Inactif par défaut
      createdAt: new Date()
    };
    const userDocRef = doc(this.firestore, 'users', user.uid);
    return from(setDoc(userDocRef, userProfile));
  }

  logout() {
    return from(signOut(this.auth)).pipe(
      map(() => {
        this.router.navigate(['/login']);
      })
    );
  }

  getUserProfile(uid: string): Observable<UserProfile | undefined> {
    const userDocRef = doc(this.firestore, 'users', uid);
    return from(getDoc(userDocRef)).pipe(
      map(snapshot => snapshot.data() as UserProfile)
    );
  }
}
EOF

# ==========================================
# 1.2 MISE À JOUR TRIP SERVICE (Support des Requêtes Extra Multi-Colis)
# ==========================================
echo "📦 Mise à jour de TripService (Support des demandes extra)..."
cat <<EOF > src/app/core/services/trip.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc, arrayUnion } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Parcel {
  description: string;
  weight: number;
  recipient: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
  lastUpdate: string;
}

export interface TripRequest {
  type: 'PARCEL' | 'PASSENGER';
  description?: string; // Optionnel si c'est des colis
  parcels?: Parcel[];   // Liste des colis pour la demande
  requesterName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface Trip {
  uid?: string;
  departure: string;
  destination: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  driverId: string;
  carId: string;
  company: string;
  currentLocation?: GeoLocation;
  parcels: Parcel[];
  extraRequests?: TripRequest[]; // Nouvelles demandes (Colis ou Passager)
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

  updatePosition(tripId: string, location: GeoLocation, status: 'IN_PROGRESS' | 'COMPLETED') {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return updateDoc(tripRef, { 
      currentLocation: location,
      status: status
    });
  }

  // Ajouter une demande supplémentaire (Colis ou Passager)
  addRequest(tripId: string, request: TripRequest) {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return updateDoc(tripRef, {
      extraRequests: arrayUnion(request)
    });
  }
}
EOF

# ==========================================
# 1.3 MISE À JOUR TRIP MANAGER (Vue Employé/Admin - Ajout Demande Multi-Colis)
# ==========================================
echo "🗺️ Mise à jour de TripManagerComponent (Ajout bouton Demande Multi-Colis)..."
cat <<EOF > src/app/features/admin/trips/trip-manager.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { TripService, Trip, GeoLocation, TripRequest } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyService } from '../../../core/services/company.service'; 
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
               @for (company of activeCompanies(); track company.uid) {
                  <option [value]="company.name">{{ company.name }}</option>
               }
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
                  <input formControlName="departure" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="Ex: Sfax">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Destination (Ville)</label>
                  <input formControlName="destination" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="Ex: Tunis">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Date et Heure de départ</label>
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
                                 <div class="flex flex-col mt-1">
                                    <div class="flex items-center text-xs text-gray-600 animate-pulse">
                                       <span class="mr-1">📡</span> 
                                       Actuellement vers : <span class="font-bold ml-1">{{ trip.currentLocation.city }}</span>
                                    </div>
                                    <div class="text-[10px] text-gray-400 font-mono mt-0.5 ml-5">
                                       GPS: {{ trip.currentLocation.lat | number:'1.4-4' }}, {{ trip.currentLocation.lng | number:'1.4-4' }}
                                    </div>
                                 </div>
                              }
                           </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                           <div class="text-sm text-gray-900">{{ trip.date | date:'dd/MM/yyyy HH:mm' }}</div>
                           <div class="text-xs text-gray-500">{{ trip.parcels.length }} Colis chargé(s)</div>
                           <!-- Indicateur de demandes supplémentaires -->
                           <div *ngIf="trip.extraRequests?.length" class="mt-1">
                              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                 +{{ trip.extraRequests?.length }} Demandes
                              </span>
                           </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           <div class="flex justify-end gap-2">
                              <!-- BOUTON AJOUTER DEMANDE -->
                              <button (click)="openRequestModal(trip)" class="inline-flex items-center px-3 py-1.5 border border-indigo-200 shadow-sm text-xs font-medium rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100" title="Ajouter Colis/Passager">
                                 ➕ Demande
                              </button>

                              <!-- BOUTON GOOGLE MAPS -->
                              <button 
                                 (click)="handleTrackClick(trip, \$event)"
                                 class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                 title="Ouvrir dans Google Maps">
                                 <span class="mr-1.5 text-red-500 text-sm">📍</span> 
                                 {{ trip.status === 'PENDING' ? 'Voir Trajet' : 'Suivre' }}
                              </button>
                              
                              <!-- BOUTON SUPPRIMER -->
                              <button (click)="deleteTrip(trip)" class="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded transition" title="Supprimer">
                                 🗑️
                              </button>
                           </div>
                        </td>
                     </tr>
                  } @empty {
                     <tr>
                        <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                           <p class="text-lg">Aucun trajet trouvé.</p>
                        </td>
                     </tr>
                  }
               </tbody>
            </table>
         </div>
      </div>

      <!-- MODALE AJOUT DEMANDE -->
      <div *ngIf="selectedTripForRequest" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
               <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Ajouter une demande</h3>
                  <form [formGroup]="requestForm" (ngSubmit)="submitRequest()">
                     <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">Type</label>
                        <select formControlName="type" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm border p-2">
                           <option value="PARCEL">📦 Colis supplémentaire</option>
                           <option value="PASSENGER">🙋 Passager (Covoiturage)</option>
                        </select>
                     </div>
                     
                     <!-- CHAMPS POUR LES COLIS (Affichés si type = PARCEL) -->
                     <div *ngIf="requestForm.get('type')?.value === 'PARCEL'" class="mb-3">
                        <div class="flex justify-between items-center mb-2">
                           <label class="block text-sm font-medium text-gray-700">Détails des colis</label>
                           <button type="button" (click)="addRequestParcel()" class="text-xs text-indigo-600 font-bold">+ Colis</button>
                        </div>
                        <div formArrayName="requestParcels" class="space-y-2 max-h-48 overflow-y-auto">
                           @for (p of requestParcels.controls; track i; let i = \$index) {
                              <div [formGroupName]="i" class="flex gap-2 items-center">
                                 <input formControlName="description" placeholder="Desc" class="flex-1 text-sm border-gray-300 rounded border p-1">
                                 <input formControlName="weight" type="number" placeholder="Kg" class="w-16 text-sm border-gray-300 rounded border p-1">
                                 <button type="button" (click)="removeRequestParcel(i)" class="text-red-500">×</button>
                              </div>
                           }
                        </div>
                     </div>

                     <!-- CHAMP POUR LE PASSAGER (Affiché si type = PASSENGER) -->
                     <div *ngIf="requestForm.get('type')?.value === 'PASSENGER'" class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">Description</label>
                        <textarea formControlName="description" rows="3" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm border p-2" placeholder="Nom du passager, point de RDV..."></textarea>
                     </div>

                     <div class="flex justify-end gap-2 mt-4">
                        <button type="button" (click)="closeRequestModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Annuler</button>
                        <button type="submit" [disabled]="requestForm.invalid" class="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50">Ajouter</button>
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
  
  showForm = false;
  selectedTripForRequest: Trip | null = null;
  
  // Coordonnées Sfax -> Tunis pour l'interpolation
  private readonly SFAX_COORDS = { lat: 34.74, lng: 10.76, city: 'Sfax' };
  private readonly TUNIS_COORDS = { lat: 36.80, lng: 10.18, city: 'Tunis' };
  private readonly ESTIMATED_DURATION_MS = 5 * 60 * 60 * 1000; // 5 heures en millisecondes

  // Data Streams
  cars$ = this.carService.getCars();
  private rawTrips = toSignal(this.tripService.getTrips(), { initialValue: [] });
  private currentUser = toSignal(this.authService.user$);

  // Signal pour la liste des sociétés actives
  activeCompanies = this.companyService.activeCompanies;

  // Filters Controls
  companyFilterControl = this.fb.control('');
  inProgressFilterControl = this.fb.control(false);

  // Formulaire Création Trajet
  tripForm = this.fb.group({
    departure: ['', Validators.required],
    destination: ['', Validators.required],
    date: ['', Validators.required],
    carId: ['', Validators.required],
    parcels: this.fb.array([])
  });

  // Formulaire Demande Supplémentaire
  requestForm = this.fb.group({
    type: ['PARCEL', Validators.required],
    description: [''], // Optionnel (utilisé pour passager)
    requestParcels: this.fb.array([]) // Utilisé pour les colis
  });

  // Filter Logic (Signal Computed)
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
     this.companyFilterControl.valueChanges.subscribe(() => this.refreshSignal());
     this.inProgressFilterControl.valueChanges.subscribe(() => this.refreshSignal());
  }
  
  private refreshSignal = signal(0); 

  // Accesseurs Formulaire Principal
  get parcels() { return this.tripForm.get('parcels') as FormArray; }

  // Accesseurs Formulaire Demande
  get requestParcels() { return this.requestForm.get('requestParcels') as FormArray; }

  toggleForm() { this.showForm = !this.showForm; }

  // --- GESTION COLIS PRINCIPAUX ---
  addParcel() {
    this.parcels.push(this.fb.group({
      description: ['', Validators.required],
      weight: [0, Validators.required],
      recipient: ['', Validators.required]
    }));
  }
  removeParcel(index: number) { this.parcels.removeAt(index); }

  // --- GESTION COLIS DEMANDE ---
  addRequestParcel() {
    this.requestParcels.push(this.fb.group({
      description: ['', Validators.required],
      weight: [0, Validators.required],
      recipient: [''] // Optionnel pour demande rapide
    }));
  }
  removeRequestParcel(index: number) { this.requestParcels.removeAt(index); }


  async createTrip() {
    if (this.tripForm.valid) {
      const company = 'DHL'; // NOTE: Remplacer par la logique de récupération de la société de l'admin
      
      const formVal = this.tripForm.value;
      const newTrip: Trip = {
        departure: formVal.departure!,
        destination: formVal.destination!,
        date: formVal.date!,
        carId: formVal.carId!,
        driverId: 'PENDING', 
        company: company,
        status: 'PENDING',
        parcels: formVal.parcels as any[],
        extraRequests: []
      };

      await this.tripService.createTrip(newTrip);
      this.tripForm.reset();
      this.parcels.clear();
      this.showForm = false;
    }
  }

  async deleteTrip(trip: Trip) {
    if (confirm(\`Êtes-vous sûr de vouloir supprimer le trajet \${trip.departure} -> \${trip.destination} ?\`)) {
      await this.tripService.deleteTrip(trip.uid!);
    }
  }

  // --- GESTION DES DEMANDES SUPPLÉMENTAIRES ---
  openRequestModal(trip: Trip) {
    this.selectedTripForRequest = trip;
    this.requestForm.reset({ type: 'PARCEL' });
    this.requestParcels.clear();
    // Ajouter un colis par défaut
    this.addRequestParcel();
  }

  closeRequestModal() {
    this.selectedTripForRequest = null;
  }

  async submitRequest() {
    if (this.requestForm.valid && this.selectedTripForRequest) {
      const formVal = this.requestForm.value;
      
      const req: TripRequest = {
        type: formVal.type as any,
        description: formVal.description || '',
        parcels: formVal.type === 'PARCEL' ? formVal.requestParcels as any[] : undefined,
        requesterName: 'Employé', 
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      await this.tripService.addRequest(this.selectedTripForRequest.uid!, req);
      this.closeRequestModal();
      alert('Demande ajoutée avec succès ! Le chauffeur sera notifié.');
    }
  }

  // --- FONCTION INTELIGENTE DE TRACKING ---
  async handleTrackClick(trip: Trip, event: Event) {
    if (trip.status !== 'COMPLETED') {
        const { location, status } = this.calculateMovement(trip);
        if (status === 'COMPLETED') {
             await this.tripService.updatePosition(trip.uid!, location, 'COMPLETED');
             alert(\`Livraison terminée à \${location.city} !\`);
        } else {
             await this.tripService.updatePosition(trip.uid!, location, 'IN_PROGRESS');
             trip.currentLocation = location;
             trip.status = 'IN_PROGRESS';
        }
        const url = this.getGoogleMapsUrl(trip);
        window.open(url, '_blank');
    } else {
        const url = this.getGoogleMapsUrl(trip);
        window.open(url, '_blank');
    }
  }

  // --- CALCUL MOUVEMENT ---
  calculateMovement(trip: Trip): { location: GeoLocation, status: 'IN_PROGRESS' | 'COMPLETED' } {
    const departureTime = new Date(trip.date).getTime();
    const currentTime = Date.now();
    const elapsedTime = currentTime - departureTime;
    let progress = Math.min(1, Math.max(0, elapsedTime / this.ESTIMATED_DURATION_MS));
    
    const start = this.SFAX_COORDS;
    const end = this.TUNIS_COORDS;

    const currentLat = start.lat + (end.lat - start.lat) * progress;
    const currentLng = start.lng + (end.lng - start.lng) * progress;

    let status: 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS';
    let currentCity = 'Sur la route...';
    
    if (progress >= 1) {
        status = 'COMPLETED';
        currentCity = end.city;
    } else if (progress > 0) {
        currentCity = 'En cours (Estimation)';
    } else {
        currentCity = start.city;
    }

    return {
        location: { lat: currentLat, lng: currentLng, city: currentCity, lastUpdate: new Date().toISOString() },
        status: status
    };
  }

  getGoogleMapsUrl(trip: Trip): string {
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const origin = encodeURIComponent(trip.departure);
    const dest = encodeURIComponent(trip.destination);
    let url = \`\${baseUrl}&origin=\${origin}&destination=\${dest}&travelmode=driving\`;
    if (trip.currentLocation) {
       const waypoint = \`\${trip.currentLocation.lat},\${trip.currentLocation.lng}\`;
       url = \`\${baseUrl}&origin=\${origin}&destination=\${waypoint}&travelmode=driving\`;
       url += \`&waypoints=\${dest}\`;
    }
    return url;
  }
}
EOF

# ==========================================
# 1.5 CRÉATION DU DRIVER DASHBOARD (Pour la redirection)
# ==========================================
echo "🧢 Création de DriverDashboardComponent (Page d'accueil Chauffeur avec Missions et Détails)..."
cat <<EOF > src/app/features/driver/dashboard/driver-dashboard.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { TripService } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith } from 'rxjs';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: \`
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <header class="bg-white shadow-sm border-b border-gray-200 relative z-10">
        <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div class="flex items-center gap-3">
             <span class="text-3xl">🧢</span>
             <h1 class="text-2xl font-bold text-gray-900">Espace Chauffeur</h1>
          </div>
          <button (click)="logout()" class="text-sm bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-md font-medium transition-colors">
             Déconnexion
          </button>
        </div>
      </header>

      <main class="flex-1 max-w-7xl mx-auto w-full py-8 px-4 sm:px-6 lg:px-8 relative">
        
        <!-- SECTION FILTRES AVANCÉS -->
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
          <form [formGroup]="filterForm" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Recherche -->
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Recherche</label>
              <input formControlName="search" type="text" placeholder="Ville de départ ou destination..." class="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border">
            </div>
            <!-- Statut -->
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Statut</label>
              <select formControlName="status" class="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border">
                <option value="ALL">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminé</option>
              </select>
            </div>
            <!-- Date -->
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
              <input formControlName="date" type="date" class="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border">
            </div>
          </form>
        </div>

        <div *ngIf="missions().length > 0; else noMissions">
           <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span class="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-sm">
                 {{ missions().length }}
              </span>
              Vos Missions Assignées
           </h2>

           <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              @for (trip of missions(); track trip.uid) {
                 <div class="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full">
                    <div class="p-6 flex-1">
                       <div class="flex justify-between items-start mb-4">
                          <div class="flex flex-col">
                             <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Destination</span>
                             <span class="text-lg font-bold text-gray-900">{{ trip.destination }}</span>
                             <span class="text-xs text-gray-500">Depuis {{ trip.departure }}</span>
                          </div>
                          <span class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                            [ngClass]="{
                              'bg-yellow-100 text-yellow-800': trip.status === 'PENDING',
                              'bg-blue-100 text-blue-800': trip.status === 'IN_PROGRESS',
                              'bg-green-100 text-green-800': trip.status === 'COMPLETED'
                            }">
                            {{ trip.status }}
                          </span>
                       </div>
                       
                       <div class="space-y-2 mb-6">
                          <div class="flex items-center text-sm text-gray-600">
                             <span class="mr-2">📅</span>
                             {{ trip.date | date:'dd MMM yyyy à HH:mm' }}
                          </div>
                          <div class="flex items-center text-sm text-gray-600">
                             <span class="mr-2">🚚</span>
                             {{ trip.carModel || 'Véhicule assigné' }} <span class="text-xs bg-gray-100 px-1 rounded ml-1">{{ trip.carPlate }}</span>
                          </div>
                          <div class="flex items-center text-sm text-gray-600">
                             <span class="mr-2">📦</span>
                             <!-- Correction NG8107 : Utilisation sécurisée de la propriété -->
                             {{ (trip.parcels || []).length }} Colis à livrer
                          </div>
                       </div>
                    </div>
                    
                    <!-- ACTIONS CARD -->
                    <div class="bg-gray-50 px-6 py-3 border-t border-gray-100 flex flex-col gap-2">
                       <button (click)="viewDetails(trip)" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center justify-center gap-2">
                          <span>Voir Détails</span>
                       </button>
                       
                       <!-- BOUTON DEMANDES AVEC PASTILLE -->
                       <button (click)="viewRequests(trip)" class="w-full bg-white text-gray-700 border border-gray-200 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center justify-center gap-2 relative">
                          <span>🔔 Afficher les demandes</span>
                          <!-- Pastille si demandes > 0 -->
                          <span *ngIf="(trip.extraRequests?.length || 0) > 0" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                             {{ trip.extraRequests?.length }}
                          </span>
                       </button>
                    </div>
                 </div>
              }
           </div>
        </div>

        <ng-template #noMissions>
           <div class="h-96 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <span class="text-4xl">📭</span>
              </div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">Aucune mission pour le moment</h2>
              <p class="text-gray-500 max-w-md mx-auto">
                 Vous n'avez pas encore de trajet assigné. Assurez-vous d'être assigné à un véhicule par votre administrateur ou modifiez vos filtres.
              </p>
           </div>
        </ng-template>

        <!-- MODAL DÉTAILS MISSION -->
        <div *ngIf="selectedTrip()" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div (click)="closeDetails()" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div class="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div class="bg-indigo-600 px-4 py-4 sm:px-6 flex justify-between items-center text-white">
                   <h3 class="text-lg leading-6 font-bold">Détails de la Mission</h3>
                   <button (click)="closeDetails()" class="text-indigo-200 hover:text-white text-2xl leading-none">&times;</button>
              </div>
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 space-y-4">
                   <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 text-center w-full">
                         <div class="text-xl font-bold text-gray-800">{{ selectedTrip()?.departure }}</div>
                         <div class="text-xs text-gray-400 uppercase tracking-widest my-1">VERS</div>
                         <div class="text-xl font-bold text-indigo-600">{{ selectedTrip()?.destination }}</div>
                   </div>
                   <div class="grid grid-cols-2 gap-4">
                      <div class="border border-gray-100 p-3 rounded-lg">
                         <p class="text-xs text-gray-500 uppercase font-bold mb-1">Départ Prévu</p>
                         <p class="text-sm font-medium">{{ selectedTrip()?.date | date:'short' }}</p>
                      </div>
                      <div class="border border-gray-100 p-3 rounded-lg">
                         <p class="text-xs text-gray-500 uppercase font-bold mb-1">Véhicule</p>
                         <p class="text-sm font-medium">{{ selectedTrip()?.carModel }}</p>
                      </div>
                   </div>
                   <div>
                      <h4 class="text-sm font-bold text-gray-700 mb-2 border-b pb-1">📦 Liste de Colis ({{ selectedTrip()?.parcels?.length || 0 }})</h4>
                      <ul class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                         @for (p of selectedTrip()?.parcels; track \$index) {
                             <li class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                                <div><p class="text-sm font-semibold text-gray-800">{{ p.description }}</p><p class="text-xs text-gray-500">Pour: {{ p.recipient }}</p></div>
                                <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">{{ p.weight }} kg</span>
                             </li>
                         } @empty { <li class="text-sm text-gray-500 italic p-2">Aucun colis enregistré.</li> }
                      </ul>
                   </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button (click)="closeDetails()" type="button" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Fermer</button>
                <button *ngIf="selectedTrip()?.status === 'PENDING'" (click)="startMission()" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Démarrer 🚀</button>
                <button *ngIf="selectedTrip()?.status === 'IN_PROGRESS'" (click)="completeMission()" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Terminer 🏁</button>
              </div>
            </div>
          </div>
        </div>

        <!-- MODAL DEMANDES SUPPLÉMENTAIRES (Mise à jour pour affichage multi-colis) -->
        <div *ngIf="selectedRequestsTrip()" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div (click)="closeRequests()" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div class="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div class="bg-purple-600 px-4 py-4 sm:px-6 flex justify-between items-center text-white">
                   <h3 class="text-lg leading-6 font-bold">Demandes Supplémentaires</h3>
                   <button (click)="closeRequests()" class="text-purple-200 hover:text-white text-2xl leading-none">&times;</button>
              </div>
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                 <ul class="space-y-3">
                    @for (req of selectedRequestsTrip()?.extraRequests; track \$index) {
                       <li class="bg-purple-50 p-3 rounded-lg border border-purple-100">
                          <div class="flex justify-between items-start">
                             <div class="flex items-center gap-2">
                                <span *ngIf="req.type === 'PARCEL'" class="text-xl">📦</span>
                                <span *ngIf="req.type === 'PASSENGER'" class="text-xl">🙋</span>
                                <span class="font-bold text-gray-800">{{ req.type === 'PARCEL' ? 'Colis (' + (req.parcels?.length || 0) + ')' : 'Passager' }}</span>
                             </div>
                             <span class="text-xs text-gray-500">{{ req.createdAt | date:'shortTime' }}</span>
                          </div>
                          
                          <!-- Affichage conditionnel selon type -->
                          @if (req.type === 'PARCEL' && req.parcels?.length) {
                             <div class="mt-2 space-y-1">
                                @for (p of req.parcels; track \$index) {
                                   <div class="text-sm text-gray-700 bg-white p-1 rounded border border-purple-100 flex justify-between">
                                      <span>{{ p.description }}</span>
                                      <span class="text-xs font-bold">{{ p.weight }}kg</span>
                                   </div>
                                }
                             </div>
                          } @else {
                             <p class="text-sm text-gray-600 mt-2">{{ req.description }}</p>
                          }

                          <p class="text-xs text-purple-600 mt-1 font-medium">Demandé par : {{ req.requesterName }}</p>
                       </li>
                    } @empty {
                       <li class="text-center py-8 text-gray-500 italic">Aucune demande supplémentaire pour le moment.</li>
                    }
                 </ul>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button (click)="closeRequests()" type="button" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Fermer</button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  \`
})
export class DriverDashboardComponent {
  private authService = inject(AuthService);
  private tripService = inject(TripService);
  private carService = inject(CarService);
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);

  private user$ = this.authService.user$;
  private cars$ = this.carService.getCars();
  private allTrips$ = this.tripService.getTrips();

  filterForm = this.fb.group({
    search: [''],
    status: ['ALL'],
    date: ['']
  });

  selectedTrip = signal<any>(null);
  selectedRequestsTrip = signal<any>(null); // Pour la modale de demandes

  missions = toSignal(
    combineLatest([
      this.user$,
      this.cars$,
      this.allTrips$,
      this.filterForm.valueChanges.pipe(startWith(this.filterForm.value))
    ]).pipe(
      map(([user, cars, trips, filters]) => {
        if (!user) return [];
        const myCar = cars.find(c => c.assignedDriverId === user.uid);
        if (!myCar) return [];

        let myTrips = trips
          .filter(t => t.carId === myCar.uid)
          .map(t => ({ ...t, carModel: myCar.model, carPlate: myCar.plate }));

        // APPLIQUER LES FILTRES
        const searchTerm = (filters.search || '').toLowerCase();
        const statusFilter = filters.status;
        const dateFilter = filters.date;

        return myTrips.filter(t => {
          // Filtre Recherche
          const matchesSearch = !searchTerm || 
            t.departure.toLowerCase().includes(searchTerm) || 
            t.destination.toLowerCase().includes(searchTerm);

          // Filtre Statut
          const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

          // Filtre Date
          let matchesDate = true;
          if (dateFilter) {
             // Extraction de la date YYYY-MM-DD depuis la chaîne ISO
             const tripDate = new Date(t.date).toISOString().split('T')[0];
             matchesDate = tripDate === dateFilter;
          }

          return matchesSearch && matchesStatus && matchesDate;
        });
      })
    ),
    { initialValue: [] }
  );

  viewDetails(trip: any) { this.selectedTrip.set(trip); }
  closeDetails() { this.selectedTrip.set(null); }

  viewRequests(trip: any) { this.selectedRequestsTrip.set(trip); }
  closeRequests() { this.selectedRequestsTrip.set(null); }

  async startMission() {
    const trip = this.selectedTrip();
    if (!trip) return;
    try {
      const tripRef = doc(this.firestore, 'trips', trip.uid);
      await updateDoc(tripRef, { status: 'IN_PROGRESS' });
      this.closeDetails();
      alert('Bonne route ! La course est maintenant en cours.');
    } catch (err) { alert('Erreur : ' + err); }
  }

  async completeMission() {
    const trip = this.selectedTrip();
    if (!trip) return;
    if (confirm('Confirmez-vous la fin de cette course ?')) {
        try {
          const tripRef = doc(this.firestore, 'trips', trip.uid);
          await updateDoc(tripRef, { status: 'COMPLETED' });
          this.closeDetails();
          alert('Félicitations ! Course terminée.');
        } catch (err) {
          alert('Erreur lors de la clôture de la course : ' + err);
        }
    }
  }

  logout() { this.authService.logout().subscribe(); }
}
EOF

# ==========================================
# 2. CRÉATION DU COMPOSANT COMPLETE PROFILE
# ==========================================

echo "📝 Création de CompleteProfileComponent..."
cat <<EOF > src/app/core/auth/complete-profile/complete-profile.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CompanyService } from '../../services/company.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: \`
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">Finaliser l'inscription</h2>
          <p class="mt-2 text-sm text-gray-600">
            Bienvenue ! Veuillez compléter votre profil pour accéder à l'application.
          </p>
        </div>
        
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
          
          <!-- Affichage Email (Lecture seule) -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Compte Google</label>
            <div class="mt-1 px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-600 text-sm">
              {{ (currentUser$ | async)?.email }}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Votre Métier</label>
            <select formControlName="role" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border">
              <option value="" disabled>Choisir un métier</option>
              <option value="DRIVER">Chauffeur</option>
              <option value="EMPLOYEE">Employé</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Votre Société</label>
            <select formControlName="company" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border">
              <option value="" disabled>Choisir une société</option>
              @for (company of activeCompanies(); track company.uid) {
                 <option [value]="company.name">{{ company.name }}</option>
              }
            </select>
            <p *ngIf="activeCompanies().length === 0" class="mt-1 text-xs text-red-500">Aucune société disponible.</p>
          </div>

          <button type="submit" [disabled]="profileForm.invalid"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            Valider et Accéder
          </button>
        </form>
      </div>
    </div>
  \`
})
export class CompleteProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private router = inject(Router);

  currentUser$ = this.authService.user$;
  activeCompanies = this.companyService.activeCompanies;

  profileForm = this.fb.group({
    role: ['', Validators.required],
    company: ['', Validators.required]
  });

  ngOnInit() {
    this.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) this.router.navigate(['/login']);
    });
  }

  onSubmit() {
    if (this.profileForm.valid) {
      this.currentUser$.pipe(take(1)).subscribe(user => {
        if (user) {
          const { role, company } = this.profileForm.value;
          this.authService.createProfile(
            user, 
            role as 'DRIVER' | 'EMPLOYEE', 
            company!
          ).subscribe({
            next: () => {
              alert('Profil complété ! En attente de validation par un administrateur.');
              // Redirection conditionnelle
              if (role === 'DRIVER') {
                this.router.navigate(['/driver']);
              } else {
                this.router.navigate(['/admin']);
              }
            },
            error: (err) => alert('Erreur lors de la création du profil: ' + err.message)
          });
        }
      });
    }
  }
}
EOF

# ==========================================
# 3. MISE À JOUR LOGIN COMPONENT
# ==========================================

echo "🔑 Mise à jour de LoginComponent (Logique de redirection basée sur le rôle)..."
cat <<EOF > src/app/core/auth/login/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: \`
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">Connexion</h2>
          <p class="mt-2 text-sm text-gray-600">Accédez à Master Delivery</p>
        </div>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email-address" class="sr-only">Email</label>
              <input id="email-address" formControlName="email" type="email" required 
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                placeholder="Adresse Email">
            </div>
            <div>
              <label for="password" class="sr-only">Mot de passe</label>
              <input id="password" formControlName="password" type="password" required 
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                placeholder="Mot de passe">
            </div>
          </div>

          <div>
            <button type="submit" [disabled]="loginForm.invalid"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              Se connecter
            </button>
          </div>
        </form>

        <div class="mt-4">
           <button (click)="loginWithGoogle()" type="button" class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2">
             <svg class="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
             </svg>
             Connexion Google
           </button>
        </div>

        <div class="text-center mt-4">
          <a routerLink="/register" class="font-medium text-indigo-600 hover:text-indigo-500">
            Pas encore de compte ? S'inscrire
          </a>
        </div>
      </div>
    </div>
  \`
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  private redirectUser(profile: any) {
    if (profile?.role === 'DRIVER') {
      this.router.navigate(['/driver']);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email!, password!).pipe(
        switchMap(cred => this.authService.getUserProfile(cred.user.uid))
      ).subscribe({
        next: (profile) => this.redirectUser(profile),
        error: (err) => alert('Erreur de connexion: ' + err.message)
      });
    }
  }

  loginWithGoogle() {
    this.authService.loginGoogle().pipe(
      switchMap(credential => this.authService.getUserProfile(credential.user.uid))
    ).subscribe({
      next: (profile) => {
        if (profile) {
          this.redirectUser(profile);
        } else {
          this.router.navigate(['/complete-profile']);
        }
      },
      error: (err) => {
         console.error('Google Auth Error:', err);
         alert('Erreur Google: ' + err.message);
      }
    });
  }
}
EOF

# ==========================================
# 4. MISE À JOUR DES ROUTES
# ==========================================

echo "🔗 Mise à jour des Routes pour inclure Driver Dashboard..."
cat <<EOF > src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './core/auth/login/login.component';
import { RegisterComponent } from './core/auth/register/register.component';
import { CompleteProfileComponent } from './core/auth/complete-profile/complete-profile.component';
import { DriverDashboardComponent } from './features/driver/dashboard/driver-dashboard.component'; // NOUVEL IMPORT
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'complete-profile', component: CompleteProfileComponent },
  
  // Route Chauffeur (Pas d'Admin Guard)
  { path: 'driver', component: DriverDashboardComponent },

  // Routes Admin protégées
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [adminGuard]
  },
  
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
EOF

echo "✅ Flux d'inscription Google finalisé et séparation Admin/Driver effectuée !"