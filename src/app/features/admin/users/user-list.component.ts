import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 class="text-lg leading-6 font-medium text-gray-900">Gestion des Utilisateurs</h3>
        <span class="text-sm text-gray-500">Total: {{ (users$ | async)?.length || 0 }}</span>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email / Nom</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Société</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            @for (user of users$ | async; track user.uid) {
              <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ user.email }}</div>
                  <div class="text-xs text-gray-500">{{ user.uid }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.company }}</div>
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
                  @if (user.isActive) {
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Actif
                    </span>
                  } @else {
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Inactif
                    </span>
                  }
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <!-- Bouton Valider -->
                  @if (!user.isActive) {
                    <button (click)="toggleStatus(user, true)" class="text-green-600 hover:text-green-900" title="Valider le compte">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  } @else {
                    <button (click)="toggleStatus(user, false)" class="text-red-600 hover:text-red-900" title="Désactiver">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  }

                  <!-- Bouton Promouvoir Admin (Visible uniquement pour SUPER_ADMIN) -->
                  @if (isSuperAdmin() && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                    <button (click)="promoteToAdmin(user)" class="text-indigo-600 hover:text-indigo-900" title="Promouvoir Admin">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                      </svg>
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">Aucun utilisateur trouvé.</td>
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
  
  // Supposons que nous récupérons le rôle actuel via un signal ou observable dans AuthService
  // Pour l'exemple, nous allons simuler ou récupérer snapshot. 
  // Idéalement, AuthService devrait exposer un Signal<UserProfile>.
  // Ici nous simplifions la vérification SuperAdmin.
  currentUserRole = 'SUPER_ADMIN'; // À connecter avec AuthService.currentUserProfile()

  toggleStatus(user: UserProfile, status: boolean) {
    if(confirm(`Voulez-vous vraiment changer le statut de ${user.email} ?`)) {
      this.userService.updateUserStatus(user.uid, status);
    }
  }

  promoteToAdmin(user: UserProfile) {
    if(confirm(`Promouvoir ${user.email} comme Administrateur ?`)) {
      // Attention aux types, on cast vers le type large défini dans UserService
      this.userService.updateUserRole(user.uid, 'ADMIN');
    }
  }

  isSuperAdmin(): boolean {
    // Logique réelle à implémenter avec AuthService
    // return this.authService.currentUserProfile()?.role === 'SUPER_ADMIN';
    return true; // Mock pour demo
  }
}
