import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, writeBatch, doc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private firestore = inject(Firestore);

  // VILLES DE TUNISIE POUR LES TRAJETS
  private cities = [
    { name: 'Tunis', lat: 36.8065, lng: 10.1815 },
    { name: 'Sfax', lat: 34.7406, lng: 10.7603 },
    { name: 'Sousse', lat: 35.8256, lng: 10.6084 },
    { name: 'Gabès', lat: 33.8815, lng: 10.0982 },
    { name: 'Bizerte', lat: 37.2744, lng: 9.8739 },
    { name: 'Nabeul', lat: 36.4540, lng: 10.7350 }
  ];

  async generateAll() {
    console.log('Début du nettoyage...');
    await this.clearFirestore();
    console.log('Base nettoyée. Génération...');

    const batch = writeBatch(this.firestore);
    
    // 1. CRÉATION SOCIÉTÉ
    const companyId = 'comp_tunisia_express';
    batch.set(doc(this.firestore, 'companies', companyId), {
      name: 'Tunisia Express',
      contactEmail: 'contact@tn-express.tn',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    // 2. CRÉATION DES UTILISATEURS
    const drivers: any[] = []; // CORRECTION : Typage explicite
    const admins: any[] = [];  // CORRECTION : Typage explicite

    // -> 3 Chauffeurs
    for (let i = 1; i <= 3; i++) {
       const uid = 'driver_' + Date.now() + '_' + i;
       const driver = {
          uid: uid,
          email: `chauffeur${i}@test.com`,
          role: 'DRIVER',
          company: 'Tunisia Express',
          phoneNumber: '+216 20 000 00' + i,
          isActive: true,
          createdAt: new Date()
       };
       batch.set(doc(this.firestore, 'users', uid), driver);
       drivers.push(driver);

       const carId = 'car_' + uid;
       batch.set(doc(this.firestore, 'cars', carId), {
          model: 'Peugeot Partner',
          plate: `12${i} TN 4567`,
          status: 'BUSY',
          assignedDriverId: uid,
          company: 'Tunisia Express'
       });
    }

    // -> 2 Administrateurs
    for (let i = 1; i <= 2; i++) {
       const uid = 'admin_' + Date.now() + '_' + i;
       const admin = {
          uid: uid,
          email: `admin${i}@test.com`,
          role: 'ADMIN',
          company: 'Tunisia Express',
          phoneNumber: '+216 50 000 00' + i,
          isActive: true,
          createdAt: new Date()
       };
       batch.set(doc(this.firestore, 'users', uid), admin);
       admins.push(admin);
    }

    // 3. CRÉATION DES TRAJETS
    drivers.forEach((driver, index) => {
       for(let j=0; j<2; j++) {
          const start = this.cities[Math.floor(Math.random() * this.cities.length)];
          let end = this.cities[Math.floor(Math.random() * this.cities.length)];
          while(start.name === end.name) end = this.cities[Math.floor(Math.random() * this.cities.length)];

          const tripId = 'trip_' + driver.uid + '_' + j;
          const creator = (Math.random() > 0.5) ? admins[0].email : 'admin@gmail.com'; 

          batch.set(doc(this.firestore, 'trips', tripId), {
             departure: start.name,
             destination: end.name,
             date: new Date().toISOString(),
             status: 'IN_PROGRESS',
             driverId: driver.uid,
             carId: 'car_' + driver.uid,
             company: 'Tunisia Express',
             currentLocation: { lat: start.lat, lng: start.lng, city: start.name, lastUpdate: new Date().toISOString() },
             parcels: [
                { description: 'Colis A', weight: 10, recipient: 'Client X', delivered: false },
                { description: 'Documents', weight: 1, recipient: 'Banque', delivered: true }
             ],
             extraRequests: [
                { requesterEmail: creator, type: 'PARCEL', description: 'Urgent', status: 'PENDING', createdAt: new Date().toISOString() }
             ]
          });
       }
    });

    await batch.commit();
    alert('Données générées : 3 Chauffeurs, 2 Admins, 1 Société, 6 Trajets.');
  }

  private async clearFirestore() {
    const collections = ['users', 'companies', 'cars', 'trips', 'chats'];
    for (const colName of collections) {
      const q = collection(this.firestore, colName);
      const snapshot = await getDocs(q);
      const batch = writeBatch(this.firestore);
      snapshot.docs.forEach((d) => {
         const data = d.data();
         if (colName === 'users' && data['email'] === 'admin@gmail.com') return;
         batch.delete(d.ref);
      });
      await batch.commit();
    }
  }
}
