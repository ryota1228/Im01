import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
  sendPasswordResetEmail
} from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  router: any;

  constructor(private auth: Auth, private userService: UserService) {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
      // if (user) {
      //   this.userService.createUserProfile(user);
      // }
    });
  }

  loginWithEmailPassword(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async registerWithEmailPassword(email: string, password: string): Promise<UserCredential> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);

    await this.userService.createUserProfile(credential.user);

    return credential;
  }

  loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  // logout(): Promise<void> {
  //   return signOut(this.auth);
  // }

  logout(): Promise<void> {
    return signOut(this.auth); // Firebase Auth の signOut は Promise を返す
  }

  sendPasswordReset(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  waitForAuthInit(): Observable<User | null> {
    return new Observable<User | null>((observer) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        observer.next(user);
        observer.complete();
      });
      return { unsubscribe };
    });
  }
  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }
  
  register(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }
}
