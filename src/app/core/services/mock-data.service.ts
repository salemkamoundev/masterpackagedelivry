import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, writeBatch, doc, query } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import { environment } from '../../../environments/environment';

const TUNISIAN_GOVERNORATES = [
  { name: "Tunis", lat: 36.8065, lng: 10.1815 },
  { name: "Ariana", lat: 36.8665, lng: 10.1647 },
  { name: "Ben Arous", lat: 36.7531, lng: 10.2189 },
  { name: "Manouba", lat: 36.8080, lng: 10.0970 },
  { name: "Nabeul", lat: 36.4540, lng: 10.7350 },
  { name: "Zaghouan", lat: 36.4027, lng: 10.1423 },
  { name: "Bizerte", lat: 37.2744, lng: 9.8739 },
  { name: "Béja", lat: 36.7333, lng: 9.1833 },
  { name: "Jendouba", lat: 36.5011, lng: 8.7802 },
  { name: "Le Kef", lat: 36.1829, lng: 8.7140 },
  { name: "Siliana", lat: 36.0833, lng: 9.3833 },
  { name: "Kairouan", lat: 35.6769, lng: 10.1010 },
  { name: "Kasserine", lat: 35.1676, lng: 8.8365 },
  { name: "Sidi Bouzid", lat: 35.0400, lng: 9.4800 },
  { name: "Sousse", lat: 35.8256, lng: 10.6084 },
  { name: "Monastir", lat: 35.7643, lng: 10.8113 },
  { name: "Mahdia", lat: 35.5047, lng: 11.0622 },
  { name: "Sfax", lat: 34.7406, lng: 10.7603 },
  { name: "Gafsa", lat: 34.4250, lng: 8.7842 },
  { name: "Tozeur", lat: 33.9197, lng: 8.1335 },
  { name: "Kébili", lat: 33.7044, lng: 8.9690 },
  { name: "Gabès", lat: 33.8815, lng: 10.0982 },
  { name: "Médenine", lat: 33.3540, lng: 10.5055 },
  { name: "Tataouine", lat: 32.9297, lng: 10.4518 }
];

const COMPANIES = [{ name: 'Tunisia Express', email: 'contact@tn-express.tn' }, { name: 'Carthage Logistics', email: 'info@carthage.tn' }];

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private firestore = inject(Firestore);

  async generateAll() {
    // 1. Nettoyage de Firestore
    await this.clearFirestore();

    // 2. Initialisation App Secondaire pour créer les Auth Users
    const secondaryApp = initializeApp(environment.firebase, 'SecondaryApp');
    const secondaryAuth = getAuth(secondaryApp);
    const batch = writeBatch(this.firestore);

    try {
      for (const companyData of COMPANIES) {
        const companyId = 'comp_' + Math.random().toString(36).substr(2, 9);
        const companyRef = doc(this.firestore, 'companies', companyId);
        batch.set(companyRef, { uid: companyId, name: companyData.name, contactEmail: companyData.email, isActive: true, createdAt: new Date().toISOString() });

        // Création de 3 chauffeurs et 3 employés par société
        for (let i = 0; i < 3; i++) {
           await this.createUser(secondaryAuth, batch, 'DRIVER', companyData.name);
           await this.createUser(secondaryAuth, batch, 'EMPLOYEE', companyData.name);
        }
      }
      await batch.commit();
      alert('Données générées ! Les numéros de téléphone (+216...) ont été correctement ajoutés pour les chauffeurs et employés.');
    } finally {
      await deleteApp(secondaryApp);
    }
  }

  private async createUser(secondaryAuth: Auth, batch: any, role: string, company: string) {
    // Email unique pour éviter les conflits Auth
    const email = `${role.toLowerCase()}.${Date.now()}${Math.floor(Math.random()*100)}@test.com`;
    const password = 'Admin123';
    
    // Génération Numéro Tunisien (Fixe pour test)
    const phonePrefix = ['20', '21', '22', '50', '55', '98', '99'][Math.floor(Math.random() * 7)];
    const phone = `+216 ${phonePrefix} ${Math.floor(Math.random() * 899 + 100)} ${Math.floor(Math.random() * 899 + 100)}`;

    let uid = 'mock_' + Math.random().toString(36).substr(2, 9);
    
    try {
       const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
       uid = cred.user.uid;
       await signOut(secondaryAuth);
    } catch(e) {
       console.warn("Auth creation skipped (Mock fallback):", e);
    }
    
    const userRef = doc(this.firestore, 'users', uid);
    // ICI: On s'assure que phoneNumber est bien dans l'objet
    const userData = { 
        uid, 
        email, 
        role, 
        company, 
        phoneNumber: phone, 
        isActive: true, 
        createdAt: new Date() 
    };
    batch.set(userRef, userData);
    
    // Si Chauffeur : Création Véhicule + Trajet Test
    if(role === 'DRIVER') {
       const carId = 'car_' + uid;
       const carRef = doc(this.firestore, 'cars', carId);
       batch.set(carRef, { uid: carId, model: 'Partner', plate: '123 TN 4567', status: 'BUSY', assignedDriverId: uid, company });
       
       const tripRef = doc(collection(this.firestore, 'trips'));
       
       // Trajet aléatoire entre deux gouvernorats
       const start = TUNISIAN_GOVERNORATES[Math.floor(Math.random() * TUNISIAN_GOVERNORATES.length)];
       let end = TUNISIAN_GOVERNORATES[Math.floor(Math.random() * TUNISIAN_GOVERNORATES.length)];
       while(end === start) end = TUNISIAN_GOVERNORATES[Math.floor(Math.random() * TUNISIAN_GOVERNORATES.length)];

       // Position au milieu (En cours)
       const currentLocation = { 
           lat: (start.lat + end.lat)/2, 
           lng: (start.lng + end.lng)/2, 
           city: 'En route', 
           lastUpdate: new Date().toISOString() 
       };
       
       batch.set(tripRef, { 
          departure: start.name, destination: end.name, 
          departureLat: start.lat, departureLng: start.lng,
          destinationLat: end.lat, destinationLng: end.lng,
          date: new Date().toISOString(), 
          status: 'IN_PROGRESS', driverId: uid, carId, company, currentLocation, parcels: [] 
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
          // NE JAMAIS SUPPRIMER L'ADMIN
          const data = d.data();
          if(colName !== 'users' || (data && data['email'] !== 'admin@gmail.com')) {
              batch.delete(d.ref); 
          }
      });
      await batch.commit();
    }
  }
}
