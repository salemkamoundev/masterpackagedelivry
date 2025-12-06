import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, writeBatch, doc, query } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import { environment } from '../../../environments/environment';

const TUNISIAN_CITIES = [
  { name: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { name: 'Sfax', lat: 34.7406, lng: 10.7603 },
  { name: 'Sousse', lat: 35.8256, lng: 10.6084 },
  { name: 'Gabès', lat: 33.8815, lng: 10.0982 },
  { name: 'Bizerte', lat: 37.2744, lng: 9.8739 },
  { name: 'Tozeur', lat: 33.9197, lng: 8.1335 }
];
const COMPANIES = [{ name: 'Tunisia Express', email: 'contact@tn-express.tn' }, { name: 'Carthage Logistics', email: 'info@carthage.tn' }];

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private firestore = inject(Firestore);

  async generateAll() {
    await this.clearFirestore();
    const secondaryApp = initializeApp(environment.firebase, 'SecondaryApp');
    const secondaryAuth = getAuth(secondaryApp);
    const batch = writeBatch(this.firestore);

    try {
      for (const companyData of COMPANIES) {
        const companyId = 'comp_' + Math.random().toString(36).substr(2, 9);
        const companyRef = doc(this.firestore, 'companies', companyId);
        batch.set(companyRef, { uid: companyId, name: companyData.name, contactEmail: companyData.email, isActive: true, createdAt: new Date().toISOString() });

        for (let i = 0; i < 3; i++) {
           const driver = await this.createUser(secondaryAuth, batch, 'DRIVER', companyData.name);
           // Création Véhicule
           const carId = 'car_' + driver.uid;
           const carRef = doc(this.firestore, 'cars', carId);
           batch.set(carRef, { uid: carId, model: 'Partner', plate: '123 TN 4567', status: 'BUSY', assignedDriverId: driver.uid, company: companyData.name });

           // Création Trajet
           const start = TUNISIAN_CITIES[0];
           const end = TUNISIAN_CITIES[1];
           const tripRef = doc(collection(this.firestore, 'trips'));
           
           // Trajet EN COURS avec coords
           batch.set(tripRef, {
             departure: start.name, destination: end.name,
             departureLat: start.lat, departureLng: start.lng,
             destinationLat: end.lat, destinationLng: end.lng,
             date: new Date().toISOString(), status: 'IN_PROGRESS',
             driverId: driver.uid, carId, company: companyData.name,
             currentLocation: { lat: (start.lat+end.lat)/2, lng: (start.lng+end.lng)/2, city: 'En route', lastUpdate: new Date().toISOString() },
             parcels: []
           });
        }
      }
      await batch.commit();
      alert('Données générées avec succès !');
    } finally {
      await deleteApp(secondaryApp);
    }
  }

  private async createUser(secondaryAuth: Auth, batch: any, role: string, company: string) {
    const email = `${role.toLowerCase()}.${Date.now()}${Math.floor(Math.random()*100)}@test.com`;
    const password = 'Admin123';
    const phone = '+216 22 333 444';
    let uid = 'mock_' + Math.random().toString(36).substr(2, 9);
    try {
       const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
       uid = cred.user.uid;
       await signOut(secondaryAuth);
    } catch(e) {}
    
    const userRef = doc(this.firestore, 'users', uid);
    const userData = { uid, email, role, company, phoneNumber: phone, isActive: true, createdAt: new Date() };
    batch.set(userRef, userData);
    return userData;
  }

  private async clearFirestore() {
    const collections = ['users', 'companies', 'cars', 'trips'];
    for (const colName of collections) {
      const q = query(collection(this.firestore, colName));
      const snapshot = await getDocs(q);
      const batch = writeBatch(this.firestore);
      snapshot.docs.forEach((d) => { if(colName !== 'users' || d.data()['email'] !== 'admin@gmail.com') batch.delete(d.ref); });
      await batch.commit();
    }
  }
}
