import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../core/services/chat.service';
import { AuthService, UserProfile } from '../../core/auth/auth.service';
import { Observable, of, combineLatest } from 'rxjs'; // Ajout combineLatest
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-100px)] bg-white border rounded-lg shadow-sm overflow-hidden m-4">
      
      <div class="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
        <div class="p-4 border-b border-gray-200 bg-indigo-50">
           <h2 class="font-bold text-indigo-900">Discussions</h2>
        </div>
        <div class="flex-1 overflow-y-auto">
          @for (user of contacts$ | async; track user.uid) {
            <div (click)="selectUser(user)" 
                 class="p-4 border-b border-gray-100 cursor-pointer hover:bg-white flex items-center gap-3 transition-colors"
                 [class.bg-white]="selectedUser()?.uid === user.uid"
                 [class.border-l-4]="selectedUser()?.uid === user.uid"
                 [class.border-l-indigo-500]="selectedUser()?.uid === user.uid">
              <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                 {{ user.email.charAt(0).toUpperCase() }}
              </div>
              <div class="overflow-hidden">
                 <p class="text-sm font-semibold text-gray-900 truncate">{{ user.email }}</p>
                 <p class="text-xs text-gray-500">{{ user.role }}</p>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="flex-1 flex flex-col bg-slate-50 relative">
        @if (selectedUser(); as recipient) {
          <div class="p-4 bg-white border-b shadow-sm flex items-center gap-3">
             <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                {{ recipient.email.charAt(0).toUpperCase() }}
             </div>
             <div><h3 class="font-bold text-gray-800">{{ recipient.email }}</h3></div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-3" #scrollContainer>
             @for (msg of messages$ | async; track msg.createdAt) {
                <div class="flex" [ngClass]="msg.senderId === currentUser()?.uid ? 'justify-end' : 'justify-start'">
                   <div class="max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm"
                        [ngClass]="msg.senderId === currentUser()?.uid ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'">
                      {{ msg.text }}
                      <div class="text-[10px] mt-1 opacity-70 text-right">
                        {{ msg.createdAt | date:'HH:mm' }}
                      </div>
                   </div>
                </div>
             }
          </div>

          <form (ngSubmit)="sendMessage()" class="p-4 bg-white border-t flex gap-2">
             <input [(ngModel)]="newMessage" name="msg" placeholder="Écrivez votre message..." autocomplete="off"
                    class="flex-1 border-gray-300 rounded-full px-4 py-2 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
             <button type="submit" [disabled]="!newMessage.trim()" class="bg-indigo-600 text-white w-10 h-10 rounded-full shadow hover:bg-indigo-700 flex items-center justify-center">➤</button>
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
    // 1. Charger les contacts
    this.authService.user$.subscribe(u => {
      if (u) this.contacts$ = this.chatService.getContacts(u.uid);
    });

    // 2. CORRECTION CRITIQUE : Attendre que l'User ET le TargetUser soient prêts
    combineLatest([
      this.authService.user$,           // L'utilisateur connecté
      this.chatService.targetUser$      // La cible (venant des trajets)
    ]).subscribe(([currentUser, targetUser]) => {
      // Si on a les deux et qu'on n'a pas encore sélectionné cet utilisateur
      if (currentUser && targetUser && this.selectedUser()?.uid !== targetUser.uid) {
         this.selectUser(targetUser, currentUser.uid); // On force l'ID courant pour être sûr
      }
    });
  }

  // Accepte l'ID courant en option pour éviter le problème de signal non prêt
  selectUser(user: UserProfile, currentUserId?: string) {
    this.selectedUser.set(user);
    
    // On prend soit l'ID passé explicitement, soit celui du signal
    const uid = currentUserId || this.currentUser()?.uid;

    if (uid) {
       const chatId = this.chatService.getConversationId(uid, user.uid);
       this.messages$ = this.chatService.getMessages(chatId);
       setTimeout(() => this.scroll(), 200);
    } else {
       console.error("Impossible de charger le chat : Utilisateur non connecté ?");
    }
  }

  sendMessage() {
    if (this.currentUser()?.uid && this.selectedUser() && this.newMessage.trim()) {
       const chatId = this.chatService.getConversationId(this.currentUser()!.uid, this.selectedUser()!.uid);
       this.chatService.sendMessage(chatId, this.currentUser()!.uid, this.newMessage);
       this.newMessage = '';
       this.scroll();
    }
  }

  scroll() { 
    setTimeout(() => {
        if(this.scrollContainer) {
            try { this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight; } catch(e) {} 
        }
    }, 100);
  }
}
