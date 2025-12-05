import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc, arrayUnion } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Parcel {
  description: string;
  weight: number;
  recipient: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
  lastUpdate: string;
}

export interface TripRequest {
  type: 'PARCEL' | 'PASSENGER';
  description?: string; // Optionnel si c'est des colis
  parcels?: Parcel[];   // Liste des colis pour la demande
  requesterName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface Trip {
  uid?: string;
  departure: string;
  destination: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  driverId: string;
  carId: string;
  company: string;
  currentLocation?: GeoLocation;
  parcels: Parcel[];
  extraRequests?: TripRequest[]; // Nouvelles demandes (Colis ou Passager)
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

  deleteTrip(tripId: string) {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return deleteDoc(tripRef);
  }

  updatePosition(tripId: string, location: GeoLocation, status: 'IN_PROGRESS' | 'COMPLETED') {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return updateDoc(tripRef, { 
      currentLocation: location,
      status: status
    });
  }

  // Ajouter une demande supplémentaire (Colis ou Passager)
  addRequest(tripId: string, request: TripRequest) {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return updateDoc(tripRef, {
      extraRequests: arrayUnion(request)
    });
  }
}
