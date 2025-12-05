import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarService, Car } from '../../../core/services/car.service';
import { UserService } from '../../../core/services/user.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-car-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Formulaire Ajout -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Nouvelle Voiture</h3>
        <form [formGroup]="carForm" (ngSubmit)="addCar()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Modèle</label>
            <input formControlName="model" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="Ex: Renault Master">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Plaque</label>
            <input formControlName="plate" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="AA-123-BB">
          </div>
          <button type="submit" [disabled]="carForm.invalid" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50">Ajouter</button>
        </form>
      </div>

      <!-- Liste des Voitures & Affectation -->
      <div class="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
           <h3 class="text-lg font-bold text-gray-800">Flotte de Véhicules</h3>
        </div>
        <div class="overflow-x-auto">
           <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Véhicule</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur Affecté</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (car of cars$ | async; track car.uid) {
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
                        <div class="flex items-center space-x-2">
                           <select #driverSelect (change)="assignDriver(car, driverSelect.value)" class="text-sm border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-1">
                              <option value="" [selected]="!car.assignedDriverId">-- Disponible --</option>
                              @for (driver of drivers$ | async; track driver.uid) {
                                 <option [value]="driver.uid" [selected]="car.assignedDriverId === driver.uid">
                                    {{ driver.email }}
                                 </option>
                              }
                           </select>
                        </div>
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
  private fb = inject(FormBuilder);

  cars$ = this.carService.getCars();
  // On ne récupère que les chauffeurs actifs
  drivers$ = this.userService.getAllUsers().pipe(
    map(users => users.filter(u => u.role === 'DRIVER' && u.isActive))
  );

  carForm = this.fb.group({
    model: ['', Validators.required],
    plate: ['', Validators.required]
  });

  addCar() {
    if (this.carForm.valid) {
      const newCar: Car = {
        ...this.carForm.value as any,
        status: 'AVAILABLE',
        assignedDriverId: null
      };
      this.carService.addCar(newCar).then(() => {
        this.carForm.reset();
        alert('Véhicule ajouté !');
      });
    }
  }

  assignDriver(car: Car, driverId: string) {
    this.carService.assignDriver(car.uid!, driverId || null);
  }
}
