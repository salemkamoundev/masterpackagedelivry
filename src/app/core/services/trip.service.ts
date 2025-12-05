import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Parcel {
  description: string;
  weight: number;
  recipient: string;
}

export interface Trip {
  uid?: string;
  departure: string;
  destination: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  driverId: string;
  carId: string;
  parcels: Parcel[];
}

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private firestore = inject(Firestore);
  private tripsCollection = collection(this.firestore, 'trips');

  getTrips(): Observable<Trip[]> {
    return collectionData(this.tripsCollection, { idField: 'uid' }) as Observable<Trip[]>;
  }

  createTrip(trip: Trip) {
    return addDoc(this.tripsCollection, trip);
  }
}
