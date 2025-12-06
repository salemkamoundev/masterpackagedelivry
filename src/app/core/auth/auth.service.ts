import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

// AngularFire
import { Auth, user } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

// SDK Natif
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
  phoneNumber: string; // NOUVEAU CHAMP OBLIGATOIRE
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

  user$ = user(this.auth);
  currentUserProfile = signal<UserProfile | null>(null);

  constructor() {}

  login(email: string, pass: string) {
    return from(signInWithEmailAndPassword(this.auth, email, pass));
  }

  loginGoogle() {
    const provider = new GoogleAuthProvider();
    return from(signInWithPopup(this.auth, provider));
  }

  // Signature mise à jour avec phoneNumber
  register(email: string, pass: string, role: 'DRIVER' | 'EMPLOYEE', company: string, phoneNumber: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, pass)).pipe(
      switchMap(credential => this.createProfile(credential.user, role, company, phoneNumber))
    );
  }

  // Signature mise à jour avec phoneNumber
  createProfile(user: User, role: 'DRIVER' | 'EMPLOYEE', company: string, phoneNumber: string) {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      role: role,
      company: company,
      phoneNumber: phoneNumber,
      isActive: false, 
      createdAt: new Date()
    };
    const userDocRef = doc(this.firestore, 'users', user.uid);
    return from(setDoc(userDocRef, userProfile));
  }

  logout() {
    return from(signOut(this.auth)).pipe(
      map(() => {
        this.router.navigate(['/login']);
      })
    );
  }

  getUserProfile(uid: string): Observable<UserProfile | undefined> {
    const userDocRef = doc(this.firestore, 'users', uid);
    return from(getDoc(userDocRef)).pipe(
      map(snapshot => snapshot.data() as UserProfile)
    );
  }
}
