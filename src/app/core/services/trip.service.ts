import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc, arrayUnion } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Passenger {
  name: string;
  phone: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  isDroppedOff?: boolean; // Statut de la course (terminée ou non)
}

export interface Parcel {
  description: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  weight: number;
  delivered?: boolean;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
  lastUpdate: string;
}

export interface TripRequest {
  type: 'PARCEL' | 'PASSENGER';
  description?: string;
  parcels?: Parcel[];
  passengers?: Passenger[]; // Ajout support demande passager
  requesterName: string;
  requesterEmail?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface Trip {
  uid?: string;
  departure: string;
  destination: string;
  departureLat?: number;
  departureLng?: number;
  destinationLat?: number;
  destinationLng?: number;

  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  driverId: string;
  carId: string;
  company: string;
  currentLocation?: GeoLocation;
  
  parcels: Parcel[];      // Liste des colis
  passengers: Passenger[]; // NOUVEAU : Liste des passagers
  
  extraRequests?: TripRequest[];
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

  updateParcels(tripId: string, parcels: Parcel[]) {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return updateDoc(tripRef, { parcels });
  }

  // NOUVEAU : Mise à jour des passagers (pour cocher déposé/non déposé)
  updatePassengers(tripId: string, passengers: Passenger[]) {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return updateDoc(tripRef, { passengers });
  }

  addRequest(tripId: string, request: TripRequest) {
    const tripRef = doc(this.firestore, 'trips', tripId);
    return updateDoc(tripRef, {
      extraRequests: arrayUnion(request)
    });
  }
}
