import { Injectable, inject } from '@angular/core';
import { Database, ref, push, set, listVal, query, orderByChild } from '@angular/fire/database';
import { Observable, map, BehaviorSubject } from 'rxjs';
import { UserProfile } from '../auth/auth.service';
import { UserService } from './user.service';

export interface ChatMessage {
  senderId: string;
  text: string;
  createdAt: number; // RTDB utilise des timestamps numériques (ms)
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private db = inject(Database); // Injection Database au lieu de Firestore
  private userService = inject(UserService);

  private targetUserSource = new BehaviorSubject<UserProfile | null>(null);
  targetUser$ = this.targetUserSource.asObservable();

  startChatWith(user: UserProfile) {
    this.targetUserSource.next(user);
  }

  // Génère un ID unique pour la conversation (ex: "uidA_uidB")
  getConversationId(user1: string, user2: string): string {
    return user1 < user2 ? `${user1}_${user2}` : `${user2}_${user1}`;
  }

  // Envoi de message via Realtime Database
  async sendMessage(chatId: string, senderId: string, text: string) {
    // Référence vers la liste des messages
    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    
    // Création d'un nouveau noeud (push)
    const newMessageRef = push(messagesRef);
    
    // Écriture des données
    await set(newMessageRef, {
      senderId,
      text,
      createdAt: Date.now() // Timestamp JS simple
    });

    // Mise à jour des métadonnées (Dernier message)
    const metaRef = ref(this.db, `chats/${chatId}/meta`);
    await set(metaRef, {
      lastMessage: text,
      lastUpdate: Date.now(),
      participants: chatId.split('_')
    });
  }

  // Récupération des messages en temps réel (listVal retourne un tableau)
  getMessages(chatId: string): Observable<ChatMessage[]> {
    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    // On trie par date de création
    const q = query(messagesRef, orderByChild('createdAt'));
    return listVal(q) as Observable<ChatMessage[]>;
  }

  getContacts(currentUserId: string): Observable<UserProfile[]> {
    return this.userService.getAllUsers().pipe(
      map(users => users.filter(u => u.uid !== currentUserId))
    );
  }
}
