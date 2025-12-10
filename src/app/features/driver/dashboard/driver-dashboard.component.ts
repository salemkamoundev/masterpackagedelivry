import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { TripService, Trip, Parcel, Passenger } from '../../../core/services/trip.service';
import { CarService, Car } from '../../../core/services/car.service';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, switchMap, of } from 'rxjs';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { ChatComponent } from '../../chat/chat.component';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChatComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col relative">
      
      <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
         @for (notif of notifications$ | async; track notif.uid) {
             <div class="bg-white border-l-4 border-indigo-600 shadow-xl rounded-r-lg p-4 flex items-start gap-3 w-80 animate-fade-in-left">
                <div class="text-2xl">🔔</div>
                <div class="flex-1">
                   <p class="text-sm font-bold text-gray-800">Notification</p>
                   <p class="text-sm text-gray-600">{{ notif.message }}</p>
                </div>
                <button (click)="markRead(notif)" class="text-gray-400 hover:text-gray-600 font-bold">✕</button>
             </div>
         }
      </div>

      <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div class="max-w-7xl mx-auto py-4 px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div class="flex items-center gap-2">
             <span class="text-2xl">🧢</span>
             <h1 class="text-xl font-bold text-gray-900">Espace Chauffeur</h1>
          </div>
          <div class="flex items-center gap-3 w-full sm:w-auto">
             <button (click)="isChatOpen = true" class="flex-1 sm:flex-none bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 flex items-center justify-center gap-2">
                <span>💬</span> Messages
             </button>
             <button (click)="openCreateModal()" class="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 flex items-center justify-center gap-2"><span>➕</span> Nouveau Trajet</button>
             <button (click)="logout()" class="text-sm text-red-600 font-bold border border-red-200 bg-red-50 px-3 py-2 rounded hover:bg-red-100 transition-colors">Déconnexion</button>
          </div>
        </div>
      </header>
  
      <main class="flex-1 max-w-7xl mx-auto w-full py-8 px-4 relative">
        <div *ngIf="!myCar()" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm"><p class="font-bold">⚠️ Aucun véhicule assigné.</p></div>

        <div *ngIf="filteredMissions().length > 0; else noMissions">
           <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              @for (trip of filteredMissions(); track trip.uid) {
                 <div class="bg-white shadow-lg rounded-xl border-l-4 overflow-hidden transition-transform hover:scale-[1.02] relative"
                      [ngClass]="{'border-indigo-500': trip.status === 'PENDING', 'border-blue-500': trip.status === 'IN_PROGRESS', 'border-green-500': trip.status === 'COMPLETED'}">
                      
                      <span *ngIf="trip.hasNewItems" class="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse shadow-md z-10">
                          🔔 Nouveau
                      </span>

                      <div class="p-5">
                        <div class="flex justify-between items-start mb-3">
                           <div><h3 class="font-bold text-lg text-gray-900">{{ trip.destination }}</h3><p class="text-sm text-gray-500">Depuis: {{ trip.departure }}</p></div>
                           <span class="px-2 py-1 text-xs font-bold rounded uppercase tracking-wide" [ngClass]="{'bg-indigo-100 text-indigo-700': trip.status === 'PENDING', 'bg-blue-100 text-blue-700': trip.status === 'IN_PROGRESS', 'bg-green-100 text-green-700': trip.status === 'COMPLETED'}">{{ trip.status }}</span>
                        </div>
                        <div class="space-y-2 text-sm text-gray-600 mb-4">
                           <div class="flex items-center gap-2"><span>📅</span> {{ trip.date | date:'dd/MM HH:mm' }}</div>
                           <div class="flex items-center gap-2"><span>📦</span> {{ getMergedParcels(trip).length }} Colis</div>
                           <div class="flex items-center gap-2 text-indigo-600 font-bold" *ngIf="trip.passengers?.length"><span>🙋</span> {{ trip.passengers.length }} Passagers</div>
                        </div>
                        <button (click)="viewDetails(trip)" class="w-full bg-gray-900 text-white py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"><span>👁️</span> Voir Détails</button>
                    </div>
                 </div>
              }
           </div>
        </div>
        <ng-template #noMissions><div class="flex flex-col items-center justify-center py-20 text-gray-400"><p class="text-lg font-medium">Aucune mission.</p></div></ng-template>

        <div *ngIf="isCreateModalOpen" class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
             <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-fade-in-up my-auto max-h-[90vh] overflow-y-auto">
                 <div class="bg-indigo-600 text-white p-6 flex justify-between items-center"><h3 class="font-bold text-xl">Créer un Trajet</h3><button (click)="closeCreateModal()">✕</button></div>
                 <form [formGroup]="createForm" (ngSubmit)="submitNewTrip()" class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div><label class="block text-sm font-bold text-gray-700 mb-1">Départ</label><input formControlName="departure" class="w-full border p-2 rounded bg-gray-50"></div>
                        <div><label class="block text-sm font-bold text-gray-700 mb-1">Destination</label><input formControlName="destination" class="w-full border p-2 rounded bg-gray-50"></div>
                        <div class="md:col-span-2"><label class="block text-sm font-bold text-gray-700 mb-1">Date</label><input type="datetime-local" formControlName="date" class="w-full border p-2 rounded bg-gray-50"></div>
                    </div>
                    <div class="flex justify-end gap-3"><button type="button" (click)="closeCreateModal()" class="px-4 py-2 text-gray-600">Annuler</button><button type="submit" [disabled]="createForm.invalid" class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Créer</button></div>
                 </form>
             </div>
        </div>

        @if (selectedTrip(); as trip) {
            <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up my-auto">
                    <div class="bg-gray-900 text-white p-6 flex justify-between items-start">
                        <div><h3 class="font-bold text-xl">{{ trip.destination }}</h3><p class="text-gray-300 text-sm mt-1">Départ: {{ trip.departure }}</p></div>
                        <button (click)="closeDetails()" class="text-gray-400 hover:text-white text-2xl font-bold">✕</button>
                    </div>
                    <div class="p-6 max-h-[70vh] overflow-y-auto">
                        <div class="flex gap-3 mb-8">
                            <button *ngIf="trip.status === 'PENDING'" (click)="updateStatus('IN_PROGRESS')" class="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">🚀 Démarrer</button>
                            <button *ngIf="trip.status === 'IN_PROGRESS'" (click)="updateStatus('COMPLETED')" class="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold">🏁 Terminer</button>
                        </div>
                        <div *ngIf="trip.passengers?.length" class="mb-6">
                            <h4 class="font-bold text-indigo-900 mb-3 border-b border-indigo-100 pb-2">🙋 Passagers</h4>
                            <div class="space-y-3">
                                @for (pass of trip.passengers; track $index) {
                                    <div class="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <p class="font-bold text-indigo-900">{{ pass.name }}</p>
                                            <a [href]="'tel:' + pass.phone" class="text-sm text-blue-600 underline">{{ pass.phone }}</a>
                                            <div class="text-xs text-gray-500 mt-1">
                                                <span *ngIf="pass.pickupLocation">⬆️ {{ pass.pickupLocation }}</span>
                                                <span *ngIf="pass.dropoffLocation" class="ml-2">⬇️ {{ pass.dropoffLocation }}</span>
                                            </div>
                                        </div>
                                        <button (click)="togglePassengerDropoff(trip, $index)" class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all" [ngClass]="pass.isDroppedOff ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-300 border-gray-300'">{{ pass.isDroppedOff ? '✓' : '' }}</button>
                                    </div>
                                }
                            </div>
                        </div>
                        <h4 class="font-bold text-gray-800 mb-3 border-b pb-2">📦 Colis</h4>
                        <div class="space-y-4">
                            @for (parcel of getMergedParcels(trip); track $index) {
                                <div class="border rounded-xl p-4 transition-colors relative" [ngClass]="parcel.delivered ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'">
                                    <div class="flex justify-between items-start">
                                        <div class="flex-1">
                                            <div class="font-bold text-lg text-gray-800">{{ parcel.description }}</div>
                                            <div class="text-sm mt-1 text-gray-600">👤 {{ parcel.recipientName }} <br>📍 {{ parcel.recipientAddress }}</div>
                                        </div>
                                        <div class="ml-4 flex flex-col items-center gap-1">
                                            <button (click)="toggleParcelDelivery(trip, parcel)" class="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm transition-all border-2" [ngClass]="parcel.delivered ? 'bg-green-500 text-white border-green-600 scale-110' : 'bg-white text-gray-300 border-gray-200'">{{ parcel.delivered ? '✓' : '' }}</button>
                                        </div>
                                    </div>
                                </div>
                            }
                            @if (getMergedParcels(trip).length === 0) { <div class="text-center py-4 text-gray-400 italic">Aucun colis.</div> }
                         </div>
                    </div>
                </div>
            </div>
        }

        <div *ngIf="isChatOpen" class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
             <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col relative">
                 <div class="bg-indigo-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
                    <h3 class="font-bold text-lg flex items-center gap-2">💬 Messagerie</h3>
                    <button (click)="isChatOpen = false" class="text-white/80 hover:text-white text-xl font-bold p-2">✕</button>
                 </div>
                 <div class="flex-1 overflow-hidden relative">
                    <app-chat class="block h-full w-full"></app-chat>
                 </div>
             </div>
        </div>
      </main>
    </div>
  `
})
export class DriverDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private tripService = inject(TripService);
  private carService = inject(CarService);
  private notifService: NotificationService = inject(NotificationService);
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);
  
  private user$ = this.authService.user$;
  private cars$ = this.carService.getCars();
  private allTrips$ = this.tripService.getTrips();
  
  selectedTrip = signal<Trip | null>(null);
  isCreateModalOpen = false;
  isChatOpen = false;
  notifications$ = of<AppNotification[]>([]);

  activeTab: 'parcels' | 'passengers' = 'parcels';
  myCar = toSignal(combineLatest([this.user$, this.cars$]).pipe(
      map(([user, cars]) => user ? cars.find(c => c.assignedDriverId === user.uid) || null : null)
  ));
  missions = toSignal(combineLatest([this.user$, this.cars$, this.allTrips$]).pipe(map(([user, cars, trips]) => {
        if (!user) return [];
        const myCar = cars.find(c => c.assignedDriverId === user.uid);
        if (!myCar) return [];
        return trips.filter(t => t.carId === myCar.uid);
  })), { initialValue: [] });
  filteredMissions = computed(() => this.missions().filter(t => t.status !== 'COMPLETED'));

  createForm = this.fb.group({
      departure: ['', Validators.required],
      destination: ['', Validators.required],
      date: [new Date().toISOString().slice(0, 16), Validators.required],
      parcels: this.fb.array([]),
      passengers: this.fb.array([])
  });
  get parcelsArray() { return this.createForm.get('parcels') as FormArray; }
  get passengersArray() { return this.createForm.get('passengers') as FormArray; }

  ngOnInit() {
    this.user$.subscribe(user => {
      if (user) {
        this.notifications$ = this.notifService.getNotifications(user.uid);
      }
    });
  }

  addParcel() { this.parcelsArray.push(this.fb.group({ description: [''], recipientName: [''], recipientPhone: [''], recipientAddress: [''], weight: [1], delivered: [false] })); }
  addPassenger() { this.passengersArray.push(this.fb.group({ name: [''], phone: [''], pickupLocation: [''], dropoffLocation: [''], isDroppedOff: [false] })); }
  
  removeParcel(index: number) { this.parcelsArray.removeAt(index); }
  removePassenger(index: number) { this.passengersArray.removeAt(index); }

  openCreateModal() { this.isCreateModalOpen = true; this.createForm.reset({ date: new Date().toISOString().slice(0, 16) }); this.parcelsArray.clear(); this.passengersArray.clear(); }
  closeCreateModal() { this.isCreateModalOpen = false; }

  async submitNewTrip() {
      const car = this.myCar();
      this.user$.pipe(switchMap(u => {
          if (!u || !car || this.createForm.invalid) return of(null);
          const val = this.createForm.value;
          const newTrip: Trip = {
             departure: val.departure!, destination: val.destination!, date: val.date!,
             status: 'PENDING', driverId: u.uid, carId: car.uid!, company: car.company,
             parcels: val.parcels as any[] ?? [],
             passengers: val.passengers as any[] ?? [],
             extraRequests: []
          };
          return this.tripService.createTrip(newTrip);
      })).subscribe(res => { if(res) { this.closeCreateModal(); alert('Trajet créé !'); } });
  }

  async togglePassengerDropoff(trip: Trip, index: number) {
     if(!trip.uid || !trip.passengers) return;
     trip.passengers[index].isDroppedOff = !trip.passengers[index].isDroppedOff;
     await this.tripService.updatePassengers(trip.uid, trip.passengers);
     this.selectedTrip.set({...trip});
  }

  getMergedParcels(trip: Trip): Parcel[] { return trip.parcels || []; }
  
  async toggleParcelDelivery(trip: Trip, parcelToToggle: Parcel) {
      if (!trip.uid || !trip.parcels) return;
      const idx = trip.parcels.indexOf(parcelToToggle);
      if (idx > -1) {
          trip.parcels[idx].delivered = !trip.parcels[idx].delivered;
          await this.tripService.updateParcels(trip.uid, trip.parcels);
          this.selectedTrip.set({...trip});
      }
  }
  
  // CORRECTION : Quand on clique sur Voir Détails, on enlève le flag 'Nouveau'
  async viewDetails(trip: Trip) { 
      this.selectedTrip.set(JSON.parse(JSON.stringify(trip))); 
      if (trip.hasNewItems && trip.uid) {
          await this.tripService.updateTrip(trip.uid, { hasNewItems: false });
      }
  }

  closeDetails() { this.selectedTrip.set(null); }
  
  async updateStatus(status: any) { 
     const t = this.selectedTrip();
     if(t?.uid) { await updateDoc(doc(this.firestore, 'trips', t.uid), { status }); this.closeDetails(); }
  }
  
  logout() { this.authService.logout().subscribe(); }

  markRead(notif: AppNotification) {
    if (notif.uid) this.notifService.markAsRead(notif.uid);
  }
}
