import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
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
        <button (click)="toggleForm()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md transition-colors">
           {{ showForm ? 'Fermer' : 'Nouveau Trajet' }}
        </button>
      </div>

      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200" [formGroup]="filterForm">
         <select formControlName="company" class="w-full border-gray-300 rounded-md shadow-sm border p-2 text-sm bg-gray-50">
            <option value="">Toutes les sociétés</option>
            @for (company of activeCompanies(); track company.uid) {
               <option [value]="company.name">{{ company.name }}</option>
            }
         </select>
      </div>

      <div *ngIf="showForm" class="bg-white p-6 rounded-lg shadow-xl border-l-4 border-indigo-500 mb-6 animate-fade-in">
         <form [formGroup]="tripForm" (ngSubmit)="createTrip()">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Départ</label><input formControlName="departure" class="w-full border p-2 rounded"></div>
               <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label><input formControlName="destination" class="w-full border p-2 rounded"></div>
               <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Véhicule</label>
                  <select formControlName="carId" class="w-full border p-2 rounded">
                     <option value="">-- Choisir --</option>
                     @for (car of cars$ | async; track car.uid) { <option [value]="car.uid">{{ car.model }} ({{ car.plate }})</option> }
                  </select>
               </div>
            </div>
            <button type="submit" [disabled]="tripForm.invalid" class="bg-green-600 text-white px-6 py-2 rounded font-bold w-full md:w-auto">Valider</button>
         </form>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
               <thead class="bg-gray-50">
                  <tr>
                     <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trajet</th>
                     <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                     <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Chauffeur</th>
                     <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
               </thead>
               <tbody class="bg-white divide-y divide-gray-200">
                  @for (trip of filteredTrips(); track trip.uid) {
                     <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4">
                           <div class="flex flex-col">
                              <span class="text-sm font-bold text-gray-900">{{ trip.departure }} ➝ {{ trip.destination }}</span>
                              <span class="text-xs text-gray-500">{{ trip.company }}</span>
                              <span class="text-xs text-gray-400 mt-1">{{ trip.date | date:'dd/MM HH:mm' }}</span>
                           </div>
                        </td>

                        <td class="px-6 py-4 whitespace-nowrap">
                           <span class="px-2 py-1 text-xs font-bold rounded-full" 
                                 [ngClass]="{'bg-blue-100 text-blue-800': trip.status === 'IN_PROGRESS', 'bg-green-100 text-green-800': trip.status === 'COMPLETED', 'bg-yellow-100 text-yellow-800': trip.status === 'PENDING'}">
                              {{ trip.status }}
                           </span>
                        </td>
                        
                        <td class="px-6 py-4 whitespace-nowrap">
                           <div class="flex items-center gap-3">
                              <div *ngIf="trip.driverEmail; else noDriver" class="flex items-center gap-2">
                                 <div>
                                    <div class="text-sm font-medium text-gray-900">{{ trip.driverEmail }}</div>
                                    <div class="text-xs text-gray-500">{{ trip.driverPhone || 'Tél inconnu' }}</div>
                                 </div>
                                 
                                 <button *ngIf="trip.driverProfile" (click)="openChat(trip.driverProfile)" 
                                         class="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors shadow-sm" 
                                         title="Ouvrir le Chat">
                                    💬
                                 </button>
                              </div>
                              <ng-template #noDriver>
                                 <span class="text-xs text-gray-400 italic bg-gray-100 px-2 py-1 rounded">Non assigné</span>
                              </ng-template>
                           </div>
                        </td>

                        <td class="px-6 py-4 text-right whitespace-nowrap">
                           <div class="flex justify-end items-center gap-2">
                              
                              <button (click)="openRequestModal(trip)" 
                                      class="p-2 text-xs font-medium bg-purple-50 text-purple-700 rounded hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1"
                                      title="Ajouter une demande">
                                 ➕ <span class="hidden xl:inline">Demande</span>
                              </button>
                              
                              <button (click)="handleTrackClick(trip)" 
                                      class="p-2 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
                                      title="Voir sur la carte">
                                 📍 <span class="hidden xl:inline">Suivre</span>
                              </button>
                              
                              <button (click)="deleteTrip(trip)" 
                                      class="p-2 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1"
                                      title="Supprimer le trajet">
                                 🗑️ <span class="hidden xl:inline">Suppr.</span>
                              </button>

                           </div>
                        </td>
                     </tr>
                  } @empty {
                     <tr><td colspan="4" class="p-8 text-center text-gray-500">Aucun trajet trouvé.</td></tr>
                  }
               </tbody>
            </table>
         </div>
      </div>

      <div *ngIf="selectedTripForRequest" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up">
             <h3 class="font-bold text-lg mb-4 text-gray-800">Ajouter une demande</h3>
             <form [formGroup]="requestForm" (ngSubmit)="submitRequest()">
                <div class="mb-4">
                   <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                   <select formControlName="type" class="w-full border-gray-300 rounded-md shadow-sm border p-2 bg-gray-50">
                      <option value="PARCEL">📦 Colis supplémentaire</option>
                      <option value="PASSENGER">🙋 Passager</option>
                   </select>
                </div>
                <div class="mb-4">
                   <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                   <textarea formControlName="description" rows="3" class="w-full border-gray-300 rounded-md shadow-sm border p-2 bg-gray-50" placeholder="Détails..."></textarea>
                </div>
                <div class="flex justify-end gap-3 pt-2">
                   <button type="button" (click)="closeRequestModal()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Annuler</button>
                   <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">Envoyer</button>
                </div>
             </form>
          </div>
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
  selectedTripForRequest: Trip | null = null;
  cars$ = this.carService.getCars();
  private currentUser = toSignal(this.authService.user$);
  activeCompanies = this.companyService.activeCompanies;
  
  filterForm = this.fb.group({ company: [''], inProgressOnly: [false] });
  filterValues = toSignal(this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)), { initialValue: this.filterForm.value });

  tripForm = this.fb.group({
    departure: ['', Validators.required],
    destination: ['', Validators.required],
    date: ['', Validators.required],
    carId: ['', Validators.required],
    parcels: this.fb.array([])
  });

  requestForm = this.fb.group({
    type: ['PARCEL', Validators.required],
    description: ['', Validators.required]
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
             driverPhone: driver ? driver.phoneNumber : null,
             driverProfile: driver
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
  
  async createTrip() { 
    if (this.tripForm.valid) { 
      await this.tripService.createTrip({ 
        ...this.tripForm.value, 
        driverId: 'PENDING', 
        status: 'PENDING', 
        company: 'DHL', // Par défaut pour l'exemple
        parcels: [], 
        extraRequests: [] 
      } as any); 
      this.tripForm.reset(); 
      this.showForm = false; 
    } 
  }
  
  async deleteTrip(trip: Trip) { 
    if (confirm(`Supprimer ce trajet vers ${trip.destination} ?`)) {
      await this.tripService.deleteTrip(trip.uid!); 
    }
  }
  
  openRequestModal(trip: Trip) { this.selectedTripForRequest = trip; this.requestForm.reset({ type: 'PARCEL' }); }
  closeRequestModal() { this.selectedTripForRequest = null; }
  
  async submitRequest() { 
    if (this.requestForm.valid && this.selectedTripForRequest) { 
      await this.tripService.addRequest(this.selectedTripForRequest.uid!, { 
        ...this.requestForm.value, 
        requesterName: 'Admin', 
        requesterEmail: 'admin@gmail.com', 
        status: 'PENDING', 
        createdAt: new Date().toISOString() 
      } as any); 
      this.closeRequestModal(); 
      alert('Demande ajoutée !');
    } 
  }

  openChat(user: UserProfile) {
    this.chatService.startChatWith(user);
    this.router.navigate(['/admin/chat']);
  }

  handleTrackClick(trip: Trip) {
     const url = `https://www.google.com/maps/dir/?api=1&origin=$?q=${encodeURIComponent(trip.departure)}&destination=${encodeURIComponent(trip.destination)}&travelmode=driving`;
     window.open(url, '_blank');
  }
}
