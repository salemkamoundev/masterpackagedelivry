import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, doc, collectionData, query, where } from '@angular/fire/firestore';
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
  private companiesCollection = collection(this.firestore, 'companies');

  // Signal exposant les sociétés actives pour les listes déroulantes (Register, Filtres)
  activeCompanies = signal<Company[]>([]);

  constructor() {
    // Souscription temps réel pour garder le signal à jour
    this.getCompanies().subscribe(companies => {
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
      isActive: true, // Par défaut une société est active
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
