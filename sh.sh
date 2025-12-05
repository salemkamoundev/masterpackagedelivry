#!/bin/bash
set -e

echo "🚀 Implémentation des règles Super Admin et gestion avancée (Voitures/Trajets)..."

# Création des dossiers nécessaires
mkdir -p src/app/features/admin/cars
mkdir -p src/app/features/admin/trips

# ==========================================
# 1. SERVICES (Car & Trip)
# ==========================================

echo "📦 Génération de CarService..."
cat <<EOF > src/app/core/services/car.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, doc, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Car {
  uid?: string;
  model: string;
  plate: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'BUSY';
  assignedDriverId?: string | null; // ID du chauffeur affecté
}

@Injectable({
  providedIn: 'root'
})
export class CarService {
  private firestore = inject(Firestore);
  private carsCollection = collection(this.firestore, 'cars');

  getCars(): Observable<Car[]> {
    return collectionData(this.carsCollection, { idField: 'uid' }) as Observable<Car[]>;
  }

  addCar(car: Car) {
    return addDoc(this.carsCollection, car);
  }

  assignDriver(carId: string, driverId: string | null) {
    const carRef = doc(this.firestore, 'cars', carId);
    return updateDoc(carRef, { 
      assignedDriverId: driverId,
      status: driverId ? 'BUSY' : 'AVAILABLE'
    });
  }
}
EOF

echo "📦 Génération de TripService..."
cat <<EOF > src/app/core/services/trip.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Parcel {
  description: string;
  weight: number;
  recipient: string;
}

export interface Trip {
  uid?: string;
  departure: string;
  destination: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  driverId: string;
  carId: string;
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
}
EOF

# ==========================================
# 2. COMPOSANTS (UserList, CarManager, TripManager)
# ==========================================

echo "👤 Mise à jour de UserListComponent (Règle Super Admin)..."
cat <<EOF > src/app/features/admin/users/user-list.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
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
           <p class="text-xs text-gray-500 mt-1">Gérez les rôles et l'accès à la plateforme.</p>
        </div>
        <span class="bg-white text-indigo-600 py-1 px-3 rounded-full text-xs font-bold border border-indigo-200">
          Total: {{ (users$ | async)?.length || 0 }}
        </span>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            @for (user of users$ | async; track user.uid) {
              <tr class="hover:bg-gray-50 transition-colors">
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
                   <span *ngIf="user.isActive" class="text-green-600 flex items-center text-xs font-bold">
                      <span class="h-2 w-2 rounded-full bg-green-500 mr-2"></span> Actif
                   </span>
                   <span *ngIf="!user.isActive" class="text-red-600 flex items-center text-xs font-bold">
                      <span class="h-2 w-2 rounded-full bg-red-500 mr-2"></span> Inactif
                   </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <!-- Validation (Tout Admin) -->
                  <button *ngIf="!user.isActive" (click)="toggleStatus(user, true)" class="text-green-600 hover:text-green-900 font-bold text-xs border border-green-200 bg-green-50 px-2 py-1 rounded">
                    Valider
                  </button>
                  <button *ngIf="user.isActive" (click)="toggleStatus(user, false)" class="text-red-600 hover:text-red-900 text-xs px-2 py-1">
                    Désactiver
                  </button>

                  <!-- Promotion (Seulement admin@gmail.com) -->
                  <button *ngIf="isSuperAdmin() && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'" 
                          (click)="promoteToAdmin(user)" 
                          class="ml-2 text-indigo-600 hover:text-indigo-900 font-bold text-xs border border-indigo-200 bg-indigo-50 px-2 py-1 rounded shadow-sm">
                    ★ Promouvoir Admin
                  </button>
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
  
  // Récupération de l'utilisateur connecté
  currentUser = toSignal(this.authService.user$);

  isSuperAdmin(): boolean {
    // RÈGLE STRICTE : Seul admin@gmail.com est Super Admin
    return this.currentUser()?.email === 'admin@gmail.com';
  }

  toggleStatus(user: UserProfile, status: boolean) {
    if(confirm(\`Modifier le statut de \${user.email} ?\`)) {
      this.userService.updateUserStatus(user.uid, status);
    }
  }

  promoteToAdmin(user: UserProfile) {
    if(confirm(\`⚠️ Action Sensible : Promouvoir \${user.email} comme Administrateur ? Il aura accès complet à la gestion.\`)) {
      this.userService.updateUserRole(user.uid, 'ADMIN');
    }
  }
}
EOF

echo "🚚 Génération de CarManagerComponent (Ajout & Affectation)..."
cat <<EOF > src/app/features/admin/cars/car-manager.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarService, Car } from '../../../core/services/car.service';
import { UserService } from '../../../core/services/user.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-car-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: \`
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Formulaire Ajout -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Nouvelle Voiture</h3>
        <form [formGroup]="carForm" (ngSubmit)="addCar()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Modèle</label>
            <input formControlName="model" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="Ex: Renault Master">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Plaque</label>
            <input formControlName="plate" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="AA-123-BB">
          </div>
          <button type="submit" [disabled]="carForm.invalid" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50">Ajouter</button>
        </form>
      </div>

      <!-- Liste des Voitures & Affectation -->
      <div class="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
           <h3 class="text-lg font-bold text-gray-800">Flotte de Véhicules</h3>
        </div>
        <div class="overflow-x-auto">
           <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Véhicule</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur Affecté</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (car of cars$ | async; track car.uid) {
                   <tr>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-bold text-gray-900">{{ car.model }}</div>
                        <div class="text-xs text-gray-500">{{ car.plate }}</div>
                     </td>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                           [ngClass]="{'bg-green-100 text-green-800': car.status === 'AVAILABLE', 'bg-red-100 text-red-800': car.status === 'BUSY'}">
                           {{ car.status }}
                        </span>
                     </td>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center space-x-2">
                           <select #driverSelect (change)="assignDriver(car, driverSelect.value)" class="text-sm border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-1">
                              <option value="" [selected]="!car.assignedDriverId">-- Disponible --</option>
                              @for (driver of drivers$ | async; track driver.uid) {
                                 <option [value]="driver.uid" [selected]="car.assignedDriverId === driver.uid">
                                    {{ driver.email }}
                                 </option>
                              }
                           </select>
                        </div>
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
export class CarManagerComponent {
  private carService = inject(CarService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);

  cars$ = this.carService.getCars();
  // On ne récupère que les chauffeurs actifs
  drivers$ = this.userService.getAllUsers().pipe(
    map(users => users.filter(u => u.role === 'DRIVER' && u.isActive))
  );

  carForm = this.fb.group({
    model: ['', Validators.required],
    plate: ['', Validators.required]
  });

  addCar() {
    if (this.carForm.valid) {
      const newCar: Car = {
        ...this.carForm.value as any,
        status: 'AVAILABLE',
        assignedDriverId: null
      };
      this.carService.addCar(newCar).then(() => {
        this.carForm.reset();
        alert('Véhicule ajouté !');
      });
    }
  }

  assignDriver(car: Car, driverId: string) {
    this.carService.assignDriver(car.uid!, driverId || null);
  }
}
EOF

echo "🗺️ Génération de TripManagerComponent (Trajets & Colis)..."
cat <<EOF > src/app/features/admin/trips/trip-manager.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { TripService, Trip } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { UserService } from '../../../core/services/user.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-trip-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: \`
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">Gestion des Trajets</h2>
        <button (click)="showForm = !showForm" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
           {{ showForm ? 'Fermer' : 'Nouveau Trajet' }}
        </button>
      </div>

      <!-- Formulaire de création de trajet -->
      <div *ngIf="showForm" class="bg-white p-6 rounded-lg shadow-lg border border-indigo-100">
         <form [formGroup]="tripForm" (ngSubmit)="createTrip()">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <div>
                  <label class="block text-sm font-medium text-gray-700">Lieu de Départ</label>
                  <input formControlName="departure" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Destination</label>
                  <input formControlName="destination" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Date</label>
                  <input formControlName="date" type="date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               
               <!-- Sélection Voiture (affichera aussi le chauffeur lié) -->
               <div>
                  <label class="block text-sm font-medium text-gray-700">Véhicule (avec Chauffeur)</label>
                  <select formControlName="carId" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                     <option value="">-- Choisir un véhicule --</option>
                     @for (car of cars$ | async; track car.uid) {
                        <option [value]="car.uid">
                           {{ car.model }} ({{ car.plate }})
                        </option>
                     }
                  </select>
               </div>
            </div>

            <!-- Gestion des Colis (FormArray) -->
            <div class="mb-4">
               <div class="flex justify-between items-center mb-2">
                  <h4 class="text-sm font-bold text-gray-700">Liste des Colis</h4>
                  <button type="button" (click)="addParcel()" class="text-xs text-indigo-600 font-bold">+ Ajouter Colis</button>
               </div>
               
               <div formArrayName="parcels" class="space-y-2">
                  @for (parcel of parcels.controls; track i; let i = \$index) {
                     <div [formGroupName]="i" class="flex gap-2 items-center bg-gray-50 p-2 rounded">
                        <input formControlName="description" placeholder="Desc" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="weight" type="number" placeholder="Kg" class="w-20 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="recipient" placeholder="Destinataire" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <button type="button" (click)="removeParcel(i)" class="text-red-500 text-xs">🗑️</button>
                     </div>
                  }
               </div>
            </div>

            <div class="flex justify-end">
               <button type="submit" [disabled]="tripForm.invalid" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-bold shadow-sm">
                  Valider le Trajet
               </button>
            </div>
         </form>
      </div>

      <!-- Liste des trajets existants -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
               <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trajet</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colis</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
               </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
               @for (trip of trips$ | async; track trip.uid) {
                  <tr>
                     <td class="px-6 py-4">
                        <div class="text-sm font-bold text-gray-900">{{ trip.departure }} ➝ {{ trip.destination }}</div>
                        <div class="text-xs text-gray-500">Véhicule ID: {{ trip.carId }}</div>
                     </td>
                     <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ trip.date }}</td>
                     <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ trip.parcels.length }} colis</td>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                           {{ trip.status }}
                        </span>
                     </td>
                  </tr>
               }
            </tbody>
         </table>
      </div>
    </div>
  \`
})
export class TripManagerComponent {
  private fb = inject(FormBuilder);
  private tripService = inject(TripService);
  private carService = inject(CarService);
  
  showForm = false;
  
  cars$ = this.carService.getCars();
  trips$ = this.tripService.getTrips();

  tripForm = this.fb.group({
    departure: ['', Validators.required],
    destination: ['', Validators.required],
    date: ['', Validators.required],
    carId: ['', Validators.required],
    parcels: this.fb.array([])
  });

  get parcels() {
    return this.tripForm.get('parcels') as FormArray;
  }

  addParcel() {
    const parcelGroup = this.fb.group({
      description: ['', Validators.required],
      weight: [0, Validators.required],
      recipient: ['', Validators.required]
    });
    this.parcels.push(parcelGroup);
  }

  removeParcel(index: number) {
    this.parcels.removeAt(index);
  }

  createTrip() {
    if (this.tripForm.valid) {
      // Logique simplifiée: on suppose que le driverId est récupéré depuis la voiture
      // Dans une app réelle, il faudrait faire un lookup synchrone ou gérer l'état
      const formVal = this.tripForm.value;
      
      const newTrip: Trip = {
        departure: formVal.departure!,
        destination: formVal.destination!,
        date: formVal.date!,
        carId: formVal.carId!,
        driverId: 'PENDING_LOOKUP', // À améliorer avec RxJS combineLatest
        status: 'PENDING',
        parcels: formVal.parcels as any[]
      };

      this.tripService.createTrip(newTrip).then(() => {
        this.tripForm.reset();
        this.parcels.clear();
        this.showForm = false;
        alert('Trajet créé avec succès !');
      });
    }
  }
}
EOF

echo "🔗 Mise à jour des Routes Admin..."
cat <<EOF > src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { UserListComponent } from './users/user-list.component';
import { AdminHomeComponent } from './home/admin-home.component';
import { CarManagerComponent } from './cars/car-manager.component';
import { TripManagerComponent } from './trips/trip-manager.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    children: [
      { 
        path: '', 
        component: AdminHomeComponent,
        title: 'Administration - Accueil'
      },
      { 
        path: 'users', 
        component: UserListComponent,
        title: 'Administration - Utilisateurs'
      },
      { 
        path: 'cars', 
        component: CarManagerComponent,
        title: 'Administration - Flotte'
      },
      { 
        path: 'trips', 
        component: TripManagerComponent,
        title: 'Administration - Trajets'
      },
      // Redirection Drivers vers Cars pour l'instant ou liste users filtrée
      { 
        path: 'drivers', 
        redirectTo: 'users' 
      }
    ]
  }
];
EOF

# Mise à jour complète du Dashboard pour inclure les nouveaux liens (Trajets) et boutons Déconnexion
echo "🔧 Mise à jour du menu Dashboard (Liens + Déconnexion)..."
cat <<EOF > src/app/features/admin/dashboard/admin-dashboard.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: \`
    <div class="min-h-screen bg-gray-50">
      
      <!-- Mobile Menu Overlay -->
      <div *ngIf="isMobileMenuOpen" (click)="toggleMobileMenu()" class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity"></div>

      <!-- SIDEBAR: Fixed Left -->
      <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white shadow-2xl flex flex-col transition-transform duration-300 transform"
             [ngClass]="isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'">
        
        <!-- Logo -->
        <div class="h-20 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div class="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="text-lg font-bold tracking-wide text-gray-100">
            Master<span class="text-indigo-400">Delivery</span>
          </span>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Menu Principal</p>
          
          <a routerLink="/admin" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
             (click)="toggleMobileMenu()"
             class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all group mb-1 cursor-pointer">
             <span class="mr-3 text-xl opacity-75 group-hover:opacity-100">🏠</span>
             <span class="font-medium">Accueil</span>
          </a>

          <a routerLink="/admin/users" routerLinkActive="bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
             (click)="toggleMobileMenu()"
             class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all group mb-1 cursor-pointer">
             <span class="mr-3 text-xl opacity-75 group-hover:opacity-100">👥</span>
             <span class="font-medium">Utilisateurs</span>
          </a>

          <!-- LIEN MIS À JOUR: TRAJETS -->
          <a routerLink="/admin/trips" routerLinkActive="bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
             (click)="toggleMobileMenu()"
             class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all group mb-1 cursor-pointer">
             <span class="mr-3 text-xl opacity-75 group-hover:opacity-100">📦</span>
             <span class="font-medium">Trajets</span>
          </a>

          <a routerLink="/admin/cars" routerLinkActive="bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
             (click)="toggleMobileMenu()"
             class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all group mb-1 cursor-pointer">
             <span class="mr-3 text-xl opacity-75 group-hover:opacity-100">🚚</span>
             <span class="font-medium">Véhicules</span>
          </a>

          <!-- NOUVEAU BOUTON DÉCONNEXION DANS LE MENU -->
           <button (click)="logout()" class="w-full flex items-center px-3 py-2.5 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-all group mb-1 cursor-pointer mt-4 border-t border-slate-800 pt-4">
             <span class="mr-3 text-xl opacity-75 group-hover:opacity-100">🚪</span>
             <span class="font-medium">Déconnexion</span>
           </button>
        </nav>

        <!-- User Profile -->
        <div class="p-4 border-t border-slate-800 bg-slate-950/50">
           <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border-2 border-slate-700">A</div>
              <div>
                 <p class="text-sm font-medium text-white">Admin</p>
                 <p class="text-xs text-indigo-300">Super Admin</p>
              </div>
           </div>
        </div>
      </aside>

      <!-- MAIN CONTENT: Right Side -->
      <div class="lg:pl-64 flex flex-col min-h-screen relative transition-all duration-300">
        
        <!-- Mobile Header with Hamburger Button + NOUVEAU BOUTON DÉCONNEXION -->
        <header class="bg-white shadow-sm h-16 flex items-center justify-between px-4 lg:hidden sticky top-0 z-30">
             <span class="font-bold text-gray-800 flex items-center gap-2">
                MasterDelivery
             </span>
             <div class="flex items-center gap-3">
                 <!-- BOUTON DÉCONNEXION HEADER MOBILE -->
                 <button (click)="logout()" class="text-red-500 p-2 border border-red-100 rounded bg-red-50 hover:bg-red-100" title="Se déconnecter">
                    🚪
                 </button>
                 <button (click)="toggleMobileMenu()" class="text-gray-500 p-2 border rounded hover:bg-gray-100 focus:outline-none">
                    <span *ngIf="!isMobileMenuOpen" class="text-xl">☰</span>
                    <span *ngIf="isMobileMenuOpen" class="text-xl">✕</span>
                 </button>
             </div>
        </header>

        <!-- Scrollable Area -->
        <main class="flex-1 p-6 pb-24 overflow-y-auto">
             <router-outlet></router-outlet>
        </main>

        <!-- FOOTER: Fixed Bottom -->
        <footer class="fixed bottom-0 right-0 w-full lg:w-[calc(100%-16rem)] bg-white border-t border-gray-200 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                
                <!-- Copyright -->
                <div class="text-xs text-gray-500">
                    &copy; 2024 Master Delivery.
                </div>

                <!-- Footer Buttons -->
                <div class="flex space-x-2">
                    <a routerLink="/admin" class="text-xs text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded hover:bg-gray-100 transition border border-transparent">
                        🏠 Accueil
                    </a>
                    <a routerLink="/admin/trips" class="text-xs text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded hover:bg-gray-100 transition border border-transparent">
                        📦 Trajets
                    </a>
                    <button (click)="logout()" class="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded hover:bg-red-50 transition border border-red-100">
                        🚪 Déconnexion
                    </button>
                </div>
            </div>
        </footer>

      </div>
    </div>
  \`
})
export class AdminDashboardComponent {
  private authService = inject(AuthService);
  isMobileMenuOpen = false;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
EOF

echo "✅ Fonctionnalités avancées (Super Admin, Voitures, Trajets) déployées !"