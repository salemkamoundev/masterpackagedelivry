import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, doc, collectionData, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { take, tap } from 'rxjs/operators';

export interface Company {
  uid?: string;
  name: string;
  contactEmail: string;
  isActive: boolean; // Utilise isActive pour désactiver au lieu de supprimer
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private firestore = inject(Firestore);
  private companiesCollection = collection(this.firestore, 'companies');

  // Signal pour la liste des sociétés actives (utilisé pour les lookups/filtres)
  activeCompanies = signal<Company[]>([]);

  constructor() {
    // Écoute en temps réel les changements pour la liste des sociétés
    // Filtrer directement dans le Firestore est plus efficace, mais pour des raisons de 
    // flexibilité et si le nombre reste petit, nous faisons un filtre post-réception.
    this.getCompanies().subscribe(companies => {
      // Filtrer côté client pour exposer uniquement les sociétés actives
      const active = companies.filter(c => c.isActive);
      this.activeCompanies.set(active);
    });
  }

  getCompanies(): Observable<Company[]> {
    return collectionData(this.companiesCollection, { idField: 'uid' }) as Observable<Company[]>;
  }

  addCompany(company: Omit<Company, 'uid' | 'createdAt'>) {
    const newCompany: Company = {
      ...company,
      isActive: true, // Active par défaut
      createdAt: new Date().toISOString()
    };
    return addDoc(this.companiesCollection, newCompany);
  }

  updateCompany(uid: string, data: Partial<Omit<Company, 'uid' | 'createdAt'>>) {
    const companyRef = doc(this.firestore, 'companies', uid);
    return updateDoc(companyRef, data);
  }

  // Désactivation (Règle métier: ne pas supprimer, juste désactiver)
  toggleStatus(uid: string, isActive: boolean) {
    return this.updateCompany(uid, { isActive });
  }
}
