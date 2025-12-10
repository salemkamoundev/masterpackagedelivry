import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { TripService, Trip, Parcel, Passenger } from '../../../core/services/trip.service';
import { CarService, Car } from '../../../core/services/car.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { CompanyService } from '../../../core/services/company.service';
import { UserService } from '../../../core/services/user.service';
import { ChatService } from '../../../core/services/chat.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ChatComponent } from '../../chat/chat.component'; // Import ChatComponent
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, map, switchMap, shareReplay } from 'rxjs/operators';
import { combineLatest, of } from 'rxjs';

@Component({
  selector: 'app-trip-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChatComponent],
  template: `
    <div class="space-y-6 p-6">
      
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 class="text-2xl font-bold text-gray-800">Suivi des Trajets</h2>
        
        <div class="flex items-center gap-3">
             <button (click)="isChatOpen = true" class="relative bg-white text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg font-bold hover:bg-indigo-50 flex items-center justify-center gap-2 shadow-sm transition-all">
                <span class="relative flex items-center gap-2">
                    <span>💬</span> Messages
                    @if (unreadMessagesCount() > 0) {
                        <span class="absolute -top-3 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
                            {{ unreadMessagesCount() }}
                        </span>
                    }
                </span>
             </button>

             <button (click)="toggleForm()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2">
                <span>{{ showForm ? "✕" : "➕" }}</span>
                {{ showForm ? "Fermer" : "Nouveau Trajet" }}
             </button>
        </div>
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
               <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Départ</label><input formControlName="departure" class="w-full border p-2 rounded"></div>
               <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label><input formControlName="destination" class="w-full border p-2 rounded"></div>
               <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label><input type="datetime-local" formControlName="date" class="w-full border p-2 rounded"></div>
               <div>
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Véhicule</label>
                  <select formControlName="carId" class="w-full border p-2 rounded bg-white">
                     <option value="">-- Choisir --</option>
                     @for (car of cars$ | async; track car.uid) { <option [value]="car.uid">{{ car.model }} ({{ car.plate }})</option> }
                  </select>
               </div>
            </div>

            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                   <div class="flex justify-between items-center mb-4"><h4 class="font-bold text-gray-700">📦 Colis Initiaux</h4><button type="button" (click)="addParcel()" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">+ Ajouter</button></div>
                   <div formArrayName="parcels" class="space-y-3">
                      @for (parcel of parcelsArray.controls; track $index) {
                        <div [formGroupName]="$index" class="bg-white p-2 rounded shadow-sm border border-gray-200 text-sm relative">
                           <button type="button" (click)="removeParcel($index)" class="absolute right-1 top-1 text-red-400 font-bold text-xs">✕</button>
                           <input formControlName="description" placeholder="Objet" class="w-full mb-1 border-gray-300 rounded p-1 border">
                           <input formControlName="recipientName" placeholder="Client" class="w-full mb-1 border-gray-300 rounded p-1 border">
                           <div class="flex gap-1"><input formControlName="recipientPhone" placeholder="Tél" class="w-1/2 border-gray-300 rounded p-1 border"><input formControlName="recipientAddress" placeholder="Adresse" class="w-1/2 border-gray-300 rounded p-1 border"></div>
                        </div>
                      }
                   </div>
                </div>
                <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                   <div class="flex justify-between items-center mb-4"><h4 class="font-bold text-indigo-900">🙋 Passagers Initiaux</h4><button type="button" (click)="addPassenger()" class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">+ Ajouter</button></div>
                   <div formArrayName="passengers" class="space-y-3">
                      @for (p of passengersArray.controls; track $index) {
                        <div [formGroupName]="$index" class="bg-white p-2 rounded shadow-sm border border-indigo-100 text-sm relative">
                           <button type="button" (click)="removePassenger($index)" class="absolute right-1 top-1 text-red-400 font-bold text-xs">✕</button>
                           <input formControlName="name" placeholder="Nom Prénom" class="w-full mb-1 border-gray-300 rounded p-1 border font-bold">
                           <input formControlName="phone" placeholder="Téléphone" class="w-full mb-1 border-gray-300 rounded p-1 border">
                           <div class="flex gap-1"><input formControlName="pickupLocation" placeholder="Prise" class="w-1/2 border-gray-300 rounded p-1 border text-xs"><input formControlName="dropoffLocation" placeholder="Dépose" class="w-1/2 border-gray-300 rounded p-1 border text-xs"></div>
                        </div>
                      }
                   </div>
                </div>
            </div>
            <div class="flex justify-end mt-6"><button type="button" (click)="toggleForm()" class="px-4 py-2 text-gray-600">Annuler</button><button type="submit" [disabled]="tripForm.invalid" class="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg ml-3">Valider</button></div>
         </form>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
               <thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trajet</th><th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contenu</th><th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Statut</th><th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Chauffeur</th><th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th></tr></thead>
               <tbody class="bg-white divide-y divide-gray-200">
                  @for (trip of filteredTrips(); track trip.uid) {
                     <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4"><div class="flex flex-col"><span class="text-sm font-bold text-gray-900">{{ trip.departure }} ➝ {{ trip.destination }}</span><span class="text-xs text-gray-500">{{ trip.company }}</span><span class="text-xs text-gray-400 mt-1">{{ trip.date | date:'dd/MM HH:mm' }}</span></div></td>
                        <td class="px-6 py-4"><div class="flex flex-col gap-2">
                               <div *ngIf="trip.parcels?.length" class="text-xs"><strong class="text-gray-500 block mb-1">📦 {{ trip.parcels.length }} Colis:</strong>@for (p of trip.parcels; track $index) { <div class="pl-2 border-l-2 border-gray-200 text-gray-600">{{ p.description }}</div> }</div>
                               <div *ngIf="trip.passengers?.length" class="text-xs"><strong class="text-indigo-500 block mb-1">🙋 {{ trip.passengers.length }} Passagers:</strong>@for (pass of trip.passengers; track $index) { <div class="pl-2 border-l-2 border-indigo-200 text-gray-700">{{ pass.name }}</div> }</div>
                        </div></td>
                        <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">{{ trip.status }}</span></td>
                        <td class="px-6 py-4 whitespace-nowrap">
                           <div class="flex items-center gap-3">
                              <div *ngIf="trip.driverName; else noDriver" class="flex items-center gap-2">
                                 <div><div class="text-sm font-bold text-gray-900">{{ trip.driverName }}</div><div class="text-xs text-gray-500 font-mono">{{ trip.driverPhone }}</div></div>
                                 <button *ngIf="trip.driverProfile" (click)="openChat(trip.driverProfile)" class="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 shadow-sm">💬</button>
                              </div>
                              <ng-template #noDriver><span class="text-xs text-gray-400 italic bg-gray-100 px-2 py-1 rounded">Non assigné</span></ng-template>
                           </div>
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                           <button (click)="openRequestModal(trip)" class="p-2 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200 mr-2 hover:bg-purple-100">➕ Ajout Rapide</button>
                           <button (click)="handleTrackClick(trip)" class="p-2 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 mr-2">📍</button>
                           <button (click)="deleteTrip(trip)" class="p-2 text-xs bg-red-50 text-red-700 rounded border border-red-200">🗑️</button>
                        </td>
                     </tr>
                  } @empty { <tr><td colspan="5" class="p-8 text-center text-gray-500">Aucun trajet.</td></tr> }
               </tbody>
            </table>
         </div>
      </div>

    <div *ngIf="selectedTripForRequest" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div class="bg-indigo-900 text-white p-4 flex justify-between items-center shrink-0">
                <h3 class="font-bold text-lg">Ajouter au Trajet : {{ selectedTripForRequest.departure }} ➝ {{ selectedTripForRequest.destination }}</h3>
                <button (click)="closeRequestModal()" class="text-white hover:text-gray-300">✕</button>
            </div>
            <div class="p-6 overflow-y-auto">
                <div *ngIf="tempParcels.length > 0 || tempPassengers.length > 0" class="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 class="font-bold text-yellow-800 mb-2 flex items-center gap-2">📝 Liste à valider ({{ tempParcels.length + tempPassengers.length }})</h4>
                    <ul class="space-y-2 text-sm">
                        @for (p of tempParcels; track $index) {
                            <li class="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                <span>📦 <strong>{{ p.description }}</strong> ({{ p.recipientName }})</span>
                                <button (click)="removeTempParcel($index)" class="text-red-500 hover:text-red-700 font-bold">✕</button>
                            </li>
                        }
                        @for (p of tempPassengers; track $index) {
                             <li class="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                <span>🙋 <strong>{{ p.name }}</strong> ({{ p.phone }})</span>
                                <button (click)="removeTempPassenger($index)" class="text-red-500 hover:text-red-700 font-bold">✕</button>
                             </li>
                        }
                    </ul>
                    <div class="mt-3 text-right">
                       <button (click)="saveAllExtras()" class="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-700 shadow-sm animate-pulse">
                            ✅ Valider et Envoyer Tout
                         </button>
                    </div>
                </div>

                <div class="flex gap-4 mb-4 bg-gray-100 p-1 rounded-lg">
                  <button (click)="requestType='PARCEL'" [class]="requestType==='PARCEL' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="flex-1 py-2 rounded-md font-bold transition-all text-sm flex items-center justify-center gap-2">
                      <span>📦</span> Nouveau Colis
                  </button>
                  <button (click)="requestType='PASSENGER'" [class]="requestType==='PASSENGER' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="flex-1 py-2 rounded-md font-bold transition-all text-sm flex items-center justify-center gap-2">
                      <span>🙋</span> Nouveau Passager
                  </button>
                </div>

                <div *ngIf="requestType==='PARCEL'" class="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                   <div><label class="text-xs font-bold text-gray-500 uppercase">Description</label><input #descInput placeholder="Ex: Documents, PC..." class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"></div>
                   <div class="grid grid-cols-2 gap-3">
                     <div><label class="text-xs font-bold text-gray-500 uppercase">Destinataire</label><input #recNameInput placeholder="Nom" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"></div>
                     <div><label class="text-xs font-bold text-gray-500 uppercase">Tél</label><input #recPhoneInput placeholder="20..." class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"></div>
                   </div>
                   <div><label class="text-xs font-bold text-gray-500 uppercase">Adresse</label><input #recAddrInput placeholder="Adresse livraison" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"></div>
                   <button (click)="addToTempParcel(descInput, recNameInput, recPhoneInput, recAddrInput)" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 mt-2">⬇️ Ajouter à la liste</button>
                </div>

                <div *ngIf="requestType==='PASSENGER'" class="space-y-3 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                   <div class="grid grid-cols-2 gap-3">
                     <div><label class="text-xs font-bold text-gray-500 uppercase">Nom</label><input #passNameInput placeholder="Nom Prénom" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"></div>
                     <div><label class="text-xs font-bold text-gray-500 uppercase">Tél</label><input #passPhoneInput placeholder="Phone" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"></div>
                   </div>
                   <div><label class="text-xs font-bold text-gray-500 uppercase">Lieu de prise</label><input #passPickInput placeholder="Départ" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"></div>
                   <div><label class="text-xs font-bold text-gray-500 uppercase">Destination</label><input #passDropInput placeholder="Arrivée" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"></div>
                   <button (click)="addToTempPassenger(passNameInput, passPhoneInput, passPickInput, passDropInput)" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 mt-2">⬇️ Ajouter à la liste</button>
                </div>
            </div>
        </div>
    </div>
    
    <div *ngIf="isChatOpen" class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
         <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col relative animate-fade-in-up">
             <div class="bg-indigo-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
                <h3 class="font-bold text-lg flex items-center gap-2">💬 Messagerie Admin</h3>
                <button (click)="isChatOpen = false" class="text-white/80 hover:text-white text-xl font-bold p-2">✕</button>
             </div>
             <div class="flex-1 overflow-hidden relative">
                <app-chat class="block h-full w-full"></app-chat>
             </div>
         </div>
    </div>
    </div>
  `
})
export class TripManagerComponent {
  // Injections D'ABORD (IMPORTANT pour l'ordre d'initialisation)
  private fb = inject(FormBuilder);
  private tripService = inject(TripService);
  private carService = inject(CarService);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private userService = inject(UserService);
  private chatService = inject(ChatService);
  private notifService = inject(NotificationService);
  private router = inject(Router);

  // Signaux et propriétés ensuite
  showForm = false;
  isChatOpen = false;

  // Signal pour les messages non lus (initialValue: 0 pour éviter undefined)
  unreadMessagesCount = toSignal(
    this.authService.user$.pipe(
      switchMap(u => u ? this.chatService.getUnreadCount(u.uid) : of(0))
    ),
    { initialValue: 0 }
  );

  cars$ = this.carService.getCars();
  activeCompanies = this.companyService.activeCompanies;
  selectedTripForRequest: Trip | null = null;
  
  adminProfile$ = this.authService.user$.pipe(switchMap(u => u?.email === 'admin@gmail.com' ? of({ uid: u.uid, email: u.email, role: 'SUPER_ADMIN', company: 'System', displayName: 'Super Admin' } as UserProfile) : (u ? this.authService.getUserProfile(u.uid) : of(null))), shareReplay(1));
  adminCompany = toSignal(this.adminProfile$.pipe(map(p => p?.company || null)));
  
  filterForm = this.fb.group({ company: [''], inProgressOnly: [false] });
  filterValues = toSignal(this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)), { initialValue: this.filterForm.value });

  tripForm = this.fb.group({ departure: ['', Validators.required], destination: ['', Validators.required], date: ['', Validators.required], carId: ['', Validators.required], parcels: this.fb.array([]), passengers: this.fb.array([]) });
  
  get parcelsArray() { return this.tripForm.get('parcels') as FormArray; }
  get passengersArray() { return this.tripForm.get('passengers') as FormArray; }
  
  addParcel() { this.parcelsArray.push(this.fb.group({ description: [''], recipientName: [''], recipientPhone: [''], recipientAddress: [''], weight: [1], delivered: [false] })); }
  addPassenger() { this.passengersArray.push(this.fb.group({ name: [''], phone: [''], pickupLocation: [''], dropoffLocation: [''], isDroppedOff: [false] })); }
  removeParcel(i: number) { this.parcelsArray.removeAt(i); }
  removePassenger(i: number) { this.passengersArray.removeAt(i); }
  toggleForm() { this.showForm = !this.showForm; }
  
  async createTrip() { if (this.tripForm.valid) { await this.tripService.createTrip({ ...this.tripForm.value, driverId: 'PENDING', status: 'PENDING', company: this.adminCompany() === 'System' ? 'Tunisia Express' : this.adminCompany(), parcels: this.tripForm.value.parcels ?? [], passengers: this.tripForm.value.passengers ?? [], extraRequests: [] } as any); this.tripForm.reset(); this.parcelsArray.clear(); this.passengersArray.clear(); this.showForm = false; } }
  
  requestForm = this.fb.group({ type: ['PARCEL'], description: [''], parcels: this.fb.array([]) });
  openRequestModal(t: Trip) { 
      this.selectedTripForRequest = t;
      this.tempParcels = [];
      this.tempPassengers = [];
  }
  closeRequestModal() { this.selectedTripForRequest = null; }
  
  async deleteTrip(t: Trip) { if (confirm('Suppr?')) await this.tripService.deleteTrip(t.uid!); }
  openChat(u: UserProfile) { this.chatService.startChatWith(u); this.router.navigate(['/admin/chat']); }
  
  handleTrackClick(t: Trip) { 
    const url = 'https://www.google.com/maps/dir/?api=1&origin=$' + encodeURIComponent(t.departure) + '&destination=' + encodeURIComponent(t.destination) + '&travelmode=driving';
    window.open(url, '_blank'); 
  }

  private enrichedTrips$ = combineLatest([this.tripService.getTrips(), this.userService.getAllUsers(), this.carService.getCars()]).pipe(
    map(([trips, users, cars]) => {
       return trips.map((trip: any) => {
          let driver = users.find(u => u.uid === trip.driverId);
          if (!driver && trip.carId) {
             const car = cars.find(c => c.uid === trip.carId);
             if (car && car.assignedDriverId) driver = users.find(u => u.uid === car.assignedDriverId);
          }
          return { 
             ...trip, 
             driverName: driver ? (driver.displayName || driver.email) : null,
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
    const myCompany = this.adminCompany();
    const isAdmin = myCompany === 'System' || !myCompany; 
    return trips.filter((t: any) => {
       if (!isAdmin && t.company !== myCompany) return false;
       return (!filters?.company || t.company === filters.company) && (!filters?.inProgressOnly || t.status === 'IN_PROGRESS');
    });
  });

  requestType: 'PARCEL' | 'PASSENGER' = 'PARCEL';
  tempParcels: Parcel[] = [];
  tempPassengers: Passenger[] = [];
  
  addToTempParcel(desc: HTMLInputElement, name: HTMLInputElement, phone: HTMLInputElement, addr: HTMLInputElement) {
    if (!desc.value || !name.value) { alert('Champs obligatoires manquants'); return; }
    this.tempParcels.push({
        description: desc.value, recipientName: name.value, recipientPhone: phone.value, recipientAddress: addr.value, weight: 1, delivered: false
    });
    desc.value = ''; name.value = ''; phone.value = ''; addr.value = '';
  }

  addToTempPassenger(name: HTMLInputElement, phone: HTMLInputElement, pickup: HTMLInputElement, drop: HTMLInputElement) {
    if (!name.value) { alert('Nom obligatoire'); return; }
    this.tempPassengers.push({
        name: name.value, phone: phone.value, pickupLocation: pickup.value, dropoffLocation: drop.value, isDroppedOff: false
    });
    name.value = ''; phone.value = ''; pickup.value = ''; drop.value = '';
  }

  removeTempParcel(index: number) { this.tempParcels.splice(index, 1); }
  removeTempPassenger(index: number) { this.tempPassengers.splice(index, 1); }

  async saveAllExtras() {
    const trip = this.selectedTripForRequest;
    if (!trip || !trip.uid) return;
    
    if (this.tempParcels.length === 0 && this.tempPassengers.length === 0) {
        alert("Aucun élément à ajouter.");
        return;
    }

    try {
        const updates: any = {};
        if (this.tempParcels.length > 0) {
            updates.parcels = [...(trip.parcels || []), ...this.tempParcels];
        }
        if (this.tempPassengers.length > 0) {
            updates.passengers = [...(trip.passengers || []), ...this.tempPassengers];
        }
        
        updates.hasNewItems = true;
        await this.tripService.updateTrip(trip.uid, updates);

        if (trip.driverId && trip.driverId !== 'PENDING') {
            const countP = this.tempParcels.length;
            const countPass = this.tempPassengers.length;
            let msg = 'Mise à jour trajet : ';
            if (countP > 0) msg += countP + ' Colis ';
            if (countPass > 0) msg += countPass + ' Passagers ';
            msg += 'ajouté(s).';
            await this.notifService.send(trip.driverId, msg, 'INFO');
        }

        alert("Ajouts validés avec succès !");
        this.closeRequestModal();
    } catch (e) {
        alert("Erreur lors de la sauvegarde : " + e);
    }
  }
}
