import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, doc, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Car {
  uid?: string;
  model: string;
  plate: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'BUSY';
  assignedDriverId?: string | null; // ID du chauffeur affecté
  company: string; // NOUVEAU: Société propriétaire du véhicule
}

@Injectable({
  providedIn: 'root'
})
export class CarService {
  private firestore = inject(Firestore);
  private carsCollection = collection(this.firestore, 'cars');

  getCars(): Observable<Car[]> {
    return collectionData(this.carsCollection, { idField: 'uid' }) as Observable<Car[]>;
  }

  addCar(car: Car) {
    // Le champ 'company' est inclus dans l'objet 'car' passé en argument
    return addDoc(this.carsCollection, car);
  }

  updateCar(carId: string, data: Partial<Car>) {
    const carRef = doc(this.firestore, 'cars', carId);
    return updateDoc(carRef, data);
  }

  assignDriver(carId: string, driverId: string | null) {
    const carRef = doc(this.firestore, 'cars', carId);
    return updateDoc(carRef, { 
      assignedDriverId: driverId,
      status: driverId ? 'BUSY' : 'AVAILABLE'
    });
  }
}
