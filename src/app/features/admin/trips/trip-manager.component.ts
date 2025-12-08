import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router'; // Navigation
import { TripService, Trip, TripRequest } from '../../../core/services/trip.service';
import { CarService, Car } from '../../../core/services/car.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { CompanyService } from '../../../core/services/company.service'; 
import { UserService } from '../../../core/services/user.service';
import { ChatService } from '../../../core/services/chat.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-trip-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 p-6">
      <div class="flex justify-between items-center gap-4">
        <h2 class="text-2xl font-bold text-gray-800">Suivi des Trajets</h2>
        <button (click)="toggleForm()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700">
           {{ showForm ? 'Fermer' : 'Nouveau Trajet' }}
        </button>
      </div>

      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center" [formGroup]="filterForm">
         <div class="flex-1 w-full">
            <select formControlName="company" class="w-full border-gray-300 rounded-md shadow-sm border p-2 text-sm">
               <option value="">Toutes les sociétés</option>
               @for (company of activeCompanies(); track company.uid) {
                  <option [value]="company.name">{{ company.name }}</option>
               }
            </select>
         </div>
      </div>

      <div *ngIf="showForm" class="bg-white p-6 rounded-lg shadow-xl border-l-4 border-indigo-500 mb-6">
         <form [formGroup]="tripForm" (ngSubmit)="createTrip()">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <div><label class="block text-sm text-gray-700">Départ</label><input formControlName="departure" type="text" class="w-full border p-2 rounded"></div>
               <div><label class="block text-sm text-gray-700">Destination</label><input formControlName="destination" type="text" class="w-full border p-2 rounded"></div>
               <div><label class="block text-sm text-gray-700">Date</label><input formControlName="date" type="datetime-local" class="w-full border p-2 rounded"></div>
               <div>
                  <label class="block text-sm text-gray-700">Véhicule</label>
                  <select formControlName="carId" class="w-full border p-2 rounded">
                     <option value="">-- Sélectionner --</option>
                     @for (car of cars$ | async; track car.uid) {
                        <option [value]="car.uid">{{ car.model }} ({{ car.plate }})</option>
                     }
                  </select>
               </div>
            </div>
            <button type="submit" [disabled]="tripForm.invalid" class="bg-green-600 text-white px-6 py-2 rounded font-bold">Valider</button>
         </form>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
               <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trajet</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
               </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
               @for (trip of filteredTrips(); track trip.uid) {
                  <tr class="hover:bg-gray-50">
                     <td class="px-6 py-4">
                        <div class="text-sm font-bold">{{ trip.departure }} ➝ {{ trip.destination }}</div>
                        <div class="text-xs text-gray-500">{{ trip.company }}</div>
                     </td>
                     <td class="px-6 py-4">
                        <span class="px-2 py-0.5 text-[10px] rounded-full inline-block" 
                              [ngClass]="{'bg-blue-100 text-blue-800': trip.status === 'IN_PROGRESS', 'bg-green-100 text-green-800': trip.status === 'COMPLETED', 'bg-yellow-100 text-yellow-800': trip.status === 'PENDING'}">
                           {{ trip.status }}
                        </span>
                     </td>
                     
                     <td class="px-6 py-4 text-sm">
                        <div *ngIf="trip.driverEmail" class="flex items-center gap-2">
                           <span class="font-medium text-gray-900">{{ trip.driverEmail }}</span>
                           
                           <button *ngIf="trip.driverProfile" (click)="openChat(trip.driverProfile)" 
                                   class="text-indigo-600 hover:bg-indigo-100 p-1.5 rounded-full transition-colors" 
                                   title="Ouvrir le chat">
                              💬
                           </button>

                        </div>
                        <div *ngIf="!trip.driverEmail" class="text-gray-400 italic text-xs">Non assigné</div>
                     </td>

                     <td class="px-6 py-4 text-right flex flex-col gap-2 items-end">
                        <button (click)="deleteTrip(trip)" class="text-xs text-red-600 hover:underline">Supprimer</button>
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
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private userService = inject(UserService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  
  showForm = false;
  cars$ = this.carService.getCars();
  private currentUser = toSignal(this.authService.user$);
  activeCompanies = this.companyService.activeCompanies;
  
  filterForm = this.fb.group({ company: [''], inProgressOnly: [false] });
  filterValues = toSignal(this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)), { initialValue: this.filterForm.value });

  tripForm = this.fb.group({
    departure: ['', Validators.required],
    destination: ['', Validators.required],
    date: ['', Validators.required],
    carId: ['', Validators.required]
  });

  private enrichedTrips$ = combineLatest([
    this.tripService.getTrips(),
    this.userService.getAllUsers(),
    this.carService.getCars()
  ]).pipe(
    map(([trips, users, cars]: [Trip[], UserProfile[], Car[]]) => {
       return trips.map((trip: Trip) => {
          let driver = users.find((u: UserProfile) => u.uid === trip.driverId);
          if (!driver && trip.carId) {
             const car = cars.find((c: Car) => c.uid === trip.carId);
             if (car && car.assignedDriverId) {
                driver = users.find((u: UserProfile) => u.uid === car.assignedDriverId);
             }
          }
          return {
             ...trip,
             driverEmail: driver ? driver.email : null,
             driverProfile: driver // PROFILE COMPLET REQUIS POUR LE CHAT
          };
       });
    })
  );

  private enrichedRawTrips = toSignal(this.enrichedTrips$, { initialValue: [] });

  filteredTrips = computed(() => {
    const trips = this.enrichedRawTrips();
    const filters = this.filterValues();
    return trips.filter((t: any) => {
       const matchesCompany = !filters?.company || t.company === filters.company;
       const matchesStatus = filters?.inProgressOnly ? t.status === 'IN_PROGRESS' : true;
       return matchesCompany && matchesStatus;
    });
  });
  
  toggleForm() { this.showForm = !this.showForm; }
  async createTrip() { if (this.tripForm.valid) { await this.tripService.createTrip({ ...this.tripForm.value, driverId: 'PENDING', status: 'PENDING', company: 'DHL', parcels: [], extraRequests: [] } as any); this.tripForm.reset(); this.showForm = false; } }
  async deleteTrip(trip: Trip) { if (confirm(`Supprimer ?`)) await this.tripService.deleteTrip(trip.uid!); }

  // NAVIGATION VERS LA PAGE CHAT
  openChat(user: UserProfile) {
    this.chatService.startChatWith(user);
    this.router.navigate(['/admin/chat']);
  }
}
