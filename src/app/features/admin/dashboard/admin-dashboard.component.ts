import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      
      <!-- Mobile Overlay -->
      <div *ngIf="isMobileMenuOpen" (click)="toggleMobileMenu()" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] lg:hidden transition-opacity"></div>

      <!-- SIDEBAR (Desktop & Mobile) -->
      <aside class="fixed inset-y-0 left-0 z-[10000] w-72 bg-slate-900 text-white shadow-2xl flex flex-col transition-transform duration-300 transform lg:translate-x-0"
             [ngClass]="isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'">
        
        <!-- Logo Sidebar -->
        <div class="h-20 flex items-center px-8 border-b border-slate-800 bg-slate-950/50">
          <div class="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/30">
            <span class="text-2xl">📦</span>
          </div>
          <div>
            <span class="text-xl font-bold tracking-wide text-white block leading-none">Master</span>
            <span class="text-sm font-medium text-indigo-400 tracking-widest">DELIVERY</span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 py-8 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p class="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Principal</p>
          
          <a routerLink="/admin" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" (click)="toggleMobileMenu()" 
             class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all mb-1 cursor-pointer border-l-4 border-transparent group">
             <span class="mr-3 text-xl group-hover:scale-110 transition-transform">🏠</span> <span class="font-medium">Accueil</span>
          </a>

          <a routerLink="/admin/live-map" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" (click)="toggleMobileMenu()" 
             class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all mb-1 cursor-pointer border-l-4 border-transparent group">
             <span class="mr-3 text-xl group-hover:scale-110 transition-transform">🌍</span> <span class="font-medium">Carte Live</span>
          </a>

          <p class="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mt-8 mb-4">Gestion</p>

          <a routerLink="/admin/trips" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" (click)="toggleMobileMenu()" 
             class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all mb-1 cursor-pointer border-l-4 border-transparent group">
             <span class="mr-3 text-xl group-hover:scale-110 transition-transform">📦</span> <span class="font-medium">Trajets</span>
          </a>

          <a routerLink="/admin/users" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" (click)="toggleMobileMenu()" 
             class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all mb-1 cursor-pointer border-l-4 border-transparent group">
             <span class="mr-3 text-xl group-hover:scale-110 transition-transform">👥</span> <span class="font-medium">Utilisateurs</span>
          </a>

          <a routerLink="/admin/cars" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" (click)="toggleMobileMenu()" 
             class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all mb-1 cursor-pointer border-l-4 border-transparent group">
             <span class="mr-3 text-xl group-hover:scale-110 transition-transform">🚚</span> <span class="font-medium">Véhicules</span>
          </a>
          
          <a routerLink="/admin/companies" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" (click)="toggleMobileMenu()" 
             class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all mb-1 cursor-pointer border-l-4 border-transparent group">
             <span class="mr-3 text-xl group-hover:scale-110 transition-transform">🏢</span> <span class="font-medium">Sociétés</span>
          </a>

          <a routerLink="/admin/mock-data" routerLinkActive="bg-purple-600/20 text-white border-l-4 border-purple-500" (click)="toggleMobileMenu()" 
             class="flex items-center px-4 py-3 rounded-r-lg text-purple-300 hover:bg-purple-900/30 hover:text-white transition-all mb-1 cursor-pointer mt-6 border-t border-slate-800/50 border-l-4 border-transparent group">
             <span class="mr-3 text-xl group-hover:scale-110 transition-transform">⚡</span> <span class="font-medium">Données Test</span>
          </a>
          
          <!-- BOUTON DÉCONNEXION DANS LE MENU (RESTAURÉ) -->
           <button (click)="logout()" class="w-full flex items-center px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-all group mb-1 cursor-pointer mt-6 border-t border-slate-800 pt-4">
             <span class="mr-3 text-xl group-hover:scale-110 transition-transform">🚪</span>
             <span class="font-medium">Déconnexion</span>
           </button>
        </nav>

        <!-- Profil (Bouton logout conservé aussi ici) -->
        <div class="p-6 border-t border-slate-800 bg-slate-950/30">
           @if (userProfile(); as profile) {
               <div class="flex items-center gap-4">
                  <div class="relative">
                    <div class="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-slate-800 text-xl shadow-lg">
                        {{ profile.email.charAt(0).toUpperCase() }}
                    </div>
                    <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                  </div>
                  <div class="flex-1 overflow-hidden">
                     @if (profile.email === 'admin@gmail.com') {
                        <p class="text-sm font-bold text-white truncate">Administrateur</p>
                        <p class="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">Super Admin</p>
                     } @else {
                        <p class="text-sm font-bold text-white truncate">{{ profile.email.split('@')[0] }}</p>
                        <p class="text-[10px] text-slate-400 truncate">{{ profile.company }}</p>
                     }
                  </div>
                  <button (click)="logout()" class="text-slate-400 hover:text-red-400 transition-colors" title="Déconnexion">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                  </button>
               </div>
           }
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="lg:pl-72 flex flex-col h-screen w-full relative transition-all duration-300">
        
        <!-- HEADER MOBILE MODERNE -->
        <header class="bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:hidden shrink-0 z-[9997] sticky top-0 transition-all duration-300 relative">
             
             <!-- BOUTON MENU CLASSIQUE (HAMBURGER) - GAUCHE -->
             <button (click)="toggleMobileMenu()" 
                     class="relative group p-2 rounded-xl hover:bg-indigo-50 transition-all duration-300 focus:outline-none active:scale-95 z-20">
                
                <!-- Icône Hamburger SVG -->
                <div class="w-8 h-8 text-indigo-600 transition-all duration-300"
                     [ngClass]="isMobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-full h-full">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                   </svg>
                </div>
                
                <!-- Icône Fermer (apparaît quand menu ouvert) -->
                <div class="absolute inset-0 flex items-center justify-center text-gray-500 transition-all duration-300"
                     [ngClass]="isMobileMenuOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-50'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
             </button>

             <!-- Logo Mobile (CENTRÉ ABSOLU) -->
             <div class="flex items-center gap-2 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div class="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                    <span class="text-lg">📦</span>
                </div>
                <span class="font-bold text-gray-800 text-lg tracking-tight">Master<span class="text-indigo-600">Delivery</span></span>
             </div>
        </header>

        <!-- CONTENT -->
        <main class="flex-1 overflow-y-auto relative flex flex-col bg-gray-50 p-0">
             <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* Scrollbar stylisée pour la sidebar */
    .custom-scrollbar::-webkit-scrollbar {
        width: 5px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(30, 41, 59, 0.5);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.5);
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(99, 102, 241, 0.8);
    }
  `]
})
export class AdminDashboardComponent {
  private authService = inject(AuthService);
  isMobileMenuOpen = false;

  userProfile = toSignal(
    this.authService.user$.pipe(
      switchMap(user => user ? this.authService.getUserProfile(user.uid) : of(null))
    ),
    { initialValue: null }
  );

  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  logout() { this.authService.logout().subscribe(); }
}
