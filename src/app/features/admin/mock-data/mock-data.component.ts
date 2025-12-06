import { Component, inject } from '@angular/core';
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
          <p class="mt-2 text-purple-100">Outil de simulation pour peupler la base de données avec des scénarios réalistes.</p>
        </div>

        <div class="p-8">
           <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <div class="flex">
                <div class="flex-shrink-0">
                  <span class="text-yellow-400 text-xl">⚠️</span>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-yellow-700">
                    <strong class="font-bold">Attention :</strong> Cette action est irréversible.
                    Elle supprimera tous les utilisateurs (sauf l'admin), sociétés, véhicules et trajets existants 
                    pour les remplacer par un jeu de données de test propre.
                  </p>
                </div>
              </div>
           </div>

           <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div class="space-y-4">
                 <h3 class="font-bold text-gray-800 text-lg border-b pb-2">Ce qui sera généré :</h3>
                 <ul class="space-y-2 text-gray-600">
                    <li class="flex items-center gap-2">🏢 <strong>3 Sociétés</strong> tunisiennes</li>
                    <li class="flex items-center gap-2">👥 <strong>~12 Employés</strong> (3-5 par société)</li>
                    <li class="flex items-center gap-2">🧢 <strong>~12 Chauffeurs</strong> (3-5 par société)</li>
                    <li class="flex items-center gap-2">🚚 <strong>~12 Véhicules</strong> assignés</li>
                    <li class="flex items-center gap-2">📦 <strong>~24 Trajets</strong> (Sfax, Tunis, Sousse...)</li>
                 </ul>
              </div>
              
              <div class="flex flex-col justify-center items-center bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <p class="text-center text-gray-500 mb-6 text-sm">
                     Mot de passe par défaut pour tous les utilisateurs générés :
                     <br><code class="bg-gray-200 px-2 py-1 rounded font-mono text-gray-800 font-bold">Admin123</code>
                  </p>
                  
                  <button (click)="generate()" [disabled]="isLoading" 
                     class="w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transform transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-purple-600 to-indigo-600">
                     {{ isLoading ? 'Génération en cours...' : 'Lancer la Génération' }}
                  </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  `
})
export class MockDataComponent {
  private mockDataService = inject(MockDataService);
  isLoading = false;

  async generate() {
    if(confirm('Êtes-vous sûr de vouloir réinitialiser la base de données ?')) {
      this.isLoading = true;
      await this.mockDataService.generateAll();
      this.isLoading = false;
    }
  }
}
