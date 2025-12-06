import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Observable } from 'rxjs';

export interface Car {
  uid?: string;
  model: string;
  plate: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'BUSY';
  assignedDriverId?: string | null;
  company: string;
}

@Injectable({
  providedIn: 'root'
})
export class CarService {
  private firestore = inject(Firestore);
  
  private get carsCollection() {
    return collection(this.firestore, 'cars');
  }

  getCars(): Observable<Car[]> {
    return collectionData(this.carsCollection, { idField: 'uid' }) as Observable<Car[]>;
  }

  addCar(car: Car) {
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
