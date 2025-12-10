import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationTokenService } from './core/services/notification-token.service';
import { AuthService } from './core/auth/auth.service';
import { Messaging, onMessage } from '@angular/fire/messaging';
import { MatSnackBar } from '@angular/material/snack-bar'; // Optionnel si vous utilisez Material, sinon on utilise l'API native

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private notifTokenService = inject(NotificationTokenService);
  private authService = inject(AuthService);
  private messaging = inject(Messaging);

  title = 'master-delivery';

  ngOnInit() {
    // 1. Gestion des permissions et du Token
    this.authService.user$.subscribe(user => {
      if (user) {
        this.notifTokenService.requestPermission(user.uid);
      }
    });

    // 2. ÉCOUTE DES MESSAGES EN DIRECT (Quand l'appli est ouverte)
    // Par défaut, Firebase ne montre pas de pop-up si l'app est active. On le force ici.
    onMessage(this.messaging, (payload) => {
      console.log('🔔 Notification reçue en direct :', payload);
      
      const title = payload.notification?.title || 'Notification';
      const body = payload.notification?.body || '';

      // A. Jouer un son
      this.playNotificationSound();

      // B. Afficher une notification système (Navigateur)
      if (Notification.permission === "granted") {
        new Notification(title, {
          body: body,
          icon: '/assets/icons/icon-72x72.png' // Assurez-vous d'avoir une icône ou retirez cette ligne
        });
      }

      // C. (Optionnel) Une alerte simple pour être sûr que vous le voyez
      // alert(`🔔 ${title}\n${body}`); 
    });
  }

  playNotificationSound() {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Lecture son bloquée par le navigateur (interaction requise)'));
  }
}
