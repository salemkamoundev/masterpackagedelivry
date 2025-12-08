import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-mock-data',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-4xl mx-auto py-10 px-4">
      <div class="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
          <h2 class="text-3xl font-bold flex items-center gap-3">
             <span class="text-4xl">⚡</span> Générateur de Données
          </h2>
          <p class="mt-2 text-purple-100">Réinitialisation et peuplement de la base de données.</p>
        </div>

        <div class="p-8">
           <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <div class="flex">
                <span class="text-yellow-400 text-xl mr-3">⚠️</span>
                <div>
                  <p class="text-sm text-yellow-700 font-bold">Action Destructive</p>
                  <p class="text-xs text-yellow-600 mt-1">
                    Ceci supprimera tous les utilisateurs (sauf vous), trajets et sociétés.
                  </p>
                </div>
              </div>
           </div>

           <div class="space-y-4 mb-8 text-gray-600">
              <h3 class="font-bold text-gray-800 border-b pb-2">Ce qui sera créé :</h3>
              <ul class="list-disc pl-5 space-y-1">
                 <li>🏢 <strong>1 Société</strong> (Tunisia Express)</li>
                 <li>👮 <strong>2 Administrateurs</strong> (admin1@test.com, admin2@test.com)</li>
                 <li>🧢 <strong>3 Chauffeurs</strong> (chauffeur1@test.com...)</li>
                 <li>🚚 <strong>3 Véhicules</strong> assignés</li>
                 <li>📦 <strong>6 Trajets</strong> (2 par chauffeur)</li>
              </ul>
           </div>
              
           <button (click)="generate()" [disabled]="isLoading()" 
              class="w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:transform-none bg-indigo-600 hover:bg-indigo-700">
              {{ isLoading() ? 'Traitement en cours...' : 'Lancer la Génération' }}
           </button>
        </div>
      </div>
    </div>
  `
})
export class MockDataComponent {
  private mockService = inject(MockDataService);
  isLoading = signal(false);

  async generate() {
    if(confirm('Êtes-vous sûr de vouloir tout écraser ?')) {
      this.isLoading.set(true);
      try {
        await this.mockService.generateAll();
      } catch (e) {
        alert('Erreur: ' + e);
      }
      this.isLoading.set(false);
    }
  }
}
