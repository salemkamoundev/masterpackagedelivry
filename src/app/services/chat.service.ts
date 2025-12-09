import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Database, ref, listVal, objectVal, push, serverTimestamp } from '@angular/fire/database';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private db = inject(Database);
  private injector = inject(Injector);

  constructor() {}

  // --- GESTION DES ID UNIQUES ---
  private createChatId(user1: string, user2: string): string {
    return [user1, user2].sort().join('_');
  }

  // --- RÉCUPÉRER LES MESSAGES ---
  getMessages(currentUser: string, otherUser: string): Observable<any[]> {
    const chatId = this.createChatId(currentUser, otherUser);
    const chatRef = ref(this.db, 'chats/' + chatId);

    return runInInjectionContext(this.injector, () => {
      return listVal(chatRef);
    });
  }

  // --- ENVOYER UN MESSAGE ---
  sendMessage(senderId: string, receiverId: string, text: string) {
    const chatId = this.createChatId(senderId, receiverId);
    const chatRef = ref(this.db, 'chats/' + chatId);

    const message = {
      senderId: senderId,
      receiverId: receiverId,
      text: text,
      timestamp: serverTimestamp()
    };

    return push(chatRef, message);
  }

  // --- COMPTEUR NON-LUS (Celui qui posait problème) ---
  getTotalUnreadCount(userId: string) {
    const countRef = ref(this.db, 'unread_counts/' + userId);
    
    return runInInjectionContext(this.injector, () => {
      return objectVal(countRef);
    });
  }
}
