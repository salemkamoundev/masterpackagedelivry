import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarService, Car } from '../../../core/services/car.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Observable, combineLatest, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-car-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Info Admin -->
      <div class="lg:col-span-3 bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-4">
        <p class="text-sm font-semibold text-indigo-800">
          Gestion pour la société : 
          <span class="font-bold text-indigo-900">{{ adminCompany() || 'Chargement...' }}</span>
        </p>
      </div>

      <!-- Formulaire -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Ajouter un Véhicule</h3>
        <form [formGroup]="carForm" (ngSubmit)="addCar()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Modèle</label>
            <input formControlName="model" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="Ex: Renault Kangoo">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Plaque</label>
            <input formControlName="plate" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="123 TN 4567">
          </div>
          <button type="submit" [disabled]="carForm.invalid || !adminCompany()" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50">
             Ajouter à {{ adminCompany() }}
          </button>
        </form>
      </div>

      <!-- Liste -->
      <div class="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
           <h3 class="text-lg font-bold text-gray-800">Flotte {{ adminCompany() }}</h3>
        </div>
        
        <div *ngIf="(carsFiltered$ | async)?.length === 0" class="p-6 text-center text-gray-500">
           Aucun véhicule trouvé.
        </div>

        <div class="overflow-x-auto" *ngIf="(carsFiltered$ | async)?.length ?? 0 > 0">
           <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Véhicule</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (car of carsFiltered$ | async; track car.uid) {
                   <tr>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-bold text-gray-900">{{ car.model }}</div>
                        <div class="text-xs text-gray-500">{{ car.plate }}</div>
                     </td>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                           [ngClass]="{'bg-green-100 text-green-800': car.status === 'AVAILABLE', 'bg-red-100 text-red-800': car.status === 'BUSY'}">
                           {{ car.status }}
                        </span>
                     </td>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <select #driverSelect (change)="assignDriver(car, driverSelect.value)" class="text-sm border-gray-300 rounded border p-1">
                           <option value="" [selected]="!car.assignedDriverId">-- Disponible --</option>
                           @for (driver of drivers$ | async; track driver.uid) {
                              <option [value]="driver.uid" [selected]="car.assignedDriverId === driver.uid">
                                 {{ driver.email }}
                              </option>
                           }
                        </select>
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
export class CarManagerComponent {
  private carService = inject(CarService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Gestion robuste de l'utilisateur connecté avec switchMap pour éviter l'erreur TS2533
  adminProfile$ = this.authService.user$.pipe(
    switchMap(user => user ? this.authService.getUserProfile(user.uid) : of(null))
  );
  
  // Signal pour l'affichage dans le template
  adminCompany = toSignal(this.adminProfile$.pipe(map(p => p?.company || null)));

  // Filtre des voitures : on ne montre que celles de la société de l'admin
  carsFiltered$ = combineLatest([this.carService.getCars(), this.adminProfile$]).pipe(
    map(([cars, profile]) => {
      if (!profile?.company) return [];
      return cars.filter(car => car.company === profile.company);
    })
  );

  // Filtre des chauffeurs : on ne montre que ceux de la société de l'admin
  drivers$ = combineLatest([this.userService.getAllUsers(), this.adminProfile$]).pipe(
    map(([users, profile]) => {
      if (!profile?.company) return [];
      return users.filter(u => u.role === 'DRIVER' && u.isActive && u.company === profile.company);
    })
  );

  carForm = this.fb.group({
    model: ['', Validators.required],
    plate: ['', Validators.required]
  });

  addCar() {
    const company = this.adminCompany();
    if (!company || this.carForm.invalid) return;

    const newCar: Car = {
      ...this.carForm.value as any,
      status: 'AVAILABLE',
      assignedDriverId: null,
      company: company // Sécurité: on force la société de l'admin
    };
    this.carService.addCar(newCar).then(() => {
      this.carForm.reset();
      alert('Véhicule ajouté !');
    });
  }

  assignDriver(car: Car, driverId: string) {
    // Sécurité supplémentaire côté client
    if (car.company !== this.adminCompany()) {
       alert("Action non autorisée sur ce véhicule.");
       return;
    }
    this.carService.assignDriver(car.uid!, driverId || null);
  }
}
