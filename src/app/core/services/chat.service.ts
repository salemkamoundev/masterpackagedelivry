import { Injectable, inject } from '@angular/core';
import { Database, ref, push, set, listVal, query, orderByChild } from '@angular/fire/database';
import { Observable, map, BehaviorSubject } from 'rxjs';
import { UserProfile } from '../auth/auth.service';
import { UserService } from './user.service';

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
  private targetUserSource = new BehaviorSubject<UserProfile | null>(null);
  targetUser$ = this.targetUserSource.asObservable();

  startChatWith(user: UserProfile) { this.targetUserSource.next(user); }

  getConversationId(user1: string, user2: string): string {
    return user1 < user2 ? `${user1}_${user2}` : `${user2}_${user1}`;
  }

  async sendMessage(chatId: string, senderId: string, text: string) {
    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, { senderId, text, createdAt: Date.now() });
    
    const metaRef = ref(this.db, `chats/${chatId}/meta`);
    await set(metaRef, { lastMessage: text, lastUpdate: Date.now(), participants: chatId.split('_') });
  }

  getMessages(chatId: string): Observable<ChatMessage[]> {
    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderByChild('createdAt'));
    return listVal(q) as Observable<ChatMessage[]>;
  }

  getContacts(currentUserId: string): Observable<UserProfile[]> {
    return this.userService.getAllUsers().pipe(
      map(users => users.filter(u => u.uid !== currentUserId))
    );
  }
}
