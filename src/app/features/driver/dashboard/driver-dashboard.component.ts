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
      <header class="bg-white shadow-sm border-b border-gray-200 relative z-10">
        <div class="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center">
          <h1 class="text-xl font-bold text-gray-900">🧢 Espace Chauffeur</h1>
          <button (click)="logout()" class="text-sm text-red-600 font-medium">Déconnexion</button>
        </div>
      </header>
      <main class="flex-1 max-w-7xl mx-auto w-full py-8 px-4 relative">
        <div *ngIf="missions().length > 0; else noMissions">
           <h2 class="text-xl font-bold text-gray-800 mb-6">Vos Missions ({{ missions().length }})</h2>
           <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              @for (trip of missions(); track trip.uid) {
                 <div class="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
                    <div class="flex justify-between mb-4">
                       <span class="font-bold text-lg">{{ trip.destination }}</span>
                       <span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">{{ trip.status }}</span>
                    </div>
                    <p class="text-sm text-gray-600 mb-4">Depuis: {{ trip.departure }}</p>
                    <button (click)="viewDetails(trip)" class="w-full bg-indigo-600 text-white py-2 rounded">Voir Détails</button>
                 </div>
              }
           </div>
        </div>
        <ng-template #noMissions><div class="text-center py-12 text-gray-500">Aucune mission assignée.</div></ng-template>
        <div *ngIf="selectedTrip()" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl p-6 max-w-lg w-full">
                <h3 class="font-bold text-lg mb-4">Détails Mission</h3>
                <p>Destination: {{ selectedTrip().destination }}</p>
                <div class="flex gap-2 mt-6">
                   <button (click)="closeDetails()" class="flex-1 bg-gray-100 py-2 rounded">Fermer</button>
                   <button *ngIf="selectedTrip().status === 'PENDING'" (click)="startMission()" class="flex-1 bg-green-600 text-white py-2 rounded">Démarrer</button>
                   <button *ngIf="selectedTrip().status === 'IN_PROGRESS'" (click)="completeMission()" class="flex-1 bg-red-600 text-white py-2 rounded">Terminer</button>
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
  missions = toSignal(combineLatest([this.user$, this.cars$, this.allTrips$]).pipe(map(([user, cars, trips]) => {
        if (!user) return [];
        const myCar = cars.find(c => c.assignedDriverId === user.uid);
        if (!myCar) return [];
        return trips.filter(t => t.carId === myCar.uid);
      })), { initialValue: [] });
  viewDetails(trip: any) { this.selectedTrip.set(trip); }
  closeDetails() { this.selectedTrip.set(null); }
  async startMission() { if(this.selectedTrip()) { await updateDoc(doc(this.firestore, 'trips', this.selectedTrip().uid), { status: 'IN_PROGRESS' }); this.closeDetails(); } }
  async completeMission() { if(this.selectedTrip() && confirm('Terminer ?')) { await updateDoc(doc(this.firestore, 'trips', this.selectedTrip().uid), { status: 'COMPLETED' }); this.closeDetails(); } }
  logout() { this.authService.logout().subscribe(); }
}
