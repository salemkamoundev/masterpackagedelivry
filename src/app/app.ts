import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationTokenService } from './core/services/notification-token.service';
import { MessagingService } from './core/services/messaging.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  notifTokenService = inject(NotificationTokenService);
  title = 'master-delivery';
  private messagingService = inject(MessagingService);
  

  ngOnInit() {
    
    this.notifTokenService.requestPermission && this.notifTokenService.requestPermission("AUTO-CHECK");
    console.log('🚀 Application démarrée - Service Messaging actif');
  }

}