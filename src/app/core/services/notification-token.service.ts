import { Injectable, inject } from '@angular/core';
import { Messaging } from '@angular/fire/messaging';
import { getToken } from 'firebase/messaging'; // Import natif pour éviter l'erreur de contexte
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
    // Écoute user connecté
    this.authService.user$.subscribe(user => {
      if (user) {
        console.log('👤 User connecté → récupération du token FCM…', user.uid);
        this.requestPermission(user.uid);
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

      console.log('✅ Permission acceptée, génération du token...');
      
      // Utilisation de la fonction native getToken avec l'instance injectée
      const token = await getToken(this.messaging as any, {
        vapidKey: environment.firebase.vapidKey
      });

      if (!token) {
        console.warn('❌ Aucun token généré.');
        return;
      }

      console.log('🔑 Token FCM généré et sauvegardé.');
      
      // Sauvegarde Firestore
      await setDoc(
        doc(this.firestore, 'users', userId),
        { fcmToken: token, lastTokenUpdate: new Date().toISOString() },
        { merge: true }
      );

    } catch (e) {
      console.error('❌ Erreur FCM :', e);
    }
  }
}
