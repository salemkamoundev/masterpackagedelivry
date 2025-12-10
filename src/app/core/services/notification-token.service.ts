import { Injectable, inject } from '@angular/core';
import { Messaging, getToken } from '@angular/fire/messaging';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationTokenService {
  private messaging = inject(Messaging);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  constructor() {
    this.authService.user$.subscribe(user => {
      if (user) {
        console.log("👤 User connecté → récupération du token FCM…");
        this.requestPermission(user.uid);
      }
    });
  }

  async requestPermission(userId: string) {
    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.warn('❌ Permission refusée');
        return;
      }

      const token = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey
      });

      if (!token) {
        console.warn("❌ Aucun token généré.");
        return;
      }

      console.log("🔑 Token FCM :", token);

      await setDoc(
        doc(this.firestore, `users/${userId}`),
        { fcmToken: token },
        { merge: true }
      );

      console.log("📬 Token enregistré dans Firestore !");
    } catch (e) {
      console.error("❌ Erreur FCM :", e);
    }
  }
}
