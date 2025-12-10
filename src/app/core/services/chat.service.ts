import { Firestore,collection, addDoc, updateDoc, doc, collectionData, setDoc } from '@angular/fire/firestore';
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
import { Observable, BehaviorSubject, from } from 'rxjs';

import { map } from 'rxjs/operators';


import { combineLatest } from 'rxjs';


import { UserProfile, AuthService } from '../auth/auth.service';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';


export interface ChatMessage {
  senderId: string;
  text: string;
  createdAt: number;
}

export interface ChatMetadata {
  timestamp: number;
  read_u1: boolean;
  read_u2: boolean;
}

export interface ChatMessage {
  senderId: string;
  text: string;
  createdAt: number;
}

export interface ChatMetadata {
  timestamp: number;
  read_u1: boolean;
  read_u2: boolean;
}

export interface ChatMessage {
  senderId: string;
  text: string;
  createdAt: number;
}

export interface ChatMetadata {
  timestamp: number;
  read_u1: boolean;
  read_u2: boolean;

}

export interface ChatMessage {
  senderId: string;
  text: string;
  createdAt: number;
}

export interface ChatMetadata {
  timestamp: number;
  read_u1: boolean;
  read_u2: boolean;
}

export interface ChatMessage {
  senderId: string;
  text: string;
  createdAt: number;
}

export interface ChatMetadata {
  timestamp: number;
  read_u1: boolean;
  read_u2: boolean;
}

export interface ChatMessage {
  senderId: string;
  text: string;
  createdAt: number;
}

export interface ChatMetadata {
  lastMessage?: string;
  timestamp: number;
  read_u1: boolean;
  read_u2: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private db = inject(Database);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private notifService = inject(NotificationService);

  private targetUserSource = new BehaviorSubject<UserProfile | null>(null);

  targetUser$ = this.targetUserSource.asObservable();

  // ID connu de l'Admin
  private readonly ADMIN_UID = 'mT28TMpRcBMmulaJuYJtMrrZyUU2';

  startChatWith(user: UserProfile) {
    this.targetUserSource.next(user);
  }

  markChatAsRead(chatId: string, currentUserId: string): Promise<void> {
    const [u1, u2] = chatId.split('_');
    const isU1 = currentUserId === u1;
    const chatRef = doc(this.firestore, 'chats', chatId);
    const metadataUpdate = isU1 ? { read_u1: true } : { read_u2: true };
    return updateDoc(chatRef, metadataUpdate);
  }

  getUnreadCount(currentUserId: string): Observable<number> {
    const chatsRef = collection(this.firestore, 'chats');
    return collectionData(chatsRef, { idField: 'uid' } as any).pipe(
      map((chats: any[]) => {
        let unreadCount = 0;
        chats.forEach(chat => {
          const chatId = chat.uid;
          if (!chatId) return;
          const [u1, u2] = chatId.split('_');
          if (u1 === currentUserId && !chat.read_u1) { unreadCount++; } 
          else if (u2 === currentUserId && !chat.read_u2) { unreadCount++; }
        });
        return unreadCount;
      })
    );
  }

  getConversationId(user1: string, user2: string): string {
    return user1 < user2 ? `${user1}_${user2}` : `${user2}_${user1}`;
  }

  // ==============================
  // Envoi d’un message
  // ==============================
    async sendMessage(chatId: string, senderId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Mise à jour Firestore (Lecture/Non lu)
    const [u1, u2] = chatId.split('_');
    const isU1 = senderId === u1;
    const chatDocRef = doc(this.firestore, 'chats', chatId);
    const metadataUpdate = {
      timestamp: Date.now(),
      read_u1: isU1, 
      read_u2: !isU1 
    };
    await setDoc(chatDocRef, metadataUpdate, { merge: true });

    // Sauvegarde Realtime DB
    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);

    await set(newMessageRef, {
      senderId,
      text: trimmed,
      createdAt: Date.now()
    });
    
    // Sauvegarde Firestore Messages
    const receiverId = senderId === u1 ? u2 : u1;
    await addDoc(collection(this.firestore, 'messages'), {
      chatId,
      senderId,
      receiverId,
      text: trimmed,
      createdAt: Date.now()
    });

    // Notification
    try {
      await this.notifService.send(receiverId, `Nouveau message : ${trimmed.substring(0, 80)}`);
    } catch (e) {
      console.error("Erreur notif:", e);
    }
  }

  // ==============================
  // Récupération des messages
  // ==============================
  getMessages(chatId: string): Observable<ChatMessage[]> {
    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderByChild('createdAt'));
    return listVal<ChatMessage>(q);
  }

  // ==============================
  // Liste des contacts
  // ==============================
  getContacts(currentUserId: string): Observable<UserProfile[]> {
    return this.userService.getAllUsers().pipe(
      map((users: UserProfile[]) => {
        // Admin virtuel si besoin
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

        // On enlève l’utilisateur courant
        return users.filter(u => u.uid !== currentUserId);
      })
    );
  }
}
