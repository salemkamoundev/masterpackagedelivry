#!/bin/bash

# ==========================================
# FEATURE: ADMIN MODULE
# Description: Dashboard, User Management, Guards
# ==========================================

set -e

echo "🚀 Génération du module Administration..."

# 1. Création des dossiers
mkdir -p src/app/features/admin/dashboard
mkdir -p src/app/features/admin/users
mkdir -p src/app/core/services
mkdir -p src/app/core/guards

# 1.5 PATCH: Mise à jour de Auth Service pour supporter SUPER_ADMIN
# Cela corrige l'erreur TS2367 en ajoutant 'SUPER_ADMIN' à l'Union Type de UserProfile
echo "🔧 Patch de UserProfile dans auth.service.ts..."
perl -pi -e "s/role: 'DRIVER' \| 'EMPLOYEE' \| 'ADMIN';/role: 'DRIVER' \| 'EMPLOYEE' \| 'ADMIN' \| 'SUPER_ADMIN';/g" src/app/core/auth/auth.service.ts

# 2. Génération du UserService
echo "📦 Création de UserService..."
cat <<EOF > src/app/core/services/user.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserProfile } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);

  // Récupérer tous les utilisateurs
  getAllUsers(): Observable<UserProfile[]> {
    const usersRef = collection(this.firestore, 'users');
    // idField permet d'inclure l'ID du document dans l'objet sous le nom 'uid'
    return collectionData(usersRef, { idField: 'uid' }) as Observable<UserProfile[]>;
  }

  // Mettre à jour le statut (Validation)
  updateUserStatus(uid: string, isActive: boolean): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);
    return updateDoc(userRef, { isActive });
  }

  // Mettre à jour le rôle (Promotion)
  updateUserRole(uid: string, role: 'DRIVER' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN'): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);
    return updateDoc(userRef, { role });
  }
}
EOF

# 3. Génération de AdminGuard
echo "🛡️  Création de AdminGuard..."
cat <<EOF > src/app/core/guards/admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    take(1),
    switchMap(user => {
      if (!user) return of(null);
      return auth.getUserProfile(user.uid);
    }),
    map(profile => {
      // Vérification des rôles (case sensitive selon votre convention, ici UPPERCASE pour matcher AuthService)
      // Note: Le patch perl ci-dessus a ajouté SUPER_ADMIN au type UserProfile pour éviter l'erreur TS
      if (profile && (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN')) {
        return true;
      }
      
      // Redirection si pas admin
      return router.createUrlTree(['/login']);
    })
  );
};
EOF

# 4. Génération de UserListComponent
echo "📋 Création de UserListComponent..."
cat <<EOF > src/app/features/admin/users/user-list.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: \`
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
  \`
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
    if(confirm(\`Voulez-vous vraiment changer le statut de \${user.email} ?\`)) {
      this.userService.updateUserStatus(user.uid, status);
    }
  }

  promoteToAdmin(user: UserProfile) {
    if(confirm(\`Promouvoir \${user.email} comme Administrateur ?\`)) {
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
EOF

# 5. Génération de AdminDashboardComponent
echo "📊 Création de AdminDashboardComponent..."
cat <<EOF > src/app/features/admin/dashboard/admin-dashboard.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserListComponent } from '../users/user-list.component';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, UserListComponent, RouterOutlet, RouterLink],
  template: \`
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
  \`
})
export class AdminDashboardComponent {}
EOF

# 6. Mise à jour des Routes (Instruction pour l'utilisateur)
echo "🔗 Génération du fichier de routes Admin..."
cat <<EOF > src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminDashboardComponent
  }
];
EOF

echo "✅ Module Admin généré !"
echo "⚠️  ACTION REQUISE : Ajoutez la route suivante dans src/app/app.routes.ts :"
echo ""
echo "  {"
echo "    path: 'admin',"
echo "    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),"
echo "    canActivate: [adminGuard]"
echo "  }"
echo ""
echo "👉 Et n'oubliez pas d'importer 'adminGuard' dans app.routes.ts depuis './core/guards/admin.guard'."