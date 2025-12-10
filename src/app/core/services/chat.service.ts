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

// ❌ plus besoin de Firestore pour le chat
// import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc, arrayUnion } from '@angular/fire/firestore';

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
  // private firestore = inject(Firestore); // ❌ retiré, inutile ici

  private targetUserSource = new BehaviorSubject<UserProfile | null>(null);
  targetUser$ = this.targetUserSource.asObservable();

  // ID connu de l'Admin
  private readonly ADMIN_UID = 'mT28TMpRcBMmulaJuYJtMrrZyUU2';

  startChatWith(user: UserProfile) {
    this.targetUserSource.next(user);
  }

  getConversationId(user1: string, user2: string): string {
    return user1 < user2 ? `${user1}_${user2}` : `${user2}_${user1}`;
  }

  // ✅ Envoi du message dans Realtime Database, là où getMessages lit
  async sendMessage(chatId: string, senderId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return; // on évite d'envoyer des messages vides

    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);

    await set(newMessageRef, {
      senderId,
      text: trimmed,
      createdAt: Date.now()
    });
  }

  // ✅ Lecture des messages depuis la même branche RTDB
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
