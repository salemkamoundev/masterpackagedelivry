import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, onSnapshot, updateDoc, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface AppNotification {
  uid?: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: any;
  type: 'INFO' | 'ALERT' | 'SUCCESS';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firestore = inject(Firestore);

  async send(userId: string, message: string, type: 'INFO' | 'ALERT' | 'SUCCESS' = 'INFO') {
    const notif: AppNotification = {
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      type
    };
    return addDoc(collection(this.firestore, 'notifications'), notif);
  }

  getNotifications(userId: string): Observable<AppNotification[]> {
    return new Observable((observer) => {
      const q = query(
        collection(this.firestore, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as AppNotification));
        // Tri local simple
        notifs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        observer.next(notifs);
      }, (error) => observer.error(error));
      return () => unsubscribe();
    });
  }

  async markAsRead(notifId: string) {
    const ref = doc(this.firestore, 'notifications', notifId);
    await updateDoc(ref, { read: true });
  }
}
