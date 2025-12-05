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
  template: `
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
  `
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
    if(confirm(`Modifier le statut de ${user.email} ?`)) {
      this.userService.updateUserStatus(user.uid, status);
    }
  }

  promoteToAdmin(user: UserProfile) {
    if(confirm(`⚠️ Action Sensible : Promouvoir ${user.email} comme Administrateur ? Il aura accès complet à la gestion.`)) {
      this.userService.updateUserRole(user.uid, 'ADMIN');
    }
  }
}
