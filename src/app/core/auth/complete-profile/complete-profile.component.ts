import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CompanyService } from '../../services/company.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">Finaliser l'inscription</h2>
          <p class="mt-2 text-sm text-gray-600">
            Veuillez compléter vos informations pour accéder à la plateforme.
          </p>
        </div>
        
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700">Compte Google</label>
            <div class="mt-1 px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-600 text-sm">
              {{ (currentUser$ | async)?.email }}
            </div>
          </div>

          <!-- TÉLÉPHONE : TEXTE SIMPLE OBLIGATOIRE -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Téléphone</label>
            <input formControlName="phoneNumber" type="text" placeholder="Numéro de téléphone" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm p-2">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Votre Métier</label>
            <select formControlName="role" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md border p-2">
              <option value="" disabled>Choisir un métier</option>
              <option value="DRIVER">Chauffeur</option>
              <option value="EMPLOYEE">Employé</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Votre Société</label>
            <select formControlName="company" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md border p-2">
              <option value="" disabled>Choisir une société</option>
              @for (company of activeCompanies(); track company.uid) {
                 <option [value]="company.name">{{ company.name }}</option>
              }
            </select>
          </div>

          <button type="submit" [disabled]="profileForm.invalid"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
            Valider et Accéder
          </button>
        </form>
      </div>
    </div>
  `
})
export class CompleteProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private router = inject(Router);

  currentUser$ = this.authService.user$;
  activeCompanies = this.companyService.activeCompanies;

  profileForm = this.fb.group({
    phoneNumber: ['', Validators.required], // Validation simple
    role: ['', Validators.required],
    company: ['', Validators.required]
  });

  ngOnInit() {
    this.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) this.router.navigate(['/login']);
    });
  }

  onSubmit() {
    if (this.profileForm.valid) {
      this.currentUser$.pipe(take(1)).subscribe(user => {
        if (user) {
          const { role, company, phoneNumber } = this.profileForm.value;
          this.authService.createProfile(user, role as any, company!, phoneNumber!).subscribe({
            next: () => {
              alert('Profil complété !');
              if (role === 'DRIVER') this.router.navigate(['/driver']);
              else this.router.navigate(['/admin']);
            },
            error: (err) => alert('Erreur création profil : ' + err.message)
          });
        }
      });
    }
  }
}
