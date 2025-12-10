import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  listVal,
  query,
  orderByChild
} from '@angular/fire/database';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfile, AuthService } from '../auth/auth.service';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';

export interface ChatMessage {
  senderId: string;
  text: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private db = inject(Database);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private notifService = inject(NotificationService); // ✅ ICI l’injection correcte

  private targetUserSource = new BehaviorSubject<UserProfile | null>(null);
  targetUser$ = this.targetUserSource.asObservable();

  // ID connu de l'Admin (récupéré de vos logs précédents)
  private readonly ADMIN_UID = 'mT28TMpRcBMmulaJuYJtMrrZyUU2';

  startChatWith(user: UserProfile) {
    this.targetUserSource.next(user);
  }

  getConversationId(user1: string, user2: string): string {
    return user1 < user2 ? `${user1}_${user2}` : `${user2}_${user1}`;
  }

  // ⬇️ Envoi du message + meta + notification app
  async sendMessage(chatId: string, senderId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return; // on évite les messages vides

    // 1. Sauvegarde du message dans Realtime DB
    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, {
      senderId,
      text: trimmed,
      createdAt: Date.now()
    });

    // 2. Mise à jour des métadonnées de la conversation
    const metaRef = ref(this.db, `chats/${chatId}/meta`);
    await set(metaRef, {
      lastMessage: trimmed,
      lastUpdate: Date.now(),
      participants: chatId.split('_')
    });

    // 3. Notification "in-app" pour l’autre utilisateur
    const [u1, u2] = chatId.split('_');
    const targetId = senderId === u1 ? u2 : u1;

    if (targetId) {
      try {
        await this.notifService.send(
          targetId,
          `Nouveau message : ${trimmed.substring(0, 80)}`
        );
      } catch (e) {
        console.error('Erreur lors de l’envoi de la notification :', e);
      }
    }
  }

  getMessages(chatId: string): Observable<ChatMessage[]> {
    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderByChild('createdAt'));
    return listVal<ChatMessage>(q);
  }

  getContacts(currentUserId: string): Observable<UserProfile[]> {
    return this.userService.getAllUsers().pipe(
      map(users => {
        const virtualAdmin: UserProfile = {
          uid: this.ADMIN_UID,
          email: 'admin@gmail.com',
          displayName: '⚡ Support / Admin',
          role: 'SUPER_ADMIN',
          company: 'System',
          isActive: true,
          phoneNumber: '+216 00 000 000',
          createdAt: new Date()
        };

        const adminExists = users.some(
          u => u.uid === this.ADMIN_UID || u.email === 'admin@gmail.com'
        );

        if (!adminExists) {
          users.unshift(virtualAdmin);
        }

        return users.filter(u => u.uid !== currentUserId);
      })
    );
  }
}
