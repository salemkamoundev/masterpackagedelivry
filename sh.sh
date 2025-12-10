#!/bin/bash

TARGET_FILE="src/app/core/services/chat.service.ts"
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}💬 Forçage de l'affichage de l'Admin dans le Chat...${NC}"

cat <<'EOF' > "$TARGET_FILE"
import { Injectable, inject } from '@angular/core';
import { Database, ref, push, set, listVal, query, orderByChild } from '@angular/fire/database';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfile, AuthService } from '../auth/auth.service';
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
  private authService = inject(AuthService);
  
  private targetUserSource = new BehaviorSubject<UserProfile | null>(null);
  targetUser$ = this.targetUserSource.asObservable();

  // ID Connu de l'Admin (récupéré de vos logs précédents)
  // Cela permet de relier les conversations existantes
  private readonly ADMIN_UID = 'mT28TMpRcBMmulaJuYJtMrrZyUU2'; 

  startChatWith(user: UserProfile) { 
    this.targetUserSource.next(user);
  }

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
      map(users => {
        // 1. Création du profil Admin de secours (Fallback)
        const virtualAdmin: UserProfile = {
            uid: this.ADMIN_UID,
            email: 'admin@gmail.com',
            displayName: '⚡ Support / Admin', // Nom affiché
            role: 'SUPER_ADMIN',
            company: 'System',
            isActive: true,
            phoneNumber: '+216 00 000 000',
            createdAt: new Date()
        };

        // 2. Vérifie si l'admin est déjà dans la liste récupérée de Firebase
        const adminExists = users.some(u => u.uid === this.ADMIN_UID || u.email === 'admin@gmail.com');

        // 3. S'il n'existe pas, on l'ajoute manuellement en haut de liste
        if (!adminExists) {
            users.unshift(virtualAdmin);
        }

        // 4. Filtrage final : On retire l'utilisateur courant (moi-même)
        return users.filter(u => u.uid !== currentUserId);
      })
    );
  }
}
EOF

echo -e "${GREEN}✅ Chat réparé : L'Admin apparaîtra maintenant toujours dans la liste.${NC}"