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
# 1.5 CRÉATION DU DRIVER DASHBOARD (Pour la redirection)
# ==========================================
echo "🧢 Création de DriverDashboardComponent (Page d'accueil Chauffeur avec Missions et Détails)..."
cat <<EOF > src/app/features/driver/dashboard/driver-dashboard.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { TripService } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule],
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
                    <div class="bg-gray-50 px-6 py-3 border-t border-gray-100">
                       <button (click)="viewDetails(trip)" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center justify-center gap-2">
                          <span>Voir Détails</span>
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
                 Vous n'avez pas encore de trajet assigné. Assurez-vous d'être assigné à un véhicule par votre administrateur.
              </p>
           </div>
        </ng-template>

        <!-- MODAL DÉTAILS -->
        <div *ngIf="selectedTrip()" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <!-- Background overlay -->
            <div (click)="closeDetails()" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            <!-- Modal panel -->
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div class="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              
              <!-- En-tête Modal -->
              <div class="bg-indigo-600 px-4 py-4 sm:px-6">
                <div class="flex justify-between items-center text-white">
                   <h3 class="text-lg leading-6 font-bold" id="modal-title">Détails de la Mission</h3>
                   <button (click)="closeDetails()" class="text-indigo-200 hover:text-white text-2xl leading-none">&times;</button>
                </div>
              </div>

              <!-- Contenu Modal -->
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div class="space-y-4">
                   
                   <!-- Trajet -->
                   <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div class="text-center w-full">
                         <div class="text-xl font-bold text-gray-800">{{ selectedTrip()?.departure }}</div>
                         <div class="text-xs text-gray-400 uppercase tracking-widest my-1">VERS</div>
                         <div class="text-xl font-bold text-indigo-600">{{ selectedTrip()?.destination }}</div>
                      </div>
                   </div>

                   <!-- Info Date & Vehicule -->
                   <div class="grid grid-cols-2 gap-4">
                      <div class="border border-gray-100 p-3 rounded-lg">
                         <p class="text-xs text-gray-500 uppercase font-bold mb-1">Départ Prévu</p>
                         <p class="text-sm font-medium">{{ selectedTrip()?.date | date:'short' }}</p>
                      </div>
                      <div class="border border-gray-100 p-3 rounded-lg">
                         <p class="text-xs text-gray-500 uppercase font-bold mb-1">Véhicule</p>
                         <p class="text-sm font-medium">{{ selectedTrip()?.carModel }}</p>
                         <p class="text-xs text-gray-400">{{ selectedTrip()?.carPlate }}</p>
                      </div>
                   </div>

                   <!-- Liste des Colis -->
                   <div>
                      <h4 class="text-sm font-bold text-gray-700 mb-2 border-b pb-1">📦 Liste de Colis ({{ selectedTrip()?.parcels?.length || 0 }})</h4>
                      <ul class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                         <!-- Correction NG5002: échappement de $index -->
                         @for (p of selectedTrip()?.parcels; track \$index) {
                             <li class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                                <div>
                                   <p class="text-sm font-semibold text-gray-800">{{ p.description }}</p>
                                   <p class="text-xs text-gray-500">Pour: {{ p.recipient }}</p>
                                </div>
                                <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">{{ p.weight }} kg</span>
                             </li>
                         } @empty {
                             <li class="text-sm text-gray-500 italic p-2">Aucun colis enregistré.</li>
                         }
                      </ul>
                   </div>

                </div>
              </div>

              <!-- Footer Modal -->
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button (click)="closeDetails()" type="button" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                  Fermer
                </button>
                <!-- BOUTON DÉMARRER LA COURSE -->
                <button *ngIf="selectedTrip()?.status === 'PENDING'" (click)="startMission()" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                  Démarrer 🚀
                </button>
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

  private user$ = this.authService.user$;
  private cars$ = this.carService.getCars();
  private allTrips$ = this.tripService.getTrips();

  // État local pour la modale
  selectedTrip = signal<any>(null);

  // Combine les flux pour filtrer les trajets du chauffeur connecté
  missions = toSignal(
    combineLatest([this.user$, this.cars$, this.allTrips$]).pipe(
      map(([user, cars, trips]) => {
        if (!user) return [];
        
        // 1. Trouver la voiture assignée à ce chauffeur
        const myCar = cars.find(c => c.assignedDriverId === user.uid);
        
        if (!myCar) return [];

        // 2. Trouver les trajets liés à cette voiture
        return trips
          .filter(t => t.carId === myCar.uid)
          .map(t => ({
             ...t,
             carModel: myCar.model,
             carPlate: myCar.plate
          }));
      })
    ),
    { initialValue: [] }
  );

  viewDetails(trip: any) {
    this.selectedTrip.set(trip);
  }

  closeDetails() {
    this.selectedTrip.set(null);
  }

  async startMission() {
    const trip = this.selectedTrip();
    if (!trip) return;
    
    try {
      const tripRef = doc(this.firestore, 'trips', trip.uid);
      await updateDoc(tripRef, { status: 'IN_PROGRESS' });
      this.closeDetails();
      alert('Bonne route ! La course est maintenant en cours.');
    } catch (err) {
      alert('Erreur lors du démarrage de la course : ' + err);
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