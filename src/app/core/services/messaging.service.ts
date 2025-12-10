import { Injectable, inject } from '@angular/core';
import { Messaging, getToken } from '@angular/fire/messaging';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private messaging = inject(Messaging);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  constructor() {
    this.init();
  }

  private init() {
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        console.log('👤 Utilisateur connecté. Tentative de récupération du token FCM...');
        this.requestPermission(user.uid);
      } else {
        console.log('Utilisateur non connecté. FCM Service en attente.');
      }
    });
  }

  async requestPermission(userId: string) {
    try {
      alert('+');

      const token = await getToken(this.messaging, {
        // ❗ ICI : on utilise la vraie VAPID key, PAS apiKey
        vapidKey: environment.firebase.vapidKey
      });

      alert('+');

      if (token) {
        console.log('🔑 Token FCM généré et reçu :', token);
        await this.saveToken(userId, token);
      } else {
        console.warn('⚠️ Le navigateur a refusé la permission ou le Service Worker est inaccessible.');
      }
    } catch (error) {
      console.error('❌ Erreur critique lors de getToken (Vérifiez les permissions du navigateur):', error);
    }
  }

  private async saveToken(userId: string, token: string) {
    try {
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        lastTokenUpdate: new Date().toISOString()
      });
      console.log('✅ Token FCM enregistré dans Firestore pour', userId);
    } catch (e) {
      console.error('❌ Erreur sauvegarde Firestore:', e);
    }
  }
}
