#!/bin/bash
set -e

echo "🏢 Mise à jour pour la sécurité multi-sociétés sur les Véhicules..."

# ==========================================
# 1. MISE À JOUR CAR SERVICE
# ==========================================

echo "📦 Mise à jour de CarService (Ajout du champ 'company')..."
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
  company: string; // NOUVEAU: Société propriétaire du véhicule
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
    // Le champ 'company' est inclus dans l'objet 'car' passé en argument
    return addDoc(this.carsCollection, car);
  }

  updateCar(carId: string, data: Partial<Car>) {
    const carRef = doc(this.firestore, 'cars', carId);
    return updateDoc(carRef, data);
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

# ==========================================
# 2. MISE À JOUR CAR MANAGER COMPONENT
# ==========================================

echo "🚚 Mise à jour de CarManagerComponent (Filtre par Société Admin)..."
cat <<EOF > src/app/features/admin/cars/car-manager.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarService, Car } from '../../../core/services/car.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Observable, combineLatest, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-car-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: \`
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Affichage de la société actuelle -->
      <div class="lg:col-span-3 bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-4">
        <p class="text-sm font-semibold text-indigo-800">
          Gestion des véhicules pour : 
          <span class="font-bold text-indigo-900">{{ adminCompany() || 'Chargement...' }}</span>
        </p>
      </div>

      <!-- Formulaire Ajout -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
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
          <button type="submit" [disabled]="carForm.invalid || !adminCompany()" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50">
             Ajouter ce véhicule (à {{ adminCompany() }})
          </button>
        </form>
      </div>

      <!-- Liste des Voitures & Affectation -->
      <div class="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
           <h3 class="text-lg font-bold text-gray-800">Flotte Gérée</h3>
        </div>
        @if ((carsFiltered$ | async)?.length === 0) {
           <p class="p-6 text-center text-gray-500">Aucun véhicule trouvé pour cette société.</p>
        } @else {
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
                   @for (car of carsFiltered$ | async; track car.uid) {
                      <tr>
                        <td class="px-6 py-4 whitespace-nowrap">
                           <div class="text-sm font-bold text-gray-900">{{ car.model }}</div>
                           <div class="text-xs text-gray-500">{{ car.plate }}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                           <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                              [ngClass]="{'bg-green-100 text-green-800': car.status === 'AVAILABLE', 'bg-red-100 text-red-800': car.status === 'BUSY', 'bg-yellow-100 text-yellow-800': car.status === 'MAINTENANCE'}">
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
        }
      </div>
    </div>
  \`
})
export class CarManagerComponent {
  private carService = inject(CarService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Observable de l'utilisateur Firebase (gère null/undefined au début)
  private firebaseUser$ = this.authService.user$; 

  // FIX: Utiliser switchMap sur l'utilisateur Firebase pour obtenir le profil Firestore
  adminProfile$ = this.firebaseUser$.pipe(
    switchMap(user => {
      if (user && user.uid) {
        return this.authService.getUserProfile(user.uid);
      }
      return of(undefined); // Retourne undefined si l'utilisateur n'est pas connecté
    })
  );
  
  // Convertir le profil en signal pour un accès facile au template
  adminCompany = toSignal(this.adminProfile$.pipe(
    map(profile => profile?.company || null)
  ));

  // Filtre des voitures par la société de l'admin
  carsFiltered$ = combineLatest([
    this.carService.getCars(),
    this.adminProfile$
  ]).pipe(
    map(([cars, profile]) => {
      const company = profile?.company;
      if (!company) return [];
      // Filtrer les voitures n'appartenant qu'à la société de l'admin
      return cars.filter(car => car.company === company);
    })
  );

  // Récupération des chauffeurs (actifs et appartenant à la même société)
  drivers$ = combineLatest([
    this.userService.getAllUsers(),
    this.adminProfile$
  ]).pipe(
    map(([users, profile]) => {
      const company = profile?.company;
      if (!company) return [];
      // Filtrer les utilisateurs par rôle 'DRIVER', statut 'isActive' et même 'company'
      return users.filter(u => 
        u.role === 'DRIVER' && u.isActive && u.company === company
      );
    })
  );

  carForm = this.fb.group({
    model: ['', Validators.required],
    plate: ['', Validators.required]
  });

  addCar() {
    const company = this.adminCompany();
    if (!company || this.carForm.invalid) return;

    const newCar: Car = {
      ...this.carForm.value as any,
      status: 'AVAILABLE',
      assignedDriverId: null,
      company: company // ENREGISTREMENT AVEC LA SOCIÉTÉ DE L'ADMIN
    };
    this.carService.addCar(newCar).then(() => {
      this.carForm.reset();
      alert('Véhicule ajouté à la société ' + company + '!');
    });
  }

  assignDriver(car: Car, driverId: string) {
    if (car.company !== this.adminCompany()) {
       alert("Erreur: Vous ne pouvez pas modifier un véhicule qui n'appartient pas à votre société.");
       return;
    }
    this.carService.assignDriver(car.uid!, driverId || null);
  }
}
EOF

# ==========================================
# 3. MISE À JOUR DES COMPOSANTS UTILISATEURS
# ==========================================

echo "👤 Mise à jour de RegisterComponent (Utilisation des sociétés Firebase)..."
cat <<EOF > src/app/core/auth/register/register.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { CompanyService } from '../../services/company.service'; // NOUVEL IMPORT

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: \`
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">Créer un compte</h2>
        </div>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-4">
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <input formControlName="email" type="email" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Mot de passe</label>
            <input formControlName="password" type="password" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Rôle</label>
            <select formControlName="role" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="DRIVER">Chauffeur</option>
              <option value="EMPLOYEE">Employé</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Société</label>
            <!-- SOCIÉTÉS CHARGÉES DEPUIS FIREBASE -->
            <select formControlName="company" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="" disabled>Choisir une société</option>
              @for (company of activeCompanies(); track company.uid) {
                 <option [value]="company.name">{{ company.name }}</option>
              }
            </select>
            <!-- Message si aucune société active -->
            <p *ngIf="activeCompanies().length === 0" class="mt-1 text-xs text-red-500">
               ⚠️ Aucune société active trouvée. Contactez l'administrateur.
            </p>
          </div>

          <button type="submit" [disabled]="registerForm.invalid || activeCompanies().length === 0"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400">
            S'inscrire
          </button>
        </form>
         <div class="text-center mt-4">
          <a routerLink="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
            Déjà un compte ? Se connecter
          </a>
        </div>
      </div>
    </div>
  \`
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private companyService = inject(CompanyService); // INJECTION

  // Signal des sociétés actives pour le template
  activeCompanies = this.companyService.activeCompanies; 

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['DRIVER', Validators.required],
    company: ['', Validators.required]
  });

  onSubmit() {
    if (this.registerForm.valid) {
      const { email, password, role, company } = this.registerForm.value;
      // Cast explicite pour respecter les types stricts
      this.authService.register(
        email!, 
        password!, 
        role as 'DRIVER' | 'EMPLOYEE', 
        company!
      ).subscribe({
        next: () => {
          alert('Compte créé ! En attente de validation.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Register Error:', err);
          alert('Erreur inscription (voir console): ' + err.message);
        }
      });
    }
  }
}
EOF

# ==========================================
# 4. MISE À JOUR DU DASHBOARD (CORRECTION ET AFFICHAGE PROFIL)
# ==========================================

echo "🔧 Mise à jour du menu AdminDashboardComponent (Affichage Profil Dynamique)..."
cat <<EOF > src/app/features/admin/dashboard/admin-dashboard.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

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
          
          <!-- LIEN AJOUTÉ POUR LA GESTION DES SOCIÉTÉS -->
          <a routerLink="/admin/companies" routerLinkActive="bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
             (click)="toggleMobileMenu()"
             class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all group mb-1 cursor-pointer">
             <span class="mr-3 text-xl opacity-75 group-hover:opacity-100">🏢</span>
             <span class="font-medium">Sociétés</span>
          </a>
          
          <!-- BOUTON DÉCONNEXION DANS LE MENU -->
           <button (click)="logout()" class="w-full flex items-center px-3 py-2.5 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-all group mb-1 cursor-pointer mt-4 border-t border-slate-800 pt-4">
             <span class="mr-3 text-xl opacity-75 group-hover:opacity-100">🚪</span>
             <span class="font-medium">Déconnexion</span>
           </button>
        </nav>

        <!-- User Profile DYNAMIQUE -->
        <div class="p-4 border-t border-slate-800 bg-slate-950/50">
           @if (userProfileSignal(); as profile) {
               <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border-2 border-slate-700 text-lg">
                     {{ profile.email.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                     <p class="text-sm font-medium text-white">{{ profile.email }}</p>
                     <p class="text-xs text-indigo-300">{{ profile.role }} | {{ profile.company }}</p>
                  </div>
               </div>
           } @else {
               <div class="flex items-center gap-3">
                   <p class="text-sm text-gray-400">Chargement du profil...</p>
               </div>
           }
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

  // Récupération du profil utilisateur via RxJS et conversion en Signal
  userProfileSignal = toSignal(
    this.authService.user$.pipe(
      switchMap(user => {
        if (user && user.uid) {
          return this.authService.getUserProfile(user.uid);
        }
        return of(null); // Retourne null si non authentifié ou en attente
      })
    ),
    { initialValue: null }
  );

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
EOF


echo "✅ Gestion des Sociétés générée et intégrée au Dashboard !"