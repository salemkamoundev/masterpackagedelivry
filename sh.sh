#!/bin/bash

echo "--------------------------------------------------------"
echo "🔧 SNIPPET 1 : NotificationService avec getUnreadCount()"
echo "--------------------------------------------------------"
cat << 'EOF'

// src/app/core/services/notification.service.ts

import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  query,
  where,
  updateDoc,
  doc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AppNotification {
  id?: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: 'CHAT' | 'TRIP' | 'INFO' | 'ALERT' | 'SUCCESS';
  tripId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firestore = inject(Firestore);

  // Créer une notification
  send(
    userId: string,
    message: string,
    type: AppNotification['type'] = 'INFO',
    extra?: { tripId?: string }
  ) {
    const notif: AppNotification = {
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      type,
      ...(extra ?? {})
    };

    return addDoc(collection(this.firestore, 'notifications'), notif);
  }

  // Stream des notifications d'un utilisateur
  getNotifications(userId: string): Observable<AppNotification[]> {
    const col = collection(this.firestore, 'notifications');
    const q = query(col, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }) as Observable<AppNotification[]>;
  }

  // Compteur de notifications non lues, optionnellement filtrées par type
  getUnreadCount(userId: string, type?: AppNotification['type']): Observable<number> {
    const col = collection(this.firestore, 'notifications');

    let q;
    if (type) {
      q = query(
        col,
        where('userId', '==', userId),
        where('read', '==', false),
        where('type', '==', type)
      );
    } else {
      q = query(
        col,
        where('userId', '==', userId),
        where('read', '==', false)
      );
    }

    return collectionData(q).pipe(map((notifs) => notifs.length));
  }

  // Marquer une notification comme lue
  async markAsRead(id: string) {
    const ref = doc(this.firestore, 'notifications', id);
    await updateDoc(ref, { read: true });
  }

  // Marquer toutes les notifications d'un type comme lues
  async markAllAsRead(userId: string, type?: AppNotification['type']) {
    const col = collection(this.firestore, 'notifications');
    let q;
    if (type) {
      q = query(
        col,
        where('userId', '==', userId),
        where('type', '==', type),
        where('read', '==', false)
      );
    } else {
      q = query(
        col,
        where('userId', '==', userId),
        where('read', '==', false)
      );
    }

    const snap = await import('@angular/fire/firestore').then(m => m.getDocs(q));
    for (const docSnap of snap.docs) {
      await updateDoc(docSnap.ref, { read: true });
    }
  }
}
EOF

echo
echo "--------------------------------------------------------"
echo "🔧 SNIPPET 2 : DriverDashboardComponent (TS) avec badges"
echo "--------------------------------------------------------"
cat << 'EOF'

// src/app/features/driver/dashboard/driver-dashboard.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService, UserProfile } from '../../../core/auth/auth.service';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-dashboard.component.html',
  styleUrls: ['./driver-dashboard.component.scss']
})
export class DriverDashboardComponent implements OnInit {

  private notifService = inject(NotificationService);
  private authService = inject(AuthService);

  currentUser$!: Observable<UserProfile | null>;
  unreadChatCount$!: Observable<number>;
  unreadTripCount$!: Observable<number>;

  constructor() {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.user$;

    // Pastille messages
    this.unreadChatCount$ = this.authService.user$.pipe(
      filter((u): u is UserProfile => !!u),
      switchMap((u) => this.notifService.getUnreadCount(u.uid, 'CHAT'))
    );

    // Pastille trajets
    this.unreadTripCount$ = this.authService.user$.pipe(
      filter((u): u is UserProfile => !!u),
      switchMap((u) => this.notifService.getUnreadCount(u.uid, 'TRIP'))
    );
  }

  // Appelé quand le chauffeur ouvre l'onglet Messages
  markChatAsRead() {
    this.currentUser$.pipe(filter((u): u is UserProfile => !!u))
      .subscribe((user) => {
        this.notifService.markAllAsRead(user.uid, 'CHAT');
      });
  }

  // Appelé quand le chauffeur ouvre l'onglet Trajets
  markTripAsRead() {
    this.currentUser$.pipe(filter((u): u is UserProfile => !!u))
      .subscribe((user) => {
        this.notifService.markAllAsRead(user.uid, 'TRIP');
      });
  }
}
EOF

echo
echo "--------------------------------------------------------"
echo "🔧 SNIPPET 3 : DriverDashboard HTML avec pastilles"
echo "--------------------------------------------------------"
cat << 'EOF'
<!-- src/app/features/driver/dashboard/driver-dashboard.component.html -->

<div class="driver-dashboard">

  <!-- Bouton Messages avec pastille -->
  <button class="btn btn-outline-primary position-relative"
          (click)="markChatAsRead()">
    💬 Messages
    <span *ngIf="(unreadChatCount$ | async) as chatCount">
      <span *ngIf="chatCount > 0"
            class="badge bg-danger rounded-pill position-absolute top-0 start-100 translate-middle">
        {{ chatCount }}
      </span>
    </span>
  </button>

  <!-- Exemple de carte trajet avec pastille -->
  <div *ngFor="let trip of trips$ | async" class="card position-relative">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h5 class="card-title">{{ trip.from }} → {{ trip.to }}</h5>
          <p class="card-text">
            {{ trip.date | date:'short' }} - {{ trip.price }} TND
          </p>
        </div>

        <!-- Pastille rouge si notif TRIP non lue pour ce trajet -->
        <span *ngIf="trip.hasUnreadNotification"
              class="badge bg-danger rounded-pill">
          !
        </span>
      </div>
    </div>
  </div>

</div>
EOF

echo
echo "✅ Terminé. Copie les snippets affichés au-dessus dans les fichiers indiqués."
