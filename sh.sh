#!/bin/bash

TARGET="src/app/features/driver/dashboard/driver-dashboard.component.ts"

echo "🛠️ Correction : Fusion des demandes (extraRequests) avec les colis principaux dans $TARGET..."

cat << 'EOF' > "$TARGET"
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { TripService, Trip, Parcel } from '../../../core/services/trip.service';
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
      <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div class="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center">
          <div class="flex items-center gap-2">
             <span class="text-2xl">🧢</span>
             <h1 class="text-xl font-bold text-gray-900">Espace Chauffeur</h1>
          </div>
          <button (click)="logout()" class="text-sm text-red-600 font-bold border border-red-200 bg-red-50 px-3 py-1 rounded hover:bg-red-100 transition-colors">Déconnexion</button>
        </div>
      </header>
  
      <main class="flex-1 max-w-7xl mx-auto w-full py-8 px-4 relative">
        
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
           <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>📋</span> Missions
           </h2>
           
           <div class="flex bg-white p-1 rounded-lg shadow-sm border border-gray-200">
              <button (click)="setFilter('ACTIVE')" 
                      class="px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2"
                      [ngClass]="filterMode() === 'ACTIVE' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'">
                 <span>🚀</span> En cours
                 <span class="bg-white/20 px-1.5 rounded text-xs">{{ activeCount() }}</span>
              </button>
              <button (click)="setFilter('ALL')" 
                      class="px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2"
                      [ngClass]="filterMode() === 'ALL' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:bg-gray-50'">
                 <span>🗂️</span> Historique
                 <span class="bg-white/20 px-1.5 rounded text-xs">{{ missions().length }}</span>
              </button>
           </div>
        </div>

        <div *ngIf="filteredMissions().length > 0; else noMissions">
           <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              @for (trip of filteredMissions(); track trip.uid) {
                 <div class="bg-white shadow-lg rounded-xl border-l-4 overflow-hidden transition-transform hover:scale-[1.02]"
                      [ngClass]="{
                        'border-indigo-500': trip.status === 'PENDING',
                        'border-blue-500': trip.status === 'IN_PROGRESS',
                        'border-green-500': trip.status === 'COMPLETED'
                      }">
                    
                    <div class="p-5">
                        <div class="flex justify-between items-start mb-3">
                           <div>
                              <h3 class="font-bold text-lg text-gray-900">{{ trip.destination }}</h3>
                              <p class="text-sm text-gray-500">Depuis: {{ trip.departure }}</p>
                           </div>
                           <span class="px-2 py-1 text-xs font-bold rounded uppercase tracking-wide"
                                [ngClass]="{
                                  'bg-indigo-100 text-indigo-700': trip.status === 'PENDING',
                                  'bg-blue-100 text-blue-700': trip.status === 'IN_PROGRESS',
                                  'bg-green-100 text-green-700': trip.status === 'COMPLETED'
                                }">
                              {{ trip.status === 'IN_PROGRESS' ? 'En Cours' : (trip.status === 'COMPLETED' ? 'Terminé' : 'En attente') }}
                           </span>
                        </div>
                        
                        <div class="space-y-2 text-sm text-gray-600 mb-4">
                           <div class="flex items-center gap-2">
                              <span>📅</span> {{ trip.date | date:'dd/MM HH:mm' }}
                           </div>
                           <div class="flex items-center gap-2">
                              <span>📦</span> {{ getMergedParcels(trip).length }} Colis à livrer
                           </div>
                           <div *ngIf="trip.extraRequests && trip.extraRequests.length > 0" class="text-xs text-orange-600 font-bold flex items-center gap-1">
                              <span>⚠️</span> {{ trip.extraRequests.length }} Demande(s) ajoutée(s)
                           </div>
                        </div>

                        <button (click)="viewDetails(trip)" class="w-full bg-gray-900 text-white py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                           <span>👁️</span> Voir Détails & Colis
                        </button>
                    </div>
                 </div>
              }
           </div>
        </div>
        
        <ng-template #noMissions>
            <div class="flex flex-col items-center justify-center py-20 text-gray-400">
                <span class="text-6xl mb-4 opacity-50">{{ filterMode() === 'ACTIVE' ? '✅' : '📭' }}</span>
                <p class="text-lg font-bold text-gray-600">
                    {{ filterMode() === 'ACTIVE' ? 'Aucune mission en cours.' : 'Aucun historique disponible.' }}
                </p>
            </div>
        </ng-template>

        @if (selectedTrip(); as trip) {
            <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up my-auto">
                    
                    <div class="bg-gray-900 text-white p-6 flex justify-between items-start">
                        <div>
                        <h3 class="font-bold text-xl">{{ trip.destination }}</h3>
                        <p class="text-gray-300 text-sm mt-1">Départ: {{ trip.departure }}</p>
                        </div>
                        <button (click)="closeDetails()" class="text-gray-400 hover:text-white text-2xl font-bold">✕</button>
                    </div>

                    <div class="p-6 max-h-[70vh] overflow-y-auto">
                        
                        <div class="flex gap-3 mb-8">
                            <button *ngIf="trip.status === 'PENDING'" (click)="updateStatus('IN_PROGRESS')" class="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center justify-center gap-2">
                                🚀 Démarrer la Mission
                            </button>
                            <button *ngIf="trip.status === 'IN_PROGRESS'" (click)="updateStatus('COMPLETED')" class="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-gray-900 flex items-center justify-center gap-2">
                                🏁 Terminer la Mission
                            </button>
                        </div>

                        <h4 class="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
                            <span>📦 Colis à livrer</span>
                            <span class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                               {{ countDelivered(getMergedParcels(trip)) }} / {{ getMergedParcels(trip).length }} livrés
                            </span>
                        </h4>

                        <div class="space-y-4">
                            @for (parcel of getMergedParcels(trip); track $index) {
                                <div class="border rounded-xl p-4 transition-colors relative" 
                                    [ngClass]="parcel.delivered ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'">
                                    
                                    <span *ngIf="isExtraParcel(trip, parcel)" class="absolute top-2 right-2 bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-orange-200">
                                        + Ajouté
                                    </span>

                                    <div class="flex justify-between items-start">
                                        <div class="flex-1">
                                            <div class="flex items-center gap-2 mb-1">
                                                <span class="font-bold text-lg text-gray-800">{{ parcel.description }}</span>
                                                <span *ngIf="parcel.weight" class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{{ parcel.weight }}kg</span>
                                            </div>
                                            
                                            <div class="text-sm space-y-1 mt-2">
                                                <p class="font-bold text-indigo-900">👤 {{ parcel.recipientName }}</p>
                                                <p class="text-gray-600 flex items-start gap-1">
                                                    <span>📍</span> 
                                                    <span>{{ parcel.recipientAddress || 'Adresse non spécifiée' }}</span>
                                                </p>
                                                <p class="text-gray-600 flex items-center gap-1" *ngIf="parcel.recipientPhone">
                                                    <span>📞</span> 
                                                    <a [href]="'tel:' + parcel.recipientPhone" class="text-blue-600 underline font-bold">{{ parcel.recipientPhone }}</a>
                                                </p>
                                            </div>
                                        </div>

                                        <div class="ml-4 flex flex-col items-center gap-1 mt-6">
                                            <button (click)="toggleParcelDelivery(trip, parcel)" 
                                                    class="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm transition-all border-2"
                                                    [ngClass]="parcel.delivered ? 'bg-green-500 text-white border-green-600 scale-110' : 'bg-white text-gray-300 border-gray-200 hover:border-gray-400'">
                                                {{ parcel.delivered ? '✓' : '' }}
                                            </button>
                                            <span class="text-[10px] font-bold uppercase" [class.text-green-600]="parcel.delivered" [class.text-gray-400]="!parcel.delivered">
                                                {{ parcel.delivered ? 'Livré' : 'À faire' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            }
                            @if (getMergedParcels(trip).length === 0) {
                                <div class="text-center py-6 text-gray-400 italic">Aucun colis listé pour ce trajet.</div>
                            }
                        </div>

                    </div>
                </div>
            </div>
        }
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
  
  selectedTrip = signal<Trip | null>(null);
  filterMode = signal<'ACTIVE' | 'ALL'>('ACTIVE');

  missions = toSignal(combineLatest([this.user$, this.cars$, this.allTrips$]).pipe(map(([user, cars, trips]) => {
        if (!user) return [];
        const myCar = cars.find(c => c.assignedDriverId === user.uid);
        if (!myCar) return [];
        return trips.filter(t => t.carId === myCar.uid);
  })), { initialValue: [] });

  filteredMissions = computed(() => {
    const all = this.missions();
    const mode = this.filterMode();
    if (mode === 'ALL') return all;
    return all.filter(t => t.status !== 'COMPLETED');
  });

  activeCount = computed(() => this.missions().filter(t => t.status !== 'COMPLETED').length);

  setFilter(mode: 'ACTIVE' | 'ALL') { this.filterMode.set(mode); }
  viewDetails(trip: Trip) { this.selectedTrip.set(JSON.parse(JSON.stringify(trip))); }
  closeDetails() { this.selectedTrip.set(null); }
  
  async updateStatus(status: 'IN_PROGRESS' | 'COMPLETED') {
     const currentTrip = this.selectedTrip();
     if(currentTrip && currentTrip.uid) {
         await updateDoc(doc(this.firestore, 'trips', currentTrip.uid), { status });
         this.closeDetails();
     }
  }

  // --- NOUVELLE LOGIQUE : Fusion & Sauvegarde Complexe ---

  // 1. Fusionne visuellement les colis de base et les colis des 'extraRequests'
  getMergedParcels(trip: Trip): Parcel[] {
      const mainParcels = trip.parcels || [];
      let extraParcels: Parcel[] = [];

      if (trip.extraRequests) {
          trip.extraRequests.forEach(req => {
              // On accepte les colis des demandes 'PARCEL' (validées ou en attente, selon votre règle métier. Ici on affiche tout pour le chauffeur)
              if (req.type === 'PARCEL' && req.parcels) {
                  extraParcels = [...extraParcels, ...req.parcels];
              }
          });
      }
      return [...mainParcels, ...extraParcels];
  }

  // 2. Vérifie si un colis vient des extras (pour le badge)
  isExtraParcel(trip: Trip, parcel: Parcel): boolean {
      const mainParcels = trip.parcels || [];
      // Vérification par référence ou contenu strict (ici simplifié)
      return !mainParcels.some(p => p.description === parcel.description && p.recipientName === parcel.recipientName);
  }

  countDelivered(parcels: Parcel[]): number {
      return parcels.filter(p => p.delivered).length;
  }

  async toggleParcelDelivery(trip: Trip, parcelToToggle: Parcel) {
      if (!trip.uid) return;

      // A. Est-ce un colis principal ?
      const mainIndex = trip.parcels?.findIndex(p => 
          p.description === parcelToToggle.description && p.recipientName === parcelToToggle.recipientName
      );

      if (mainIndex !== undefined && mainIndex !== -1 && trip.parcels) {
          trip.parcels[mainIndex].delivered = !trip.parcels[mainIndex].delivered;
          await this.tripService.updateParcels(trip.uid, trip.parcels);
      } 
      // B. Sinon, c'est un colis "Extra Request"
      else if (trip.extraRequests) {
          let requestModified = false;
          
          // On parcourt les demandes pour trouver le colis
          for (let i = 0; i < trip.extraRequests.length; i++) {
              const req = trip.extraRequests[i];
              if (req.type === 'PARCEL' && req.parcels) {
                  const pIndex = req.parcels.findIndex(p => 
                      p.description === parcelToToggle.description && p.recipientName === parcelToToggle.recipientName
                  );
                  
                  if (pIndex !== -1) {
                      req.parcels[pIndex].delivered = !req.parcels[pIndex].delivered;
                      requestModified = true;
                      // Note : Ici on modifie l'objet local 'trip'. 
                      // Firestore ne permet pas d'updater un élément précis d'un tableau d'objets imbriqués facilement.
                      // La méthode simple est de réécrire tout le champ extraRequests.
                  }
              }
          }

          if (requestModified) {
              await updateDoc(doc(this.firestore, 'trips', trip.uid), { extraRequests: trip.extraRequests });
          }
      }

      // Mise à jour locale pour l'UI immédiate
      this.selectedTrip.set(JSON.parse(JSON.stringify(trip))); 
  }

  logout() { this.authService.logout().subscribe(); }
}
EOF

echo "✅ Correctif appliqué : Le chauffeur voit maintenant TOUS les colis (Principaux + Demandes Supplémentaires)."