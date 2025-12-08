import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { TripService, Trip } from '../../../core/services/trip.service';
import { CarService, Car } from '../../../core/services/car.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { CompanyService } from '../../../core/services/company.service';
import { UserService } from '../../../core/services/user.service';
import { ChatService } from '../../../core/services/chat.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, map, switchMap, shareReplay } from 'rxjs/operators';
import { combineLatest, of } from 'rxjs';

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
         <h3 class="text-lg font-bold text-gray-800 mb-4">Créer un nouveau trajet</h3>
         
         <form [formGroup]="tripForm" (ngSubmit)="createTrip()">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
               <div>
                 <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Départ</label>
                 <input formControlName="departure" placeholder="Ville de départ" class="w-full border p-2 rounded focus:ring-indigo-500">
               </div>
               <div>
                 <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
                 <input formControlName="destination" placeholder="Ville d'arrivée" class="w-full border p-2 rounded focus:ring-indigo-500">
               </div>
               <div>
                 <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                 <input type="datetime-local" formControlName="date" class="w-full border p-2 rounded focus:ring-indigo-500">
               </div>
               <div>
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Véhicule</label>
                  <select formControlName="carId" class="w-full border p-2 rounded bg-white">
                     <option value="">-- Choisir --</option>
                     @for (car of cars$ | async; track car.uid) { 
                       <option [value]="car.uid">{{ car.model }} ({{ car.plate }})</option> 
                     }
                  </select>
               </div>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
               <div class="flex justify-between items-center mb-4">
                  <h4 class="font-bold text-gray-700 flex items-center gap-2">📦 Liste des Colis ({{ parcelsArray.length }})</h4>
                  <button type="button" (click)="addParcel()" class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold hover:bg-green-200 border border-green-200">
                    + Ajouter Colis
                  </button>
               </div>

               <div formArrayName="parcels" class="space-y-3">
                  @for (parcel of parcelsArray.controls; track $index) {
                    <div [formGroupName]="$index" class="bg-white p-3 rounded shadow-sm border border-gray-200 flex flex-col md:flex-row gap-3 items-start md:items-center relative group">
                       <div class="absolute -left-2 -top-2 bg-indigo-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                         {{ $index + 1 }}
                       </div>
                       <div class="flex-1 w-full"><input formControlName="description" placeholder="Désignation" class="w-full text-sm border-gray-300 rounded p-1.5 border"></div>
                       <div class="w-full md:w-32"><input formControlName="recipientName" placeholder="Nom Client" class="w-full text-sm border-gray-300 rounded p-1.5 border"></div>
                       <div class="w-full md:w-32"><input formControlName="recipientPhone" placeholder="Tél" class="w-full text-sm border-gray-300 rounded p-1.5 border"></div>
                       <div class="flex-1 w-full"><input formControlName="recipientAddress" placeholder="Adresse" class="w-full text-sm border-gray-300 rounded p-1.5 border"></div>
                       <div class="w-full md:w-20"><input type="number" formControlName="weight" placeholder="Kg" class="w-full text-sm border-gray-300 rounded p-1.5 border"></div>
                       <button type="button" (click)="removeParcel($index)" class="text-red-500 hover:text-red-700 font-bold px-2">✕</button>
                    </div>
                  }
               </div>
            </div>

            <div class="flex justify-end">
               <button type="submit" [disabled]="tripForm.invalid" class="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                 Valider le Trajet
               </button>
            </div>
         </form>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
               <thead class="bg-gray-50">
                  <tr>
                     <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trajet</th>
                     <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Colis</th>
                     <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Statut</th>
                     <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Chauffeur</th>
                     <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
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
                        <td class="px-6 py-4">
                           <div class="text-xs space-y-1">
                              @for (parcel of trip.parcels; track $index) {
                                <div class="flex items-center gap-1">
                                  <span [class]="parcel.delivered ? 'text-green-600' : 'text-gray-600'">{{ parcel.delivered ? '✅' : '📦' }}</span>
                                  <span class="font-medium">{{ parcel.description }}</span>
                                </div>
                              }
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
                                 <button *ngIf="trip.driverProfile" (click)="openChat(trip.driverProfile)" class="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 shadow-sm">💬</button>
                              </div>
                              <ng-template #noDriver><span class="text-xs text-gray-400 italic bg-gray-100 px-2 py-1 rounded">Non assigné</span></ng-template>
                           </div>
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                           <div class="flex justify-end items-center gap-2">
                              <button (click)="openRequestModal(trip)" class="p-2 text-xs font-medium bg-purple-50 text-purple-700 rounded hover:bg-purple-100 border border-purple-200">➕</button>
                              <button (click)="handleTrackClick(trip)" class="p-2 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200">📍</button>
                              <button (click)="deleteTrip(trip)" class="p-2 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">🗑️</button>
                           </div>
                        </td>
                     </tr>
                  } @empty {
                     <tr><td colspan="5" class="p-8 text-center text-gray-500">Aucun trajet trouvé.</td></tr>
                  }
               </tbody>
            </table>
         </div>
      </div>

      <div *ngIf="selectedTripForRequest" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl animate-fade-in-up my-auto max-h-[90vh] overflow-y-auto">
             <h3 class="font-bold text-xl mb-4 text-gray-800 border-b pb-2">Ajouter des colis supplémentaires</h3>
             
             <form [formGroup]="requestForm" (ngSubmit)="submitRequest()">
                
                <div class="mb-4">
                   <label class="block text-sm font-medium text-gray-700 mb-1">Type de demande</label>
                   <select formControlName="type" class="w-full border-gray-300 rounded-md shadow-sm border p-2 bg-gray-50 font-bold">
                      <option value="PARCEL">📦 Ajout de Colis</option>
                      <option value="PASSENGER">🙋 Ajout de Passager</option>
                   </select>
                </div>

                <div *ngIf="requestForm.get('type')?.value === 'PASSENGER'" class="mb-4">
                   <label class="block text-sm font-medium text-gray-700 mb-1">Détails Passager</label>
                   <textarea formControlName="description" rows="3" class="w-full border-gray-300 rounded-md shadow-sm border p-2 bg-gray-50" placeholder="Nom, contact..."></textarea>
                </div>

                <div *ngIf="requestForm.get('type')?.value === 'PARCEL'" class="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                   <div class="flex justify-between items-center mb-3">
                      <label class="block text-sm font-bold text-indigo-900">Liste des Colis à ajouter</label>
                      <button type="button" (click)="addRequestParcel()" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full font-bold hover:bg-indigo-700 shadow-sm">
                        + Ajouter Colis
                      </button>
                   </div>

                   <div formArrayName="parcels" class="space-y-3">
                      @for (parcel of requestParcelsArray.controls; track $index) {
                         <div [formGroupName]="$index" class="bg-white p-3 rounded shadow-sm border border-indigo-100 relative grid grid-cols-1 md:grid-cols-2 gap-2">
                             
                             <div class="absolute right-2 top-2">
                                <button type="button" (click)="removeRequestParcel($index)" class="text-red-400 hover:text-red-600 font-bold">✕</button>
                             </div>
                             
                             <div class="col-span-1 md:col-span-2">
                               <label class="text-[10px] text-gray-500 uppercase font-bold">Désignation</label>
                               <input formControlName="description" placeholder="Ex: Documents Banque" class="w-full text-sm border-gray-300 rounded p-1 border">
                             </div>
                             
                             <div>
                               <label class="text-[10px] text-gray-500 uppercase font-bold">Nom Client</label>
                               <input formControlName="recipientName" placeholder="Nom" class="w-full text-sm border-gray-300 rounded p-1 border">
                             </div>
                             
                             <div>
                               <label class="text-[10px] text-gray-500 uppercase font-bold">Téléphone</label>
                               <input formControlName="recipientPhone" placeholder="Tél" class="w-full text-sm border-gray-300 rounded p-1 border">
                             </div>
                             
                             <div class="col-span-1 md:col-span-2">
                               <label class="text-[10px] text-gray-500 uppercase font-bold">Adresse Complète</label>
                               <input formControlName="recipientAddress" placeholder="Adresse de livraison" class="w-full text-sm border-gray-300 rounded p-1 border">
                             </div>

                             <div class="md:col-span-1">
                               <label class="text-[10px] text-gray-500 uppercase font-bold">Poids (Kg)</label>
                               <input type="number" formControlName="weight" class="w-full text-sm border-gray-300 rounded p-1 border">
                             </div>
                         </div>
                      }
                      @if (requestParcelsArray.length === 0) {
                        <div class="text-center text-gray-400 text-sm py-2">Aucun colis dans la demande.</div>
                      }
                   </div>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t">
                   <button type="button" (click)="closeRequestModal()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Annuler</button>
                   <button type="submit" [disabled]="requestForm.invalid" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md font-bold disabled:opacity-50">
                     Envoyer la demande
                   </button>
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
  cars$ = this.carService.getCars();
  activeCompanies = this.companyService.activeCompanies;
  selectedTripForRequest: Trip | null = null;
  
  adminProfile$ = this.authService.user$.pipe(
    switchMap(user => {
        if (user?.email === 'admin@gmail.com') return of({ uid: user.uid, email: user.email, role: 'SUPER_ADMIN', company: 'System' } as UserProfile);
        return user ? this.authService.getUserProfile(user.uid) : of(null);
    }),
    shareReplay(1)
  );

  adminCompany = toSignal(this.adminProfile$.pipe(map(p => p?.company || null)));
  filterForm = this.fb.group({ company: [''], inProgressOnly: [false] });
  filterValues = toSignal(this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)), { initialValue: this.filterForm.value });

  tripForm = this.fb.group({
    departure: ['', Validators.required],
    destination: ['', Validators.required],
    date: ['', Validators.required],
    carId: ['', Validators.required],
    parcels: this.fb.array([]) 
  });

  get parcelsArray() { return this.tripForm.get('parcels') as FormArray; }

  addParcel() {
    this.parcelsArray.push(this.createParcelGroup());
  }
  removeParcel(index: number) { this.parcelsArray.removeAt(index); }

  requestForm = this.fb.group({
    type: ['PARCEL', Validators.required],
    description: [''], 
    parcels: this.fb.array([]) 
  });

  get requestParcelsArray() { return this.requestForm.get('parcels') as FormArray; }

  private createParcelGroup(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      recipientName: ['', Validators.required],
      recipientPhone: ['', Validators.required],
      recipientAddress: ['', Validators.required],
      weight: [1, [Validators.required, Validators.min(0.1)]],
      delivered: [false]
    });
  }

  addRequestParcel() {
    this.requestParcelsArray.push(this.createParcelGroup());
  }

  removeRequestParcel(index: number) {
    this.requestParcelsArray.removeAt(index);
  }

  openRequestModal(trip: Trip) {
    this.selectedTripForRequest = trip;
    this.requestForm.reset({ type: 'PARCEL', description: '' });
    this.requestParcelsArray.clear();
    this.addRequestParcel();
  }

  closeRequestModal() {
    this.selectedTripForRequest = null;
  }

  async submitRequest() {
    if (this.requestForm.valid && this.selectedTripForRequest) {
      const formValue = this.requestForm.value;
      
      const requestData: any = {
        type: formValue.type,
        status: 'PENDING',
        requesterName: 'Admin', 
        requesterEmail: 'admin@gmail.com', 
        createdAt: new Date().toISOString()
      };

      if (formValue.type === 'PARCEL') {
         // CORRECTION TS: Utilisation de la coalescence nulle (?? [])
         const parcels = formValue.parcels ?? [];
         requestData.parcels = parcels; 
         requestData.description = `${parcels.length} colis ajoutés`;
      } else {
         requestData.description = formValue.description;
      }

      await this.tripService.addRequest(this.selectedTripForRequest.uid!, requestData);
      this.closeRequestModal();
      alert('Demande envoyée au chauffeur !');
    }
  }

  private enrichedTrips$ = combineLatest([this.tripService.getTrips(), this.userService.getAllUsers(), this.carService.getCars()]).pipe(
    map(([trips, users, cars]) => {
       return trips.map((trip: any) => {
          let driver = users.find(u => u.uid === trip.driverId);
          if (!driver && trip.carId) {
             const car = cars.find(c => c.uid === trip.carId);
             if (car && car.assignedDriverId) driver = users.find(u => u.uid === car.assignedDriverId);
          }
          return { ...trip, driverEmail: driver ? driver.email : null, driverPhone: driver ? driver.phoneNumber : null, driverProfile: driver };
       });
    })
  );
  private enrichedRawTrips = toSignal(this.enrichedTrips$, { initialValue: [] });
  filteredTrips = computed(() => {
    const trips = this.enrichedRawTrips();
    const filters = this.filterValues();
    const myCompany = this.adminCompany();
    const isAdmin = myCompany === 'System' || !myCompany; 
    return trips.filter((t: any) => {
       if (!isAdmin && t.company !== myCompany) return false;
       return (!filters?.company || t.company === filters.company) && (!filters?.inProgressOnly || t.status === 'IN_PROGRESS');
    });
  });

  toggleForm() { this.showForm = !this.showForm; }
  async createTrip() { 
    if (this.tripForm.valid) { 
      const company = this.adminCompany() === 'System' ? 'Tunisia Express' : this.adminCompany(); 
      await this.tripService.createTrip({ ...this.tripForm.value, driverId: 'PENDING', status: 'PENDING', company: company || 'Unknown', extraRequests: [] } as any);
      this.tripForm.reset(); this.parcelsArray.clear(); this.showForm = false; 
    } 
  }
  async deleteTrip(trip: Trip) { if (confirm('Supprimer ?')) await this.tripService.deleteTrip(trip.uid!); }
  openChat(user: UserProfile) { this.chatService.startChatWith(user); this.router.navigate(['/admin/chat']); }
  handleTrackClick(trip: Trip) { window.open(`https://www.google.com/maps/dir/?api=1&origin=$?q=${encodeURIComponent(trip.destination)}&saddr=${encodeURIComponent(trip.departure)}&travelmode=driving`, '_blank'); }
}
