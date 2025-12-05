import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { TripService, Trip } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { UserService } from '../../../core/services/user.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-trip-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">Gestion des Trajets</h2>
        <button (click)="showForm = !showForm" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
           {{ showForm ? 'Fermer' : 'Nouveau Trajet' }}
        </button>
      </div>

      <!-- Formulaire de création de trajet -->
      <div *ngIf="showForm" class="bg-white p-6 rounded-lg shadow-lg border border-indigo-100">
         <form [formGroup]="tripForm" (ngSubmit)="createTrip()">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <div>
                  <label class="block text-sm font-medium text-gray-700">Lieu de Départ</label>
                  <input formControlName="departure" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Destination</label>
                  <input formControlName="destination" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Date</label>
                  <input formControlName="date" type="date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               
               <!-- Sélection Voiture (affichera aussi le chauffeur lié) -->
               <div>
                  <label class="block text-sm font-medium text-gray-700">Véhicule (avec Chauffeur)</label>
                  <select formControlName="carId" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                     <option value="">-- Choisir un véhicule --</option>
                     @for (car of cars$ | async; track car.uid) {
                        <option [value]="car.uid">
                           {{ car.model }} ({{ car.plate }})
                        </option>
                     }
                  </select>
               </div>
            </div>

            <!-- Gestion des Colis (FormArray) -->
            <div class="mb-4">
               <div class="flex justify-between items-center mb-2">
                  <h4 class="text-sm font-bold text-gray-700">Liste des Colis</h4>
                  <button type="button" (click)="addParcel()" class="text-xs text-indigo-600 font-bold">+ Ajouter Colis</button>
               </div>
               
               <div formArrayName="parcels" class="space-y-2">
                  @for (parcel of parcels.controls; track i; let i = $index) {
                     <div [formGroupName]="i" class="flex gap-2 items-center bg-gray-50 p-2 rounded">
                        <input formControlName="description" placeholder="Desc" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="weight" type="number" placeholder="Kg" class="w-20 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="recipient" placeholder="Destinataire" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <button type="button" (click)="removeParcel(i)" class="text-red-500 text-xs">🗑️</button>
                     </div>
                  }
               </div>
            </div>

            <div class="flex justify-end">
               <button type="submit" [disabled]="tripForm.invalid" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-bold shadow-sm">
                  Valider le Trajet
               </button>
            </div>
         </form>
      </div>

      <!-- Liste des trajets existants -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
               <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trajet</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colis</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
               </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
               @for (trip of trips$ | async; track trip.uid) {
                  <tr>
                     <td class="px-6 py-4">
                        <div class="text-sm font-bold text-gray-900">{{ trip.departure }} ➝ {{ trip.destination }}</div>
                        <div class="text-xs text-gray-500">Véhicule ID: {{ trip.carId }}</div>
                     </td>
                     <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ trip.date }}</td>
                     <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ trip.parcels.length }} colis</td>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                           {{ trip.status }}
                        </span>
                     </td>
                  </tr>
               }
            </tbody>
         </table>
      </div>
    </div>
  `
})
export class TripManagerComponent {
  private fb = inject(FormBuilder);
  private tripService = inject(TripService);
  private carService = inject(CarService);
  
  showForm = false;
  
  cars$ = this.carService.getCars();
  trips$ = this.tripService.getTrips();

  tripForm = this.fb.group({
    departure: ['', Validators.required],
    destination: ['', Validators.required],
    date: ['', Validators.required],
    carId: ['', Validators.required],
    parcels: this.fb.array([])
  });

  get parcels() {
    return this.tripForm.get('parcels') as FormArray;
  }

  addParcel() {
    const parcelGroup = this.fb.group({
      description: ['', Validators.required],
      weight: [0, Validators.required],
      recipient: ['', Validators.required]
    });
    this.parcels.push(parcelGroup);
  }

  removeParcel(index: number) {
    this.parcels.removeAt(index);
  }

  createTrip() {
    if (this.tripForm.valid) {
      // Logique simplifiée: on suppose que le driverId est récupéré depuis la voiture
      // Dans une app réelle, il faudrait faire un lookup synchrone ou gérer l'état
      const formVal = this.tripForm.value;
      
      const newTrip: Trip = {
        departure: formVal.departure!,
        destination: formVal.destination!,
        date: formVal.date!,
        carId: formVal.carId!,
        driverId: 'PENDING_LOOKUP', // À améliorer avec RxJS combineLatest
        status: 'PENDING',
        parcels: formVal.parcels as any[]
      };

      this.tripService.createTrip(newTrip).then(() => {
        this.tripForm.reset();
        this.parcels.clear();
        this.showForm = false;
        alert('Trajet créé avec succès !');
      });
    }
  }
}
