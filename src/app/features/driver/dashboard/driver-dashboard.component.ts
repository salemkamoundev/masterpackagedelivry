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
        <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div class="flex items-center gap-3">
             <span class="text-3xl">🧢</span>
             <h1 class="text-2xl font-bold text-gray-900">Espace Chauffeur</h1>
          </div>
          <button (click)="logout()" class="text-sm bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-md font-medium transition-colors">
             Déconnexion
          </button>
        </div>
      </header>

      <main class="flex-1 max-w-7xl mx-auto w-full py-8 px-4 sm:px-6 lg:px-8 relative">
        
        <div *ngIf="missions().length > 0; else noMissions">
           <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span class="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-sm">
                 {{ missions().length }}
              </span>
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
                            }">
                            {{ trip.status }}
                          </span>
                       </div>
                       
                       <div class="space-y-2 mb-6">
                          <div class="flex items-center text-sm text-gray-600">
                             <span class="mr-2">📅</span>
                             {{ trip.date | date:'dd MMM yyyy à HH:mm' }}
                          </div>
                          <div class="flex items-center text-sm text-gray-600">
                             <span class="mr-2">🚚</span>
                             {{ trip.carModel || 'Véhicule assigné' }} <span class="text-xs bg-gray-100 px-1 rounded ml-1">{{ trip.carPlate }}</span>
                          </div>
                          <div class="flex items-center text-sm text-gray-600">
                             <span class="mr-2">📦</span>
                             <!-- Correction NG8107 : Utilisation sécurisée de la propriété -->
                             {{ (trip.parcels || []).length }} Colis à livrer
                          </div>
                       </div>
                    </div>
                    <div class="bg-gray-50 px-6 py-3 border-t border-gray-100">
                       <button (click)="viewDetails(trip)" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center justify-center gap-2">
                          <span>Voir Détails</span>
                       </button>
                    </div>
                 </div>
              }
           </div>
        </div>

        <ng-template #noMissions>
           <div class="h-96 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <span class="text-4xl">📭</span>
              </div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">Aucune mission pour le moment</h2>
              <p class="text-gray-500 max-w-md mx-auto">
                 Vous n'avez pas encore de trajet assigné. Assurez-vous d'être assigné à un véhicule par votre administrateur.
              </p>
           </div>
        </ng-template>

        <!-- MODAL DÉTAILS -->
        <div *ngIf="selectedTrip()" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <!-- Background overlay -->
            <div (click)="closeDetails()" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            <!-- Modal panel -->
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div class="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              
              <!-- En-tête Modal -->
              <div class="bg-indigo-600 px-4 py-4 sm:px-6">
                <div class="flex justify-between items-center text-white">
                   <h3 class="text-lg leading-6 font-bold" id="modal-title">Détails de la Mission</h3>
                   <button (click)="closeDetails()" class="text-indigo-200 hover:text-white text-2xl leading-none">&times;</button>
                </div>
              </div>

              <!-- Contenu Modal -->
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div class="space-y-4">
                   
                   <!-- Trajet -->
                   <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div class="text-center w-full">
                         <div class="text-xl font-bold text-gray-800">{{ selectedTrip()?.departure }}</div>
                         <div class="text-xs text-gray-400 uppercase tracking-widest my-1">VERS</div>
                         <div class="text-xl font-bold text-indigo-600">{{ selectedTrip()?.destination }}</div>
                      </div>
                   </div>

                   <!-- Info Date & Vehicule -->
                   <div class="grid grid-cols-2 gap-4">
                      <div class="border border-gray-100 p-3 rounded-lg">
                         <p class="text-xs text-gray-500 uppercase font-bold mb-1">Départ Prévu</p>
                         <p class="text-sm font-medium">{{ selectedTrip()?.date | date:'short' }}</p>
                      </div>
                      <div class="border border-gray-100 p-3 rounded-lg">
                         <p class="text-xs text-gray-500 uppercase font-bold mb-1">Véhicule</p>
                         <p class="text-sm font-medium">{{ selectedTrip()?.carModel }}</p>
                         <p class="text-xs text-gray-400">{{ selectedTrip()?.carPlate }}</p>
                      </div>
                   </div>

                   <!-- Liste des Colis -->
                   <div>
                      <h4 class="text-sm font-bold text-gray-700 mb-2 border-b pb-1">📦 Liste de Colis ({{ selectedTrip()?.parcels?.length || 0 }})</h4>
                      <ul class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                         <!-- Correction NG5002: échappement de  -->
                         @for (p of selectedTrip()?.parcels; track $index) {
                             <li class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                                <div>
                                   <p class="text-sm font-semibold text-gray-800">{{ p.description }}</p>
                                   <p class="text-xs text-gray-500">Pour: {{ p.recipient }}</p>
                                </div>
                                <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">{{ p.weight }} kg</span>
                             </li>
                         } @empty {
                             <li class="text-sm text-gray-500 italic p-2">Aucun colis enregistré.</li>
                         }
                      </ul>
                   </div>

                </div>
              </div>

              <!-- Footer Modal -->
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button (click)="closeDetails()" type="button" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                  Fermer
                </button>
                <!-- BOUTON DÉMARRER LA COURSE -->
                <button *ngIf="selectedTrip()?.status === 'PENDING'" (click)="startMission()" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                  Démarrer 🚀
                </button>
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

  // État local pour la modale
  selectedTrip = signal<any>(null);

  // Combine les flux pour filtrer les trajets du chauffeur connecté
  missions = toSignal(
    combineLatest([this.user$, this.cars$, this.allTrips$]).pipe(
      map(([user, cars, trips]) => {
        if (!user) return [];
        
        // 1. Trouver la voiture assignée à ce chauffeur
        const myCar = cars.find(c => c.assignedDriverId === user.uid);
        
        if (!myCar) return [];

        // 2. Trouver les trajets liés à cette voiture
        return trips
          .filter(t => t.carId === myCar.uid)
          .map(t => ({
             ...t,
             carModel: myCar.model,
             carPlate: myCar.plate
          }));
      })
    ),
    { initialValue: [] }
  );

  viewDetails(trip: any) {
    this.selectedTrip.set(trip);
  }

  closeDetails() {
    this.selectedTrip.set(null);
  }

  async startMission() {
    const trip = this.selectedTrip();
    if (!trip) return;
    
    try {
      const tripRef = doc(this.firestore, 'trips', trip.uid);
      await updateDoc(tripRef, { status: 'IN_PROGRESS' });
      this.closeDetails();
      alert('Bonne route ! La course est maintenant en cours.');
    } catch (err) {
      alert('Erreur lors du démarrage de la course : ' + err);
    }
  }

  logout() { this.authService.logout().subscribe(); }
}
