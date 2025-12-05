import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService, Company } from '../../../core/services/company.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-company-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
        <div class="flex justify-between items-center">
             <h2 class="text-2xl font-bold text-gray-800">Gestion des Sociétés</h2>
             <button (click)="toggleForm()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-all">
                <span class="text-xl">{{ showForm() ? '✕' : '+' }}</span>
                {{ showForm() ? 'Fermer' : 'Ajouter Société' }}
             </button>
        </div>

        <div *ngIf="showForm()" class="bg-white p-6 rounded-lg shadow-xl border-l-4 border-indigo-500 animate-fade-in">
           <h3 class="text-lg font-bold text-gray-800 mb-4">{{ isEditMode() ? 'Modifier' : 'Ajouter' }} une Société</h3>
           <form [formGroup]="companyForm" (ngSubmit)="saveCompany()" class="space-y-4">
              <div>
                 <label class="block text-sm font-medium text-gray-700">Nom</label>
                 <input formControlName="name" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
              </div>
              <div>
                 <label class="block text-sm font-medium text-gray-700">Email Contact</label>
                 <input formControlName="contactEmail" type="email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
              </div>
              <div *ngIf="isEditMode()">
                  <label class="block text-sm font-medium text-gray-700">Statut</label>
                  <select formControlName="isActive" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                      <option [ngValue]="true">Actif</option>
                      <option [ngValue]="false">Inactif</option>
                  </select>
              </div>
              <div class="flex justify-end gap-3">
                 <button type="button" (click)="resetForm()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Annuler</button>
                 <button type="submit" [disabled]="companyForm.invalid" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 shadow-sm disabled:opacity-50">
                    Sauvegarder
                 </button>
              </div>
           </form>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
             <div class="overflow-x-auto">
                 <table class="min-w-full divide-y divide-gray-200">
                     <thead class="bg-gray-50">
                         <tr>
                             <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                             <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                             <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                             <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                         </tr>
                     </thead>
                     <tbody class="bg-white divide-y divide-gray-200">
                         @for (company of (companies$ | async); track company.uid) {
                             <tr class="hover:bg-gray-50 transition-colors">
                                 <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ company.name }}</td>
                                 <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ company.contactEmail }}</td>
                                 <td class="px-6 py-4 whitespace-nowrap">
                                     <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                         [ngClass]="company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                                         {{ company.isActive ? 'Actif' : 'Inactif' }}
                                     </span>
                                 </td>
                                 <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                     <button (click)="editCompany(company)" class="text-indigo-600 hover:text-indigo-900">Modifier</button>
                                     <button (click)="toggleStatus(company)"
                                             [ngClass]="company.isActive ? 'text-red-600' : 'text-green-600'">
                                         {{ company.isActive ? 'Désactiver' : 'Activer' }}
                                     </button>
                                 </td>
                             </tr>
                         }
                     </tbody>
                 </table>
             </div>
        </div>
    </div>
  `
})
export class CompanyManagerComponent {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);

  companies$: Observable<Company[]> = this.companyService.getCompanies();
  showForm = signal(false);
  isEditMode = signal(false);
  currentCompanyId: string | null = null;

  companyForm = this.fb.group({
    name: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    isActive: [true]
  });

  toggleForm() {
    if (this.showForm() && this.isEditMode()) { this.resetForm(); } 
    else { this.showForm.set(!this.showForm()); this.isEditMode.set(false); }
  }

  editCompany(company: Company) {
    this.currentCompanyId = company.uid!;
    this.companyForm.patchValue({ name: company.name, contactEmail: company.contactEmail, isActive: company.isActive });
    this.isEditMode.set(true);
    this.showForm.set(true);
  }

  resetForm() {
    this.companyForm.reset({ isActive: true });
    this.isEditMode.set(false);
    this.showForm.set(false);
    this.currentCompanyId = null;
  }

  async saveCompany() {
    if (this.companyForm.invalid) return;
    const data = this.companyForm.value;
    
    if (this.isEditMode() && this.currentCompanyId) {
      await this.companyService.updateCompany(this.currentCompanyId, {
        name: data.name!, contactEmail: data.contactEmail!, isActive: data.isActive!
      });
    } else {
      await this.companyService.addCompany({
        name: data.name!, contactEmail: data.contactEmail!, isActive: true
      });
    }
    this.resetForm();
  }

  async toggleStatus(company: Company) {
    if (confirm(`Confirmer l'action sur ${company.name} ?`)) {
      await this.companyService.toggleStatus(company.uid!, !company.isActive);
    }
  }
}
