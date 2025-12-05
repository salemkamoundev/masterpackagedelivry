import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserListComponent } from '../users/user-list.component';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, UserListComponent, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-100">
      <nav class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex">
              <div class="flex-shrink-0 flex items-center">
                <h1 class="text-xl font-bold text-indigo-600">Admin Panel</h1>
              </div>
              <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a routerLink="/admin" class="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Utilisateurs
                </a>
                <!-- Future links: Drivers, Cars, etc. -->
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div class="py-10">
        <header>
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 class="text-3xl font-bold leading-tight text-gray-900">
              Dashboard
            </h1>
          </div>
        </header>
        <main>
          <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 mt-6">
            <app-user-list></app-user-list>
          </div>
        </main>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {}
