import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

// Imports AngularFire pour l'injection seulement
import { Auth, user } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

// Imports Firebase SDK Natif pour éviter l'erreur "Injection Context"
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from 'firebase/auth';

import { 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  role: 'DRIVER' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN';
  company: string;
  isActive: boolean;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  // Observable de l'état utilisateur Firebase
  user$ = user(this.auth);

  // Signal pour stocker le profil Firestore (optionnel, pour usage réactif)
  currentUserProfile = signal<UserProfile | null>(null);

  constructor() {}

  // Login Email/Password
  login(email: string, pass: string) {
    return from(signInWithEmailAndPassword(this.auth, email, pass));
  }

  // Login Google
  loginGoogle() {
    const provider = new GoogleAuthProvider();
    // Utilisation des fonctions natives firebase/auth et firebase/firestore
    // Cela évite l'erreur d'injection context dans les opérateurs RxJS
    return from(signInWithPopup(this.auth, provider)).pipe(
      switchMap(credential => this.ensureFirestoreProfile(credential.user))
    );
  }

  // Inscription + Création Profil Firestore
  register(email: string, pass: string, role: 'DRIVER' | 'EMPLOYEE', company: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, pass)).pipe(
      switchMap(credential => {
        const userProfile: UserProfile = {
          uid: credential.user.uid,
          email: credential.user.email || '',
          role: role,
          company: company,
          isActive: false, // Par défaut inactif en attente de validation
          createdAt: new Date()
        };
        // Utilisation de doc/setDoc natifs
        const userDocRef = doc(this.firestore, 'users', credential.user.uid);
        return from(setDoc(userDocRef, userProfile));
      })
    );
  }

  logout() {
    return from(signOut(this.auth)).pipe(
      map(() => {
        this.router.navigate(['/login']);
      })
    );
  }

  // Helper pour récupérer le profil Firestore
  getUserProfile(uid: string): Observable<UserProfile | undefined> {
    const userDocRef = doc(this.firestore, 'users', uid);
    return from(getDoc(userDocRef)).pipe(
      map(snapshot => snapshot.data() as UserProfile)
    );
  }

  // S'assure qu'un utilisateur Google a un document
  private ensureFirestoreProfile(user: User): Observable<void> {
    const userDocRef = doc(this.firestore, 'users', user.uid);
    
    // getDoc natif retourne une Promise, convertie par from()
    return from(getDoc(userDocRef)).pipe(
      switchMap(snapshot => {
        if (!snapshot.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            role: 'EMPLOYEE', // Rôle par défaut pour Google
            company: 'Default',
            isActive: true, 
            createdAt: new Date()
          };
          return from(setDoc(userDocRef, newProfile));
        }
        return of(void 0);
      })
    );
  }
}
