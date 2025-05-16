import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreService } from './firestore.service';
import { User } from '@angular/fire/auth';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: string;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private firestore: FirestoreService) {}

  async createUserProfile(user: User): Promise<void> {
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ?? '未設定',
      photoURL: user.photoURL ?? null,
      role: 'user',
      createdAt: Date.now(),
    };
    
    await this.firestore.setDocument(`users/${user.uid}`, userData);
  }

  getUserProfile(uid: string): Observable<UserProfile> {
    return this.firestore.getDocumentObservable<UserProfile>(`users/${uid}`);
  }

  setUserProfile(profile: UserProfile): Promise<void> {
    return this.firestore.setDocument(`users/${profile.uid}`, profile);
  }

  
}