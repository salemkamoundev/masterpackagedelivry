import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { Auth, user } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'DRIVER' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN';
  company: string;
  phoneNumber: string;
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

  // MISE A JOUR DES TYPES ICI (Ajout de ADMIN et SUPER_ADMIN)
  register(email: string, pass: string, name: string, role: 'DRIVER' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN', company: string, phoneNumber: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, pass)).pipe(
      switchMap(credential => this.createProfile(credential.user, name, role, company, phoneNumber))
    );
  }

  // CORRECTION DE L'ERREUR TS2345 ICI
  createProfile(user: User, name: string, role: 'DRIVER' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN', company: string, phoneNumber: string) {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: name,
      role: role,
      company: company,
      phoneNumber: phoneNumber,
      isActive: false, 
      createdAt: new Date()
    };

    // Le Super Admin est toujours actif par défaut
    if (role === 'SUPER_ADMIN') {
        userProfile.isActive = true;
    }

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
