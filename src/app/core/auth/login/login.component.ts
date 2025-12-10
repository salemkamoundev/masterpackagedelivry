import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">Connexion</h2>
        </div>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label class="sr-only">Email</label>
              <input formControlName="email" type="email" class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Adresse Email">
            </div>
            <div>
              <label class="sr-only">Mot de passe</label>
              <input formControlName="password" type="password" class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Mot de passe">
            </div>
          </div>

          <div>
            <button type="submit" [disabled]="loginForm.invalid || isLoading"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50">
              {{ isLoading ? 'Connexion...' : 'Se connecter' }}
            </button>
          </div>
        </form>

        <div class="mt-4">
           <button (click)="loginWithGoogle()" type="button" class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2">
              <span class="font-bold text-lg">G</span> Connexion Google
           </button>
        </div>
        <div class="text-center mt-4"><a routerLink="/register" class="font-medium text-indigo-600 hover:text-indigo-500">Pas encore de compte ? S'inscrire</a></div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  isLoading = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Gestion centralisée de la redirection
  private handleRedirect(profile: any, email?: string) {
    this.isLoading = false; // DÉBLOCAGE DU BOUTON
    
    // Cas spécial Admin système (si pas de profil ou profil admin)
    if (email === 'admin@gmail.com' || profile?.role === 'SUPER_ADMIN') {
        this.router.navigate(['/admin']);
        return;
    }

    // Si pas de profil -> Inscription incomplète
    if (!profile || !profile.role || !profile.company) {
        this.router.navigate(['/complete-profile']);
        return;
    }

    // Redirection normale
    if (profile.isActive) {
        this.router.navigate([profile.role === 'DRIVER' ? '/driver' : '/admin']);
    } else {
        alert("Votre compte est en attente de validation.");
        this.authService.logout();
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe({
      next: (cred) => {
        // Création silencieuse du profil admin (ne bloque pas le flux)
        if (cred.user.email === 'admin@gmail.com') {
             this.authService.createProfile(cred.user, 'Super Admin', 'SUPER_ADMIN', 'System', '00000000').subscribe();
        }
        
        // Récupération du profil
        this.authService.getUserProfile(cred.user.uid).subscribe({
            next: (profile) => this.handleRedirect(profile, cred.user.email!),
            error: () => this.handleRedirect(null, cred.user.email!) // En cas d'erreur (profil inexistant), on gère quand même
        });
      },
      error: (err) => {
        this.isLoading = false;
        alert('Erreur Login : ' + err.message);
      }
    });
  }

  loginWithGoogle() {
    this.authService.loginGoogle().subscribe({
      next: (cred) => {
        if (cred.user.email === 'admin@gmail.com') {
             this.authService.createProfile(cred.user, 'Super Admin', 'SUPER_ADMIN', 'System', '00000000').subscribe();
        }
        this.authService.getUserProfile(cred.user.uid).subscribe({
            next: (profile) => this.handleRedirect(profile, cred.user.email!),
            error: () => this.handleRedirect(null, cred.user.email!)
        });
      },
      error: (err) => alert('Erreur Google: ' + err.message)
    });
  }
}
