import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { TripService } from '../../../core/services/trip.service';
import { CarService } from '../../../core/services/car.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center">
          <div class="flex items-center gap-3">
             <span class="text-3xl">🧢</span>
             <h1 class="text-2xl font-bold text-gray-900">Espace Chauffeur</h1>
          </div>
          <button (click)="logout()" class="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-md font-medium">Déconnexion</button>
        </div>
      </header>

      <main class="flex-1 max-w-7xl mx-auto w-full py-8 px-4 relative">
        
        <div *ngIf="missions().length > 0; else noMissions">
           <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span class="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-sm">{{ missions().length }}</span>
              Vos Missions Assignées
           </h2>

           <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              @for (trip of missions(); track trip.uid) {
                 <div class="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full">
                    <div class="p-6 flex-1">
                       <div class="flex justify-between items-start mb-4">
                          <div class="flex flex-col">
                             <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Destination</span>
                             <span class="text-lg font-bold text-gray-900">{{ trip.destination }}</span>
                             <span class="text-xs text-gray-500">Depuis {{ trip.departure }}</span>
                          </div>
                          <span class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                            [ngClass]="{
                              'bg-yellow-100 text-yellow-800': trip.status === 'PENDING',
                              'bg-blue-100 text-blue-800': trip.status === 'IN_PROGRESS',
                              'bg-green-100 text-green-800': trip.status === 'COMPLETED'
                            }">{{ trip.status }}</span>
                       </div>
                       
                       <div class="space-y-2 mb-6">
                          <div class="flex items-center text-sm text-gray-600"><span class="mr-2">📅</span> {{ trip.date | date:'dd MMM yyyy à HH:mm' }}</div>
                          <div class="flex items-center text-sm text-gray-600"><span class="mr-2">📦</span> {{ (trip.parcels || []).length }} Colis à livrer</div>
                       </div>
                    </div>
                    
                    <div class="bg-gray-50 px-6 py-3 border-t border-gray-100 flex flex-col gap-2">
                       <button (click)="viewDetails(trip)" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium text-sm">Voir Détails</button>
                       <button (click)="viewRequests(trip)" class="w-full bg-white text-gray-700 border border-gray-200 py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 relative">
                          <span>🔔 Afficher les demandes</span>
                          <span *ngIf="(trip.extraRequests?.length || 0) > 0" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                             {{ trip.extraRequests?.length }}
                          </span>
                       </button>
                    </div>
                 </div>
              }
           </div>
        </div>

        <ng-template #noMissions>
           <div class="h-96 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <span class="text-4xl mb-4">📭</span>
              <h2 class="text-xl font-bold text-gray-900 mb-2">Aucune mission</h2>
              <p class="text-gray-500">Vous n'avez pas encore de trajet assigné.</p>
           </div>
        </ng-template>

        <!-- MODAL DÉTAILS -->
        <div *ngIf="selectedTrip()" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div (click)="closeDetails()" class="fixed inset-0 bg-gray-500 bg-opacity-75"></div>
            <div class="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div class="bg-indigo-600 px-4 py-4 sm:px-6 flex justify-between items-center text-white">
                   <h3 class="text-lg leading-6 font-bold">Détails de la Mission</h3>
                   <button (click)="closeDetails()" class="text-indigo-200 hover:text-white text-2xl leading-none">&times;</button>
              </div>
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 space-y-4">
                   <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 text-center w-full">
                         <div class="text-xl font-bold text-gray-800">{{ selectedTrip()?.departure }}</div>
                         <div class="text-xs text-gray-400 uppercase tracking-widest my-1">VERS</div>
                         <div class="text-xl font-bold text-indigo-600">{{ selectedTrip()?.destination }}</div>
                   </div>
                   <div class="border border-gray-100 p-3 rounded-lg">
                      <p class="text-xs text-gray-500 uppercase font-bold mb-1">Véhicule</p>
                      <p class="text-sm font-medium">{{ selectedTrip()?.carModel }} ({{ selectedTrip()?.carPlate }})</p>
                   </div>
                   <div>
                      <h4 class="text-sm font-bold text-gray-700 mb-2 border-b pb-1">📦 Liste de Colis ({{ selectedTrip()?.parcels?.length || 0 }})</h4>
                      <ul class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                         @for (p of selectedTrip()?.parcels; track $index) {
                             <li class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                                <div><p class="text-sm font-semibold text-gray-800">{{ p.description }}</p><p class="text-xs text-gray-500">Pour: {{ p.recipient }}</p></div>
                                <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">{{ p.weight }} kg</span>
                             </li>
                         }
                      </ul>
                   </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button (click)="closeDetails()" type="button" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50">Fermer</button>
                <button *ngIf="selectedTrip()?.status === 'PENDING'" (click)="startMission()" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700">Démarrer 🚀</button>
                <button *ngIf="selectedTrip()?.status === 'IN_PROGRESS'" (click)="completeMission()" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700">Terminer 🏁</button>
              </div>
            </div>
          </div>
        </div>

        <!-- MODAL DEMANDES -->
        <div *ngIf="selectedRequestsTrip()" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div (click)="closeRequests()" class="fixed inset-0 bg-gray-500 bg-opacity-75"></div>
            <div class="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div class="bg-purple-600 px-4 py-4 sm:px-6 flex justify-between items-center text-white">
                   <h3 class="text-lg leading-6 font-bold">Demandes Supplémentaires</h3>
                   <button (click)="closeRequests()" class="text-purple-200 hover:text-white text-2xl leading-none">&times;</button>
              </div>
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                 <ul class="space-y-3">
                    @for (req of selectedRequestsTrip()?.extraRequests; track $index) {
                       <li class="bg-purple-50 p-3 rounded-lg border border-purple-100">
                          <div class="flex justify-between items-start">
                             <div class="flex items-center gap-2">
                                <span *ngIf="req.type === 'PARCEL'" class="text-xl">📦</span>
                                <span *ngIf="req.type === 'PASSENGER'" class="text-xl">🙋</span>
                                <span class="font-bold text-gray-800">{{ req.type === 'PARCEL' ? 'Colis' : 'Passager' }}</span>
                             </div>
                             <span class="text-xs text-gray-500">{{ req.createdAt | date:'shortTime' }}</span>
                          </div>
                          @if (req.type === 'PARCEL' && req.parcels?.length) {
                             <div class="mt-2 space-y-1">
                                @for (p of req.parcels; track $index) {
                                   <div class="text-sm text-gray-700 bg-white p-1 rounded border border-purple-100 flex justify-between">
                                      <span>{{ p.description }}</span> <span class="text-xs font-bold">{{ p.weight }}kg</span>
                                   </div>
                                }
                             </div>
                          } @else {
                             <p class="text-sm text-gray-600 mt-2">{{ req.description }}</p>
                          }
                          <!-- INFO DEMANDEUR AVEC EMAIL ET SOCIÉTÉ -->
                          <div class="mt-2 pt-2 border-t border-purple-200 text-xs text-purple-700">
                             <p class="font-semibold">Demandé par : {{ req.requesterName }}</p>
                             <p class="text-purple-500">{{ req.requesterEmail }} • {{ req.requesterCompany }}</p>
                          </div>
                       </li>
                    } @empty {
                       <li class="text-center py-8 text-gray-500 italic">Aucune demande supplémentaire.</li>
                    }
                 </ul>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button (click)="closeRequests()" type="button" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50">Fermer</button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  `
})
export class DriverDashboardComponent {
  private authService = inject(AuthService);
  private tripService = inject(TripService);
  private carService = inject(CarService);
  private firestore = inject(Firestore);

  private user$ = this.authService.user$;
  private cars$ = this.carService.getCars();
  private allTrips$ = this.tripService.getTrips();

  selectedTrip = signal<any>(null);
  selectedRequestsTrip = signal<any>(null);

  missions = toSignal(
    combineLatest([this.user$, this.cars$, this.allTrips$]).pipe(
      map(([user, cars, trips]) => {
        if (!user) return [];
        const myCar = cars.find(c => c.assignedDriverId === user.uid);
        if (!myCar) return [];
        return trips
          .filter(t => t.carId === myCar.uid)
          .map(t => ({ ...t, carModel: myCar.model, carPlate: myCar.plate }));
      })
    ),
    { initialValue: [] }
  );

  viewDetails(trip: any) { this.selectedTrip.set(trip); }
  closeDetails() { this.selectedTrip.set(null); }
  viewRequests(trip: any) { this.selectedRequestsTrip.set(trip); }
  closeRequests() { this.selectedRequestsTrip.set(null); }

  async startMission() {
    const trip = this.selectedTrip();
    if (!trip) return;
    try {
      const tripRef = doc(this.firestore, 'trips', trip.uid);
      await updateDoc(tripRef, { status: 'IN_PROGRESS' });
      this.closeDetails();
      alert('Bonne route ! La course est maintenant en cours.');
    } catch (err) { alert('Erreur : ' + err); }
  }

  async completeMission() {
    const trip = this.selectedTrip();
    if (!trip) return;
    if (confirm('Confirmez-vous la fin de cette course ?')) {
        try {
          const tripRef = doc(this.firestore, 'trips', trip.uid);
          await updateDoc(tripRef, { status: 'COMPLETED' });
          this.closeDetails();
          alert('Félicitations ! Course terminée.');
        } catch (err) { alert('Erreur : ' + err); }
    }
  }

  logout() { this.authService.logout().subscribe(); }
}
