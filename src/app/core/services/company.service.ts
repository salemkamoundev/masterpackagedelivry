import { Injectable, inject, signal } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore'; // Import AngularFire pour l'Observable
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'; // Imports Natifs pour les actions
import { Observable } from 'rxjs';

export interface Company {
  uid?: string;
  name: string;
  contactEmail: string;
  isActive: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private firestore = inject(Firestore);
  
  // Utilisation de la fonction collection native avec l'instance injectée
  private get companiesCollection() {
    return collection(this.firestore, 'companies');
  }

  activeCompanies = signal<Company[]>([]);

  constructor() {
    this.getCompanies().subscribe(companies => {
      const active = companies.filter(c => c.isActive);
      this.activeCompanies.set(active);
    });
  }

  getCompanies(): Observable<Company[]> {
    // collectionData accepte une référence native et retourne un Observable
    return collectionData(this.companiesCollection, { idField: 'uid' }) as Observable<Company[]>;
  }

  addCompany(company: Omit<Company, 'uid' | 'createdAt'>) {
    const newCompany: Company = {
      ...company,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    return addDoc(this.companiesCollection, newCompany);
  }

  updateCompany(uid: string, data: Partial<Omit<Company, 'uid' | 'createdAt'>>) {
    const companyRef = doc(this.firestore, 'companies', uid);
    return updateDoc(companyRef, data);
  }

  toggleStatus(uid: string, isActive: boolean) {
    return this.updateCompany(uid, { isActive });
  }
}
