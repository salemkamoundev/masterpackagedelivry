import { Injectable, inject, signal } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, user, User } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

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

  user$ = user(this.auth);
  currentUserProfile = signal<UserProfile | null>(null);

  constructor() {}

  // Login Email/Password
  login(email: string, pass: string) {
    return from(signInWithEmailAndPassword(this.auth, email, pass));
  }

  // Login Google (Ne crée PLUS le profil automatiquement)
  loginGoogle() {
    const provider = new GoogleAuthProvider();
    return from(signInWithPopup(this.auth, provider));
  }

  // Inscription Email (Crée le profil immédiatement)
  register(email: string, pass: string, role: 'DRIVER' | 'EMPLOYEE', company: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, pass)).pipe(
      switchMap(credential => this.createProfile(credential.user, role, company))
    );
  }

  // Méthode publique pour créer le profil (utilisée par Register et CompleteProfile)
  createProfile(user: User, role: 'DRIVER' | 'EMPLOYEE', company: string) {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      role: role,
      company: company,
      isActive: false, // Inactif par défaut
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
