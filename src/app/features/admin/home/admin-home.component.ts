import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { map } from 'rxjs/operators';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      
      <!-- Welcome Section -->
      <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-indigo-600">
        <h2 class="text-2xl font-bold text-gray-800">Bienvenue sur votre Tableau de Bord</h2>
        <p class="text-gray-600 mt-1">Voici un aperçu de l'activité de votre flotte aujourd'hui.</p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Card 1: Total Users -->
        <div class="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 uppercase">Utilisateurs Total</p>
              <h3 class="text-3xl font-bold text-gray-900 mt-2">{{ (stats$ | async)?.total || 0 }}</h3>
            </div>
            <div class="p-3 bg-blue-50 rounded-full">
              <span class="text-2xl">👥</span>
            </div>
          </div>
          <div class="mt-4 flex items-center text-sm text-gray-600">
            <span class="text-green-600 font-medium flex items-center">
              <span class="mr-1">↑</span> Actifs
            </span>
            <span class="mx-2 text-gray-300">|</span>
            <span class="text-gray-500">Employés & Chauffeurs</span>
          </div>
        </div>

        <!-- Card 2: Drivers -->
        <div class="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 uppercase">Chauffeurs</p>
              <h3 class="text-3xl font-bold text-gray-900 mt-2">{{ (stats$ | async)?.drivers || 0 }}</h3>
            </div>
            <div class="p-3 bg-indigo-50 rounded-full">
               <span class="text-2xl">🧢</span>
            </div>
          </div>
          <div class="mt-4">
             <a routerLink="/admin/drivers" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Voir les détails →</a>
          </div>
        </div>

        <!-- Card 3: Pending Validations -->
        <div class="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 uppercase">En attente</p>
              <h3 class="text-3xl font-bold text-orange-600 mt-2">{{ (stats$ | async)?.pending || 0 }}</h3>
            </div>
            <div class="p-3 bg-orange-50 rounded-full">
               <span class="text-2xl">⚠️</span>
            </div>
          </div>
          <div class="mt-4 text-sm text-gray-500">
            Utilisateurs à valider
          </div>
        </div>
      </div>

      <!-- Quick Actions / Recent Activity Placeholder -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Actions Rapides</h3>
          <div class="grid grid-cols-2 gap-4">
            <button class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition text-left group">
              <span class="block text-xl mb-2 group-hover:scale-110 transition-transform">🚚</span>
              <span class="font-semibold text-gray-700">Ajouter un Véhicule</span>
            </button>
            <button routerLink="/register" class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition text-left group">
              <span class="block text-xl mb-2 group-hover:scale-110 transition-transform">👤</span>
              <span class="font-semibold text-gray-700">Créer un Utilisateur</span>
            </button>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-6">
           <h3 class="text-lg font-bold text-gray-800 mb-4">État du Système</h3>
           <div class="space-y-4">
              <div class="flex items-center justify-between p-3 bg-green-50 rounded border border-green-100">
                 <span class="text-green-800 font-medium">Base de données</span>
                 <span class="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full">Connecté</span>
              </div>
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                 <span class="text-gray-700">Version API</span>
                 <span class="text-gray-500 text-sm">v1.0.0</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  `
})
export class AdminHomeComponent {
  private userService = inject(UserService);

  // Calcul des statistiques en temps réel depuis le UserService
  stats$ = this.userService.getAllUsers().pipe(
    map(users => ({
      total: users.length,
      drivers: users.filter(u => u.role === 'DRIVER').length,
      pending: users.filter(u => !u.isActive).length
    }))
  );
}
