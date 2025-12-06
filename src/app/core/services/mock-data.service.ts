import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, writeBatch, doc, query } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import { environment } from '../../../environments/environment';

const TUNISIAN_GOVERNORATES = [
  { name: "Tunis", lat: 36.8065, lng: 10.1815 },
  { name: "Sfax", lat: 34.7406, lng: 10.7603 },
  { name: "Sousse", lat: 35.8256, lng: 10.6084 },
  { name: "Gabès", lat: 33.8815, lng: 10.0982 },
  { name: "Bizerte", lat: 37.2744, lng: 9.8739 },
  { name: "Tozeur", lat: 33.9197, lng: 8.1335 },
  { name: "Tataouine", lat: 32.9297, lng: 10.4518 },
  { name: "Kairouan", lat: 35.6769, lng: 10.1010 },
  { name: "Monastir", lat: 35.7643, lng: 10.8113 },
  { name: "Nabeul", lat: 36.4540, lng: 10.7350 }
];

const ITEM_TYPES = ['Pièces Auto', 'Documents', 'Électronique', 'Vêtements', 'Médicaments', 'Outillage', 'Alimentaire Sec'];

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

        // 3 Chauffeurs par société
        for (let i = 0; i < 3; i++) {
           await this.createUser(secondaryAuth, batch, 'DRIVER', companyData.name);
        }
        // 3 Employés par société
        for (let i = 0; i < 3; i++) {
           await this.createUser(secondaryAuth, batch, 'EMPLOYEE', companyData.name);
        }
      }
      await batch.commit();
      alert('Données générées avec succès ! Chaque trajet contient maintenant plusieurs colis.');
    } finally {
      await deleteApp(secondaryApp);
    }
  }

  private async createUser(secondaryAuth: Auth, batch: any, role: string, company: string) {
    const email = `${role.toLowerCase()}.${Date.now()}${Math.floor(Math.random()*100)}@test.com`;
    const password = 'Admin123';
    const phone = `+216 ${Math.floor(Math.random() * 89 + 10)} ${Math.floor(Math.random() * 899 + 100)} ${Math.floor(Math.random() * 899 + 100)}`;

    let uid = 'mock_' + Math.random().toString(36).substr(2, 9);
    try {
       const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
       uid = cred.user.uid;
       await signOut(secondaryAuth);
    } catch(e) { console.warn("Auth skip:", e); }
    
    const userRef = doc(this.firestore, 'users', uid);
    batch.set(userRef, { uid, email, role, company, phoneNumber: phone, isActive: true, createdAt: new Date() });
    
    if(role === 'DRIVER') {
       const carId = 'car_' + uid;
       const carRef = doc(this.firestore, 'cars', carId);
       batch.set(carRef, { uid: carId, model: 'Partner', plate: '123 TN ' + Math.floor(Math.random()*9999), status: 'BUSY', assignedDriverId: uid, company });
       
       const tripRef = doc(collection(this.firestore, 'trips'));
       const start = TUNISIAN_GOVERNORATES[Math.floor(Math.random() * TUNISIAN_GOVERNORATES.length)];
       let end = TUNISIAN_GOVERNORATES[Math.floor(Math.random() * TUNISIAN_GOVERNORATES.length)];
       while(end === start) end = TUNISIAN_GOVERNORATES[Math.floor(Math.random() * TUNISIAN_GOVERNORATES.length)];

       const currentLocation = { 
           lat: (start.lat + end.lat)/2, 
           lng: (start.lng + end.lng)/2, 
           city: 'En route vers ' + end.name, 
           lastUpdate: new Date().toISOString() 
       };
       
       // GÉNÉRATION DES COLIS MULTIPLES
       const numParcels = Math.floor(Math.random() * 4) + 3; // Entre 3 et 6 colis
       const parcels = [];
       for(let k=0; k < numParcels; k++) {
          const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
          parcels.push({
             description: `${type} - Ref: ${Math.floor(Math.random()*1000)}`,
             weight: Math.floor(Math.random() * 20) + 1,
             recipient: `Client ${String.fromCharCode(65+k)}`, // Client A, B, C...
             delivered: false
          });
       }
       
       batch.set(tripRef, { 
          departure: start.name, destination: end.name, 
          departureLat: start.lat, departureLng: start.lng,
          destinationLat: end.lat, destinationLng: end.lng,
          date: new Date().toISOString(), 
          status: 'IN_PROGRESS', driverId: uid, carId, company, currentLocation, 
          parcels: parcels // Liste générée
       });
    }
  }

  private async clearFirestore() {
    const collections = ['users', 'companies', 'cars', 'trips'];
    for (const colName of collections) {
      const q = query(collection(this.firestore, colName));
      const snapshot = await getDocs(q);
      const batch = writeBatch(this.firestore);
      snapshot.docs.forEach((d) => { 
          const data = d.data();
          if(colName !== 'users' || (data && data['email'] !== 'admin@gmail.com')) {
              batch.delete(d.ref); 
          }
      });
      await batch.commit();
    }
  }
}
