import { Component, inject, OnInit } from '@angular/core';
import { NotificationTokenService } from "./core/services/notification-token.service";
import { RouterOutlet } from '@angular/router';
import { MessagingService } from './core/services/messaging.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  notifTokenService = inject(NotificationTokenService);
  title = 'master-delivery';
  private messagingService = inject(MessagingService);
  

  ngOnInit() {
    alert("'fdsqfds111")
    this.notifTokenService.requestPermission && this.notifTokenService.requestPermission("AUTO-CHECK");
    console.log('🚀 Application démarrée - Service Messaging actif');
  }
}
