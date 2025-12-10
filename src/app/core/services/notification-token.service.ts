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
    // 🔥 Dès qu'un user est connecté, on tente de récupérer + sauver son token
    this.authService.user$.subscribe(user => {
      if (user) {
        console.log('👤 User connecté → récupération du token FCM…', user.uid);
        this.requestPermission(user.uid);
      } else {
        console.log('👤 Aucun user connecté → pas de token FCM.');
      }
    });
  }

  async requestPermission(userId: string) {
    try {
      console.log('🔔 Demande de permission de notifications…');
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.warn('❌ Permission notifications refusée');
        return;
      }

      console.log('✅ Permission notifications acceptée, génération du token FCM…');

      const token = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey
      });

      if (!token) {
        console.warn('❌ Aucun token généré (getToken a retourné null).');
        return;
      }

      console.log('🔑 Token FCM généré :', token);

      // ➜ Sauvegarde dans users/{uid}
      await setDoc(
        doc(this.firestore, 'users', userId),
        { fcmToken: token },
        { merge: true }
      );

      console.log('📬 Token FCM enregistré dans Firestore pour user :', userId);
    } catch (e) {
      console.error('❌ Erreur FCM (requestPermission / getToken / setDoc) :', e);
    }
  }
}
