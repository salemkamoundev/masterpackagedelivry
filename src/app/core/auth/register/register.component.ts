import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">Créer un compte</h2>
        </div>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-4">
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <input formControlName="email" type="email" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Mot de passe</label>
            <input formControlName="password" type="password" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Rôle</label>
            <select formControlName="role" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="DRIVER">Chauffeur</option>
              <option value="EMPLOYEE">Employé</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Société</label>
            <select formControlName="company" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="" disabled>Choisir une société</option>
              <option value="DHL">DHL</option>
              <option value="FedEx">FedEx</option>
              <option value="UPS">UPS</option>
              <option value="Interne">Interne</option>
            </select>
          </div>

          <button type="submit" [disabled]="registerForm.invalid"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400">
            S'inscrire
          </button>
        </form>
         <div class="text-center mt-4">
          <a routerLink="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
            Déjà un compte ? Se connecter
          </a>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['DRIVER', Validators.required],
    company: ['', Validators.required]
  });

  onSubmit() {
    if (this.registerForm.valid) {
      const { email, password, role, company } = this.registerForm.value;
      // Cast explicite pour respecter les types stricts
      this.authService.register(
        email!, 
        password!, 
        role as 'DRIVER' | 'EMPLOYEE', 
        company!
      ).subscribe({
        next: () => {
          alert('Compte créé ! En attente de validation.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Register Error:', err);
          alert('Erreur inscription (voir console): ' + err.message);
        }
      });
    }
  }
}
