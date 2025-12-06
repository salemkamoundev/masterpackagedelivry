#!/bin/bash
set -e

echo "📞 Ajout du numéro de téléphone (Signup, Profils, Carte & Mock Data)..."

# ==========================================
# 1. AUTH SERVICE (Modèle + Logique d'enregistrement)
# ==========================================
echo "🔐 Mise à jour de AuthService (Ajout phoneNumber)..."
cat <<EOF > src/app/core/auth/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

// AngularFire
import { Auth, user } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

// SDK Natif
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from 'firebase/auth';

import { 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  role: 'DRIVER' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN';
  company: string;
  phoneNumber: string; // NOUVEAU CHAMP OBLIGATOIRE
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

  login(email: string, pass: string) {
    return from(signInWithEmailAndPassword(this.auth, email, pass));
  }

  loginGoogle() {
    const provider = new GoogleAuthProvider();
    return from(signInWithPopup(this.auth, provider));
  }

  // Signature mise à jour avec phoneNumber
  register(email: string, pass: string, role: 'DRIVER' | 'EMPLOYEE', company: string, phoneNumber: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, pass)).pipe(
      switchMap(credential => this.createProfile(credential.user, role, company, phoneNumber))
    );
  }

  // Signature mise à jour avec phoneNumber
  createProfile(user: User, role: 'DRIVER' | 'EMPLOYEE', company: string, phoneNumber: string) {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      role: role,
      company: company,
      phoneNumber: phoneNumber,
      isActive: false, 
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
# 2. REGISTER COMPONENT (Formulaire Inscription)
# ==========================================
echo "📝 Mise à jour de RegisterComponent (Champ Téléphone)..."
cat <<EOF > src/app/core/auth/register/register.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { CompanyService } from '../../services/company.service';

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
            <input formControlName="email" type="email" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Mot de passe</label>
            <input formControlName="password" type="password" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2">
          </div>

          <!-- CHAMP TÉLÉPHONE AJOUTÉ -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Numéro de téléphone</label>
            <input formControlName="phoneNumber" type="tel" placeholder="+216 00 000 000" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Métier</label>
            <select formControlName="role" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border p-2">
              <option value="DRIVER">Chauffeur</option>
              <option value="EMPLOYEE">Employé</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Société</label>
            <select formControlName="company" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border p-2">
              <option value="" disabled>Choisir une société</option>
              @for (company of activeCompanies(); track company.uid) {
                 <option [value]="company.name">{{ company.name }}</option>
              }
            </select>
            <p *ngIf="activeCompanies().length === 0" class="mt-1 text-xs text-red-500">Aucune société active.</p>
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
  private companyService = inject(CompanyService);

  activeCompanies = this.companyService.activeCompanies; 

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phoneNumber: ['', [Validators.required, Validators.minLength(8)]], // Validation
    role: ['DRIVER', Validators.required],
    company: ['', Validators.required]
  });

  onSubmit() {
    if (this.registerForm.valid) {
      const { email, password, role, company, phoneNumber } = this.registerForm.value;
      this.authService.register(
        email!, 
        password!, 
        role as any, 
        company!, 
        phoneNumber!
      ).subscribe({
        next: () => {
          alert('Compte créé ! En attente de validation.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Register Error:', err);
          alert('Erreur inscription : ' + err.message);
        }
      });
    }
  }
}
EOF

# ==========================================
# 3. COMPLETE PROFILE COMPONENT (Google Flow)
# ==========================================
echo "📝 Mise à jour de CompleteProfileComponent (Champ Téléphone)..."
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
            Veuillez compléter vos informations pour accéder à la plateforme.
          </p>
        </div>
        
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Compte Google</label>
            <div class="mt-1 px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-600 text-sm">
              {{ (currentUser$ | async)?.email }}
            </div>
          </div>

          <!-- CHAMP TÉLÉPHONE AJOUTÉ -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Numéro de téléphone</label>
            <input formControlName="phoneNumber" type="tel" placeholder="+216 00 000 000" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Votre Métier</label>
            <select formControlName="role" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border p-2">
              <option value="" disabled>Choisir un métier</option>
              <option value="DRIVER">Chauffeur</option>
              <option value="EMPLOYEE">Employé</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Votre Société</label>
            <select formControlName="company" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border p-2">
              <option value="" disabled>Choisir une société</option>
              @for (company of activeCompanies(); track company.uid) {
                 <option [value]="company.name">{{ company.name }}</option>
              }
            </select>
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
    phoneNumber: ['', [Validators.required, Validators.minLength(8)]],
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
          const { role, company, phoneNumber } = this.profileForm.value;
          this.authService.createProfile(
            user, 
            role as 'DRIVER' | 'EMPLOYEE', 
            company!,
            phoneNumber!
          ).subscribe({
            next: () => {
              alert('Profil complété !');
              if (role === 'DRIVER') {
                this.router.navigate(['/driver']);
              } else {
                this.router.navigate(['/admin']);
              }
            },
            error: (err) => alert('Erreur création profil : ' + err.message)
          });
        }
      });
    }
  }
}
EOF

# ==========================================
# 4. USER LIST COMPONENT (Affichage Téléphone)
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
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                   {{ user.phoneNumber || 'N/A' }}
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
# 5. LIVE MAP (Affichage Téléphone Chauffeur)
# ==========================================
echo "🌍 Mise à jour de LiveMapComponent (Téléphone dans Popup)..."
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
      <!-- Header & Filtres -->
      <div class="absolute top-4 left-4 right-14 md:right-auto md:w-96 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg z-[1000] border border-gray-200 flex flex-col gap-3">
        <div class="flex justify-between items-center">
           <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2"><span class="text-xl">🌍</span> Flotte Live</h2>
           <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 animate-pulse">{{ filteredCount() }} / {{ totalCount() }} Actifs</span>
        </div>
        <form [formGroup]="filterForm" class="flex flex-col gap-2">
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
  filterForm = this.fb.group({ company: [''], search: [''] });

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
         return matchCompany && matchSearch;
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
        
        // POPUP AVEC TÉLÉPHONE
        const popupContent = \`
          <div class="font-sans p-1 min-w-[220px]">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                <div class="font-bold text-indigo-700 text-sm">\${car?.model || 'Véhicule'}</div>
                <div class="text-xs bg-gray-100 px-1 rounded font-mono">\${car?.plate}</div>
            </div>
            <div class="text-xs text-gray-600 space-y-1">
               <div class="flex items-center gap-2"><span>🏢</span> <strong>\${driver?.company || 'N/A'}</strong></div>
               <div class="flex items-center gap-2"><span>🧢</span> \${driver?.email?.split('@')[0]}</div>
               
               <!-- AJOUT TÉLÉPHONE -->
               <div class="flex items-center gap-2 text-indigo-600 font-bold">
                  <span>📞</span> \${driver?.phoneNumber || 'Non renseigné'}
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
# 6. MOCK DATA SERVICE (Génération avec faux numéros)
# ==========================================
echo "🧪 Mise à jour de MockDataService (Génération Téléphones)..."
cat <<EOF > src/app/core/services/mock-data.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, writeBatch, doc, query } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import { environment } from '../../../environments/environment';

const TUNISIAN_CITIES = [
  { name: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { name: 'Sfax', lat: 34.7406, lng: 10.7603 },
  { name: 'Sousse', lat: 35.8256, lng: 10.6084 },
  { name: 'Gabès', lat: 33.8815, lng: 10.0982 },
  { name: 'Bizerte', lat: 37.2744, lng: 9.8739 },
  { name: 'Tozeur', lat: 33.9197, lng: 8.1335 },
  { name: 'Tataouine', lat: 32.9297, lng: 10.4518 }
];
const COMPANIES = [{ name: 'Tunisia Express', email: 'contact@tn-express.tn' }, { name: 'Carthage Logistics', email: 'info@carthage.tn' }];

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private firestore = inject(Firestore);

  async generateAll() {
    await this.clearFirestore();
    const secondaryApp = initializeApp(environment.firebase, 'SecondaryApp');
    const secondaryAuth = getAuth(secondaryApp);
    const batch = writeBatch(this.firestore);

    try {
      for (const companyData of COMPANIES) {
        const companyId = 'comp_' + Math.random().toString(36).substr(2, 9);
        const companyRef = doc(this.firestore, 'companies', companyId);
        batch.set(companyRef, { uid: companyId, name: companyData.name, contactEmail: companyData.email, isActive: true, createdAt: new Date().toISOString() });

        for (let i = 0; i < 3; i++) {
           await this.createUser(secondaryAuth, batch, 'DRIVER', companyData.name);
           await this.createUser(secondaryAuth, batch, 'EMPLOYEE', companyData.name);
        }
      }
      await batch.commit();
      alert('Données générées avec numéros de téléphone !');
    } finally {
      await deleteApp(secondaryApp);
    }
  }

  private async createUser(secondaryAuth: Auth, batch: any, role: string, company: string) {
    const email = \`\${role.toLowerCase()}.\${Date.now()}\${Math.floor(Math.random()*100)}@test.com\`;
    const password = 'Admin123';
    // Génération Faux Numéro Tunisien
    const phone = \`+216 \${Math.floor(Math.random() * 89 + 10)} \${Math.floor(Math.random() * 899 + 100)} \${Math.floor(Math.random() * 899 + 100)}\`;

    let uid = '';
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      uid = cred.user.uid;
      await signOut(secondaryAuth);
    } catch (e) { uid = 'mock_' + Math.random().toString(36).substr(2, 9); }

    const userRef = doc(this.firestore, 'users', uid);
    batch.set(userRef, { uid, email, role, company, phoneNumber: phone, isActive: true, createdAt: new Date() });
    
    // Création véhicule et trajet auto pour test map
    if(role === 'DRIVER') {
       const carId = 'car_' + uid;
       const carRef = doc(this.firestore, 'cars', carId);
       batch.set(carRef, { uid: carId, model: 'Peugeot Partner', plate: '123 TN 4567', status: 'BUSY', assignedDriverId: uid, company });
       
       const tripRef = doc(collection(this.firestore, 'trips'));
       const start = TUNISIAN_CITIES[0];
       const end = TUNISIAN_CITIES[1];
       const currentLocation = { lat: (start.lat + end.lat)/2, lng: (start.lng + end.lng)/2, city: 'En route', lastUpdate: new Date().toISOString() };
       
       batch.set(tripRef, { 
          departure: start.name, destination: end.name, date: new Date().toISOString(), 
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
      snapshot.docs.forEach((d) => { if(colName !== 'users' || d.data()['email'] !== 'admin@gmail.com') batch.delete(d.ref); });
      await batch.commit();
    }
  }
}
EOF

echo "✅ Intégration complète du Numéro de Téléphone (DB, UI, Map) !"