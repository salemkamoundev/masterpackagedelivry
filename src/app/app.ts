import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationTokenService } from './core/services/notification-token.service';
import { AuthService } from './core/auth/auth.service';
import { MessagingService } from './core/services/messaging.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {

  private notifTokenService = inject(NotificationTokenService);
  private authService = inject(AuthService);
  private messagingService = inject(MessagingService);

  title = 'master-delivery';

  ngOnInit() {

    // 🔥 Lorsqu'un utilisateur se connecte → On génère et enregistre son token FCM
    this.authService.user$.subscribe(user => {
      if (user) {
        console.log("🔔 Utilisateur connecté → génération du token FCM pour :", user.uid);
        this.notifTokenService.requestPermission(user.uid);
      }
    });

    console.log('🚀 Application démarrée - Notifications prêtes.');
  }
}
