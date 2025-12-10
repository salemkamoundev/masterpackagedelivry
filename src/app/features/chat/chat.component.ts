import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../core/services/chat.service';
import { AuthService, UserProfile } from '../../core/auth/auth.service';
import { Observable, of, combineLatest } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-full bg-white overflow-hidden">
      
      <div class="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
        <div class="p-4 border-b border-gray-200 bg-indigo-50">
            <h2 class="font-bold text-indigo-900">Discussions</h2>
        </div>
        <div class="flex-1 overflow-y-auto">
          @for (user of contacts$ | async; track user.uid) {
            <div (click)="selectUser(user)" class="p-4 border-b border-gray-100 cursor-pointer hover:bg-white flex items-center gap-3" 
                 [class.bg-white]="selectedUser()?.uid === user.uid"
                 [class.bg-indigo-50]="selectedUser()?.uid === user.uid"> <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                 
              </div>
              <div class="overflow-hidden">
                 <p class="text-sm font-semibold truncate">{{ user.displayName || user.email }}</p>
                 <p class="text-xs text-gray-500">{{ user.role }}</p>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="flex-1 flex flex-col bg-slate-50 relative">
        @if (selectedUser(); as recipient) {
           <div class="p-4 bg-white border-b shadow-sm flex items-center gap-3 shrink-0">
             <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                {{ (recipient.displayName || recipient.email) }}
             </div>
             <div>
                <h3 class="font-bold text-gray-800">{{ recipient.displayName || recipient.email }}</h3>
             </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-3" #scrollContainer>
             @for (msg of messages$ | async; track msg.createdAt) {
                <div class="flex" [ngClass]="msg.senderId === currentUser()?.uid ? 'justify-end' : 'justify-start'">
                   <div class="max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm break-words" 
                        [ngClass]="msg.senderId === currentUser()?.uid ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'">
                      {{ msg.text }}
                      <div class="text-[10px] mt-1 opacity-70 text-right">
                        {{ msg.createdAt | date:'HH:mm' }}
                      </div>
                   </div>
                </div>
             }
          </div>

          <form (ngSubmit)="sendMessage()" class="p-4 bg-white border-t flex gap-2 shrink-0">
             <input [(ngModel)]="newMessage" name="msg" placeholder="Écrivez votre message..." 
                    class="flex-1 border border-gray-300 rounded-full px-4 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
             <button type="submit" [disabled]="!newMessage.trim()" 
                     class="bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 rounded-full shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                ➤
             </button>
          </form>

        } @else {
          <div class="flex-1 flex flex-col items-center justify-center text-gray-400">
              <span class="text-6xl mb-4">💬</span>
              <p>Sélectionnez une conversation</p>
          </div>
        }
      </div>
    </div>
  `
})
export class ChatComponent implements OnInit {
  private chatService = inject(ChatService);
  public authService = inject(AuthService);
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  currentUser = toSignal(this.authService.user$);
  contacts$: Observable<UserProfile[]> = of([]);
  messages$: Observable<ChatMessage[]> = of([]);
  selectedUser = signal<UserProfile | null>(null);
  newMessage = '';

  ngOnInit() {
    this.authService.user$.subscribe(u => { 
        if (u) this.contacts$ = this.chatService.getContacts(u.uid); 
    });

    // Sélectionner automatiquement l'utilisateur cible s'il est défini dans le service (ex: clic depuis la carte)
    combineLatest([this.authService.user$, this.chatService.targetUser$]).subscribe(([currentUser, targetUser]) => {
      if (currentUser && targetUser && this.selectedUser()?.uid !== targetUser.uid) {
         this.selectUser(targetUser, currentUser.uid);
      }
    });
  }

  selectUser(user: UserProfile, currentUserId?: string) {
    this.selectedUser.set(user);
    const uid = currentUserId || this.currentUser()?.uid;
    if (uid) {
       const chatId = this.chatService.getConversationId(uid, user.uid);
       this.messages$ = this.chatService.getMessages(chatId);
       this.chatService.markChatAsRead(chatId, uid).catch(e => console.error(e));
       this.chatService.markChatAsRead(chatId, uid).catch(e => console.error("Erreur lecture chat:", e)); // MARQUER COMME LU
       // Scroll automatique vers le bas
       setTimeout(() => { this.scrollToBottom(); }, 200);
    }
  }

  sendMessage() {
    if (this.currentUser()?.uid && this.selectedUser() && this.newMessage.trim()) {
       const chatId = this.chatService.getConversationId(this.currentUser()!.uid, this.selectedUser()!.uid);
       this.chatService.sendMessage(chatId, this.currentUser()!.uid, this.newMessage);
       this.newMessage = '';
       setTimeout(() => { this.scrollToBottom(); }, 100);
    }
  }

  private scrollToBottom() {
      if(this.scrollContainer) {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
  }
}