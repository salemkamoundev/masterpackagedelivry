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
  template: `
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
  `
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
