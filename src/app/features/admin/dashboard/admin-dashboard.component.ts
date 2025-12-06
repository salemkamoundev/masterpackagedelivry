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
      <div *ngIf="isMobileMenuOpen" (click)="toggleMobileMenu()" class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity"></div>

      <!-- SIDEBAR -->
      <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white shadow-2xl flex flex-col transition-transform duration-300 transform lg:translate-x-0"
             [ngClass]="isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'">
        
        <!-- Logo -->
        <div class="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div class="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
            <span class="text-xl">🚚</span>
          </div>
          <span class="text-lg font-bold tracking-wide text-gray-100">Master<span class="text-indigo-400">Delivery</span></span>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Menu</p>
          
          <a routerLink="/admin" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="bg-indigo-600 text-white" (click)="toggleMobileMenu()" class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all mb-1 cursor-pointer">
             <span class="mr-3 text-xl">🏠</span> <span class="font-medium">Accueil</span>
          </a>

          <a routerLink="/admin/live-map" routerLinkActive="bg-indigo-600 text-white" (click)="toggleMobileMenu()" class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all mb-1 cursor-pointer">
             <span class="mr-3 text-xl">🌍</span> <span class="font-medium">Carte Live</span>
          </a>

          <a routerLink="/admin/users" routerLinkActive="bg-indigo-600 text-white" (click)="toggleMobileMenu()" class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all mb-1 cursor-pointer">
             <span class="mr-3 text-xl">👥</span> <span class="font-medium">Utilisateurs</span>
          </a>

          <a routerLink="/admin/trips" routerLinkActive="bg-indigo-600 text-white" (click)="toggleMobileMenu()" class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all mb-1 cursor-pointer">
             <span class="mr-3 text-xl">📦</span> <span class="font-medium">Trajets</span>
          </a>

          <a routerLink="/admin/cars" routerLinkActive="bg-indigo-600 text-white" (click)="toggleMobileMenu()" class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all mb-1 cursor-pointer">
             <span class="mr-3 text-xl">🚚</span> <span class="font-medium">Véhicules</span>
          </a>
          
          <a routerLink="/admin/companies" routerLinkActive="bg-indigo-600 text-white" (click)="toggleMobileMenu()" class="flex items-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all mb-1 cursor-pointer">
             <span class="mr-3 text-xl">🏢</span> <span class="font-medium">Sociétés</span>
          </a>

          <a routerLink="/admin/mock-data" routerLinkActive="bg-purple-600 text-white" (click)="toggleMobileMenu()" class="flex items-center px-3 py-2.5 rounded-lg text-purple-300 hover:bg-purple-800 hover:text-white transition-all mb-1 cursor-pointer mt-4 border-t border-slate-800 pt-4">
             <span class="mr-3 text-xl">⚡</span> <span class="font-medium">Données Test</span>
          </a>
          
           <button (click)="logout()" class="w-full flex items-center px-3 py-2.5 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-all mt-1 cursor-pointer">
             <span class="mr-3 text-xl">🚪</span> <span class="font-medium">Déconnexion</span>
           </button>
        </nav>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="lg:pl-64 flex flex-col h-screen w-full relative transition-all duration-300">
        <!-- Header Mobile Uniquement -->
        <header class="bg-white shadow-sm h-16 flex items-center justify-between px-4 lg:hidden shrink-0 z-30 relative">
             <span class="font-bold text-gray-800">MasterDelivery</span>
             <button (click)="toggleMobileMenu()" class="text-gray-500 p-2 border rounded">☰</button>
        </header>

        <!-- Zone de contenu principale : Pas de padding global, pas de scroll global -->
        <!-- Cela permet au composant enfant (la carte) de gérer sa propre hauteur -->
        <main class="flex-1 overflow-hidden relative flex flex-col bg-gray-50">
             <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
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
