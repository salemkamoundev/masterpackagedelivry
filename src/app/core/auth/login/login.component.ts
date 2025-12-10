import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">Connexion</h2>
          <p class="mt-2 text-sm text-gray-600">Accédez à Master Delivery</p>
        </div>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email-address" class="sr-only">Email</label>
              <input id="email-address" formControlName="email" type="email" required 
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                placeholder="Adresse Email">
            </div>
            <div>
              <label for="password" class="sr-only">Mot de passe</label>
              <input id="password" formControlName="password" type="password" required 
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                placeholder="Mot de passe">
            </div>
          </div>

          <div>
            <button type="submit" [disabled]="loginForm.invalid"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              Se connecter
            </button>
          </div>
        </form>

        <div class="mt-4">
           <button (click)="loginWithGoogle()" type="button" class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2">
             <span class="font-bold text-lg">G</span> Connexion Google
           </button>
        </div>

        <div class="text-center mt-4">
          <a routerLink="/register" class="font-medium text-indigo-600 hover:text-indigo-500">Pas encore de compte ? S'inscrire</a>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  private checkStatusAndRedirect(profile: any) {
    if (profile?.email === 'admin@gmail.com' || profile?.role === 'SUPER_ADMIN') {
        this.router.navigate(['/admin']);
        return;
    }

    if (profile && profile.isActive) {
      if (profile.role === 'DRIVER') {
        this.router.navigate(['/driver']);
      } else {
        this.router.navigate(['/admin']);
      }
    } else {
      this.authService.logout().subscribe(() => {
         alert("Votre compte n'est pas encore validé.");
      });
    }
  }

  // FORCE L'ENREGISTREMENT DU SUPER ADMIN DANS LA BASE
  private async ensureAdminProfile(user: any) {
      if (user.email === 'admin@gmail.com') {
          // On force la création/mise à jour du profil Firestore avec le VRAI UID
          await this.authService.createProfile(user, 'Super Admin', 'SUPER_ADMIN', 'System', '00000000').toPromise();
      }
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email!, password!).pipe(
        switchMap(async (cred) => {
           // 1. Si c'est l'admin, on s'assure qu'il existe en base avec son vrai ID
           await this.ensureAdminProfile(cred.user);
           return cred;
        }),
        switchMap(cred => this.authService.getUserProfile(cred.user.uid))
      ).subscribe({
        next: (profile) => this.checkStatusAndRedirect(profile),
        error: (err) => alert('Erreur : ' + err.message)
      });
    }
  }

  loginWithGoogle() {
    this.authService.loginGoogle().pipe(
      switchMap(async (cred) => {
         await this.ensureAdminProfile(cred.user); // On assure que l'admin est en base
         return cred;
      }),
      switchMap(cred => this.authService.getUserProfile(cred.user.uid))
    ).subscribe({
      next: (profile) => {
        if (profile) this.checkStatusAndRedirect(profile);
        else this.router.navigate(['/complete-profile']);
      },
      error: (err) => alert('Erreur Google: ' + err.message)
    });
  }
}
