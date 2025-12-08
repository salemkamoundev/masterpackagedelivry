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
      <aside class="fixed inset-y-0 left-0 z-[1000] w-72 bg-slate-900 text-white shadow-2xl flex flex-col transition-transform lg:translate-x-0"
             [ngClass]="isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'">
        <div class="h-20 flex items-center px-8 border-b border-slate-800 bg-slate-950/50">
          <span class="text-xl font-bold">Master<span class="text-indigo-400">DELIVERY</span></span>
        </div>
        <nav class="flex-1 py-8 px-4 space-y-1 overflow-y-auto">
          <a routerLink="/admin" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:text-white mb-1 border-l-4 border-transparent cursor-pointer">
             <span class="mr-3">🏠</span> Accueil
          </a>
          <a routerLink="/admin/live-map" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:text-white mb-1 border-l-4 border-transparent cursor-pointer">
             <span class="mr-3">🌍</span> Carte Live
          </a>
          <a routerLink="/admin/trips" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:text-white mb-1 border-l-4 border-transparent cursor-pointer">
             <span class="mr-3">📦</span> Trajets
          </a>
          <a routerLink="/admin/users" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:text-white mb-1 border-l-4 border-transparent cursor-pointer">
             <span class="mr-3">👥</span> Utilisateurs
          </a>
          <a routerLink="/admin/cars" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:text-white mb-1 border-l-4 border-transparent cursor-pointer">
             <span class="mr-3">🚚</span> Véhicules
          </a>
          <a routerLink="/admin/companies" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:text-white mb-1 border-l-4 border-transparent cursor-pointer">
             <span class="mr-3">🏢</span> Sociétés
          </a>
          <a routerLink="/admin/chat" routerLinkActive="bg-indigo-600/20 text-white border-l-4 border-indigo-500" class="flex items-center px-4 py-3 rounded-r-lg text-slate-400 hover:text-white mb-1 border-l-4 border-transparent cursor-pointer">
             <span class="mr-3">💬</span> Messagerie
          </a>
          <button (click)="logout()" class="w-full flex items-center px-4 py-3 text-red-400 hover:text-red-300 mt-6 border-t border-slate-800 pt-4 cursor-pointer">
             <span class="mr-3">🚪</span> Déconnexion
          </button>
        </nav>
      </aside>

      <div class="lg:pl-72 flex flex-col h-screen w-full relative">
        <header class="bg-white border-b h-16 flex items-center justify-between px-4 lg:hidden sticky top-0 z-20">
             <button (click)="isMobileMenuOpen = !isMobileMenuOpen" class="text-2xl text-indigo-600">☰</button>
             <span class="font-bold">MasterDelivery</span>
        </header>
        <main class="flex-1 overflow-y-auto bg-gray-50">
             <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {
  private authService = inject(AuthService);
  isMobileMenuOpen = false;
  userProfile = toSignal(this.authService.user$.pipe(switchMap(user => user ? this.authService.getUserProfile(user.uid) : of(null))));
  logout() { this.authService.logout().subscribe(); }
}
