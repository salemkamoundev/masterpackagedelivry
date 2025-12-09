import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="px-4 py-5 sm:px-6 flex justify-between items-center bg-indigo-50">
        <div><h3 class="text-lg leading-6 font-bold text-gray-900">Gestion des Utilisateurs</h3></div>
        <span class="bg-white text-indigo-600 py-1 px-3 rounded-full text-xs font-bold border border-indigo-200">Total: {{ (users$ | async)?.length || 0 }}</span>
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
              <tr class="hover:bg-gray-50 group">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3 text-lg">
                       {{ (user.displayName || user.email).charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="text-sm font-bold text-gray-900 flex items-center gap-2">
                          {{ user.displayName || user.email }}
                          <button (click)="openChat(user)" class="opacity-50 group-hover:opacity-100 transition-opacity bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-1 rounded-full flex items-center justify-center h-6 w-6" title="Discuter">💬</button>
                      </div>
                      <div class="text-xs text-gray-500">{{ user.company }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-indigo-700">{{ user.phoneNumber || 'N/A' }}</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{{ user.role }}</span></td>
                <td class="px-6 py-4 whitespace-nowrap"><span *ngIf="user.isActive" class="text-green-600 text-xs font-bold">Actif</span><span *ngIf="!user.isActive" class="text-red-600 text-xs font-bold">Inactif</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button *ngIf="!user.isActive" (click)="toggleStatus(user, true)" class="text-green-600 hover:text-green-900 mr-2">Valider</button>
                  <button *ngIf="user.isActive" (click)="toggleStatus(user, false)" class="text-red-600 hover:text-red-900 mr-2">Désactiver</button>
                  <button *ngIf="isSuperAdmin() && user.role !== 'ADMIN'" (click)="promoteToAdmin(user)" class="text-indigo-600 hover:text-indigo-900">★ Admin</button>
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
  private chatService = inject(ChatService);
  private router = inject(Router);
  users$: Observable<UserProfile[]> = this.userService.getAllUsers();
  currentUser = toSignal(this.authService.user$);
  isSuperAdmin(): boolean { return this.currentUser()?.email === 'admin@gmail.com'; }
  toggleStatus(user: UserProfile, status: boolean) { if(confirm('Modifier statut ?')) this.userService.updateUserStatus(user.uid, status); }
  promoteToAdmin(user: UserProfile) { if(confirm('Promouvoir Admin ?')) this.userService.updateUserRole(user.uid, 'ADMIN'); }
  openChat(user: UserProfile) { this.chatService.startChatWith(user); this.router.navigate(['/admin/chat']); }
}
