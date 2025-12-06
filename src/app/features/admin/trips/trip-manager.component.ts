import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { TripService, Trip, GeoLocation, TripRequest } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyService } from '../../../core/services/company.service'; 
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs/operators';

@Component({
  selector: 'app-trip-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- AJOUT DE CLASS P-6 ICI -->
    <div class="space-y-6 p-6">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 class="text-2xl font-bold text-gray-800">Suivi des Trajets</h2>
           <p class="text-sm text-gray-500">Gérez la logistique et suivez les livraisons.</p>
        </div>
        <button (click)="toggleForm()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2">
           <span class="text-xl">{{ showForm ? '✕' : '+' }}</span>
           {{ showForm ? 'Fermer' : 'Nouveau Trajet' }}
        </button>
      </div>

      <!-- Filtres -->
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center" [formGroup]="filterForm">
         <div class="flex-1 w-full">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Société</label>
            <select formControlName="company" class="w-full border-gray-300 rounded-md shadow-sm border p-2 text-sm">
               <option value="">Toutes les sociétés</option>
               @for (company of activeCompanies(); track company.uid) {
                  <option [value]="company.name">{{ company.name }}</option>
               }
            </select>
         </div>
         <div class="flex-1 w-full">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Livraison</label>
            <div class="flex items-center gap-2 mt-2">
               <input type="checkbox" formControlName="inProgressOnly" id="inprogress" class="h-4 w-4 text-indigo-600 border-gray-300 rounded">
               <label for="inprogress" class="text-sm text-gray-700 font-medium">Uniquement "En cours"</label>
            </div>
         </div>
      </div>

      <!-- Formulaire Trajet -->
      <div *ngIf="showForm" class="bg-white p-6 rounded-lg shadow-xl border-l-4 border-indigo-500 animate-fade-in">
         <form [formGroup]="tripForm" (ngSubmit)="createTrip()">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <div>
                  <label class="block text-sm font-medium text-gray-700">Départ</label>
                  <input formControlName="departure" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Destination</label>
                  <input formControlName="destination" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Date/Heure</label>
                  <input formControlName="date" type="datetime-local" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Véhicule</label>
                  <select formControlName="carId" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                     <option value="">-- Sélectionner --</option>
                     @for (car of cars$ | async; track car.uid) {
                        <option [value]="car.uid">{{ car.model }} ({{ car.plate }})</option>
                     }
                  </select>
               </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
               <div class="flex justify-between items-center mb-2">
                  <h4 class="text-sm font-bold text-gray-700">📦 Chargement</h4>
                  <button type="button" (click)="addParcel()" class="text-xs text-indigo-600 font-bold">+ Colis</button>
               </div>
               <div formArrayName="parcels" class="space-y-2">
                  @for (parcel of parcels.controls; track i; let i = $index) {
                     <div [formGroupName]="i" class="flex flex-wrap md:flex-nowrap gap-2 items-center">
                        <input formControlName="description" placeholder="Desc" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="weight" type="number" placeholder="Kg" class="w-16 text-sm border-gray-300 rounded border p-1">
                        <input formControlName="recipient" placeholder="Client" class="flex-1 text-sm border-gray-300 rounded border p-1">
                        <button type="button" (click)="removeParcel(i)" class="text-red-500">×</button>
                     </div>
                  }
               </div>
            </div>

            <div class="flex justify-end gap-3">
               <button type="button" (click)="toggleForm()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md">Annuler</button>
               <button type="submit" [disabled]="tripForm.invalid" class="bg-green-600 text-white px-6 py-2 rounded-md font-bold shadow-sm disabled:opacity-50">Valider</button>
            </div>
         </form>
      </div>

      <!-- Liste Trajets -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
               <thead class="bg-gray-50">
                  <tr>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trajet & Société</th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                     <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
               </thead>
               <tbody class="bg-white divide-y divide-gray-200">
                  @for (trip of filteredTrips(); track trip.uid) {
                     <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4">
                           <div class="flex items-center">
                              <div class="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl mr-3">🚚</div>
                              <div>
                                 <div class="text-sm font-bold text-gray-900">{{ trip.departure }} ➝ {{ trip.destination }}</div>
                                 <div class="text-xs text-gray-500 font-medium">Soc: <span class="text-indigo-600">{{ trip.company }}</span></div>
                              </div>
                           </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                           <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                              [ngClass]="{'bg-yellow-100 text-yellow-800': trip.status === 'PENDING', 'bg-blue-100 text-blue-800': trip.status === 'IN_PROGRESS', 'bg-green-100 text-green-800': trip.status === 'COMPLETED'}">
                              {{ trip.status }}
                           </span>
                           <div *ngIf="trip.status === 'IN_PROGRESS' && trip.currentLocation" class="text-xs text-gray-500 mt-1">
                              📍 {{ trip.currentLocation.city }}
                           </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                           <div class="text-sm text-gray-900">{{ trip.date | date:'dd/MM HH:mm' }}</div>
                           <div class="text-xs text-gray-500">{{ trip.parcels.length }} Colis</div>
                           <div *ngIf="trip.extraRequests?.length" class="mt-1">
                              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                 +{{ trip.extraRequests?.length }} Demandes
                              </span>
                           </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                           <button (click)="openRequestModal(trip)" class="text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">➕ Demande</button>
                           <button (click)="handleTrackClick(trip, $event)" class="text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">📍 {{ trip.status === 'PENDING' ? 'Voir' : 'Suivre' }}</button>
                           <button (click)="deleteTrip(trip)" class="text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100">🗑️</button>
                        </td>
                     </tr>
                  } @empty {
                     <tr><td colspan="4" class="p-6 text-center text-gray-500">Aucun trajet trouvé.</td></tr>
                  }
               </tbody>
            </table>
         </div>
      </div>
      <!-- Modales (simplifiées) -->
    </div>
  `
})
export class TripManagerComponent {
  private fb = inject(FormBuilder);
  private tripService = inject(TripService);
  private carService = inject(CarService);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  
  showForm = false;
  selectedTripForRequest: Trip | null = null;
  cars$ = this.carService.getCars();
  private rawTrips = toSignal(this.tripService.getTrips(), { initialValue: [] });
  private currentUser = toSignal(this.authService.user$);
  activeCompanies = this.companyService.activeCompanies;

  // FORMULAIRE DE FILTRE REACTIF
  filterForm = this.fb.group({
    company: [''],
    inProgressOnly: [false]
  });

  // Signal dérivé des changements du formulaire
  filterValues = toSignal(this.filterForm.valueChanges.pipe(
    startWith(this.filterForm.value)
  ), { initialValue: this.filterForm.value });

  tripForm = this.fb.group({
    departure: ['', Validators.required],
    destination: ['', Validators.required],
    date: ['', Validators.required],
    carId: ['', Validators.required],
    parcels: this.fb.array([])
  });

  // Filter Logic corrigée
  filteredTrips = computed(() => {
    const trips = this.rawTrips();
    const filters = this.filterValues();
    
    return trips.filter(t => {
       const matchesCompany = !filters?.company || t.company === filters.company;
       const matchesStatus = filters?.inProgressOnly ? t.status === 'IN_PROGRESS' : true;
       return matchesCompany && matchesStatus;
    });
  });

  // ... (Méthodes helpers conservées)
  private refreshSignal = signal(0); 
  get parcels() { return this.tripForm.get('parcels') as FormArray; }
  toggleForm() { this.showForm = !this.showForm; }
  addParcel() { this.parcels.push(this.fb.group({ description: ['', Validators.required], weight: [0], recipient: [''] })); }
  removeParcel(index: number) { this.parcels.removeAt(index); }
  async createTrip() { /* ... */ }
  async deleteTrip(trip: Trip) { /* ... */ }
  openRequestModal(trip: Trip) { /* ... */ }
  async handleTrackClick(trip: Trip, event: Event) { /* ... */ }
}
