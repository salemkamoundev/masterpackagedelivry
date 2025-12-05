import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserProfile } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);

  // Récupérer tous les utilisateurs
  getAllUsers(): Observable<UserProfile[]> {
    const usersRef = collection(this.firestore, 'users');
    // idField permet d'inclure l'ID du document dans l'objet sous le nom 'uid'
    return collectionData(usersRef, { idField: 'uid' }) as Observable<UserProfile[]>;
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
