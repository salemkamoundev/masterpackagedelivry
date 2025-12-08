import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, updateDoc, onSnapshot } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserProfile } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);

  // CORRECTION : On utilise new Observable + onSnapshot au lieu de collectionData
  // Cela contourne le bug "outside injection context"
  getAllUsers(): Observable<UserProfile[]> {
    return new Observable((observer) => {
      const usersRef = collection(this.firestore, 'users');
      
      // Écoute temps réel native
      const unsubscribe = onSnapshot(usersRef, 
        (snapshot) => {
          const users = snapshot.docs.map(d => ({ 
            uid: d.id, 
            ...d.data() 
          })) as UserProfile[];
          observer.next(users);
        },
        (error) => {
          observer.error(error);
        }
      );

      // Nettoyage lors du désabonnement
      return () => unsubscribe();
    });
  }

  // Mettre à jour le statut (Validation)
  updateUserStatus(uid: string, isActive: boolean): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);
    return updateDoc(userRef, { isActive });
  }

  // Mettre à jour le rôle (Promotion)
  updateUserRole(uid: string, role: 'DRIVER' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN'): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);
    return updateDoc(userRef, { role });
  }
}
