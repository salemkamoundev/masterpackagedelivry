import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarService, Car } from '../../../core/services/car.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { CompanyService } from '../../../core/services/company.service';
import { Observable, combineLatest, of } from 'rxjs';
import { switchMap, map, shareReplay, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-car-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-3 bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-4">
        <div class="flex items-center gap-2">
           <span class="text-2xl">🏢</span> 
           <div>
             <p class="text-sm font-semibold text-indigo-800">Mode de Gestion</p>
             <p class="font-bold text-indigo-900">
               @if (isSuperAdmin()) { ⚡ SUPER ADMIN (Compte Système) } 
               @else if (adminCompany()) { {{ adminCompany() }} } 
               @else { <span class="italic opacity-50">Chargement...</span> }
             </p>
           </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Ajouter un Véhicule</h3>
        <form [formGroup]="carForm" (ngSubmit)="addCar()" class="space-y-4">
          @if (isSuperAdmin()) {
            <div>
              <label class="block text-sm font-medium text-gray-700">Société <span class="text-red-500">*</span></label>
              <select formControlName="company" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 bg-yellow-50">
                <option value="" disabled>Choisir une société</option>
                @for (company of companies(); track company.uid) { <option [value]="company.name">{{ company.name }}</option> }
              </select>
            </div>
          }
          <div><label class="block text-sm font-medium text-gray-700">Modèle</label><input formControlName="model" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"></div>
          <div><label class="block text-sm font-medium text-gray-700">Plaque</label><input formControlName="plate" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"></div>
          <button type="submit" [disabled]="carForm.invalid || (!isSuperAdmin() && !adminCompany())" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50">Ajouter</button>
        </form>
      </div>

      <div class="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
           <h3 class="text-lg font-bold text-gray-800">Flotte {{ isSuperAdmin() ? 'Globale' : adminCompany() }}</h3>
           <span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{{ (carsFiltered$ | async)?.length || 0 }} véhicules</span>
        </div>
        <div class="overflow-x-auto">
           <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Véhicule</th>
                  @if (isSuperAdmin()) { <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Société</th> }
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (car of carsFiltered$ | async; track car.uid) {
                  <tr class="hover:bg-gray-50 transition-colors">
                     <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-bold text-gray-900">{{ car.model }}</div>
                        <div class="text-xs text-gray-500 font-mono">{{ car.plate }}</div>
                     </td>
                     @if (isSuperAdmin()) { <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">{{ car.company }}</span></td> }
                     <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-bold rounded-full" [ngClass]="{'bg-green-100 text-green-800': car.status === 'AVAILABLE', 'bg-red-100 text-red-800': car.status === 'BUSY', 'bg-yellow-100 text-yellow-800': car.status === 'MAINTENANCE'}">
                           {{ car.status }}
                        </span>
                     </td>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <select #driverSelect (change)="assignDriver(car, driverSelect.value)" class="text-sm border-gray-300 rounded-md border p-1.5 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm cursor-pointer w-40">
                           <option value="" [selected]="!car.assignedDriverId">-- Non assigné --</option>
                           @for (driver of getDriversForCar(car, (drivers$ | async)); track driver.uid) { <option [value]="driver.uid" [selected]="car.assignedDriverId === driver.uid">{{ driver.displayName || driver.email }}</option> }
                        </select>
                     </td>
                     <td class="px-6 py-4 whitespace-nowrap text-right"><button (click)="deleteCar(car)" class="text-red-600 hover:text-red-900 text-xs font-bold border border-red-200 bg-red-50 px-2 py-1 rounded">Supprimer</button></td>
                   </tr>
                 }
              </tbody>
           </table>
        </div>
      </div>
    </div>
  `
})
export class CarManagerComponent {
  private carService = inject(CarService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private fb = inject(FormBuilder);

  adminProfile$ = this.authService.user$.pipe(
    switchMap(user => {
        if (!user) return of(null);
        if (user.email === 'admin@gmail.com') {
           // CORRECTION ICI : Ajout de displayName
           const superAdminProfile: UserProfile = {
               uid: user.uid,
               email: user.email,
               displayName: 'Super Admin', // <--- AJOUTÉ
               role: 'SUPER_ADMIN',
               company: 'System', 
               isActive: true,
               phoneNumber: '00000000',
               createdAt: new Date()
           };
           return of(superAdminProfile);
        }
        return this.authService.getUserProfile(user.uid);
    }),
    shareReplay(1)
  );
  
  companies = this.companyService.activeCompanies;
  isSuperAdmin = toSignal(this.adminProfile$.pipe(map(p => p?.role === 'SUPER_ADMIN' || p?.email === 'admin@gmail.com')), { initialValue: false });
  adminCompany = toSignal(this.adminProfile$.pipe(map(p => p?.company || null)));

  carsFiltered$ = combineLatest([this.carService.getCars(), this.adminProfile$.pipe(startWith(null))]).pipe(
    map(([cars, profile]) => {
      if (profile?.role === 'SUPER_ADMIN') return cars;
      if (!profile?.company) return [];
      return cars.filter(car => car.company === profile.company);
    })
  );

  drivers$ = combineLatest([this.userService.getAllUsers(), this.adminProfile$.pipe(startWith(null))]).pipe(
    map(([users, profile]) => {
      if (profile?.role === 'SUPER_ADMIN') return users.filter(u => u.role === 'DRIVER' && u.isActive);
      if (!profile?.company) return [];
      return users.filter(u => u.role === 'DRIVER' && u.isActive && u.company === profile.company);
    })
  );

  carForm = this.fb.group({ model: ['', Validators.required], plate: ['', Validators.required], company: [''] });

  getDriversForCar(car: Car, allDrivers: any[] | null): any[] {
    if (!allDrivers) return [];
    if (this.isSuperAdmin()) return allDrivers.filter(d => d.company === car.company);
    return allDrivers;
  }

  addCar() {
    let targetCompany = this.adminCompany();
    if (this.isSuperAdmin()) {
       targetCompany = this.carForm.value.company;
       if (!targetCompany) { alert("Sélectionnez une société."); return; }
    }
    if (!targetCompany || this.carForm.invalid) return;
    this.carService.addCar({ ...this.carForm.value, status: 'AVAILABLE', assignedDriverId: null, company: targetCompany } as any).then(() => {
      this.carForm.reset({ company: '' });
    });
  }

  assignDriver(car: Car, driverId: string) {
    if (!this.isSuperAdmin() && car.company !== this.adminCompany()) { alert("Non autorisé."); return; }
    this.carService.assignDriver(car.uid!, driverId || null);
  }
  
  deleteCar(car: Car) { if(confirm('Supprimer ?')) alert("Suppression à implémenter."); }
}
