import {
  Firestore,
  collection,
  collectionData,
  CollectionReference,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  DocumentReference,
  DocumentData,
  WithFieldValue,
  docData,
  getDocs
} from '@angular/fire/firestore';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { UpdateData } from '@angular/fire/firestore';
import { Task } from '../models/task.model';
import { taskConverter } from '../models/task.model';
import { Section } from '../models/section.model';
import { firstValueFrom } from 'rxjs';
import { Input } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FirestoreService {

  @Input() projectId!: string;

  isFixed = true


  constructor(
    private firestore: Firestore = inject(Firestore)
  ) {}

  initializeDefaultSections(projectId: string): Promise<void> {
    const defaultSections = [
      { title: '目標・マイルストーン', order: 0 },
      { title: 'テンプレート', order: 1 },
      { title: 'やること', order: 2 },
      { title: '完了済', order: 3, isFixed: true }
    ];

    const sectionRef = collection(this.firestore, `projects/${projectId}/sections`);
    return Promise.all(defaultSections.map(s => addDoc(sectionRef, s))).then(() => {});
  }  

  getCollection<T extends DocumentData>(path: string): Observable<T[]> {
    const ref = collection(this.firestore, path) as any;
    return collectionData(ref, { idField: 'id' }) as Observable<T[]>;
  }

  getDocument<T extends DocumentData>(path: string): Promise<T | undefined> {
    const ref = doc(this.firestore, path);
    return getDoc(ref).then(snapshot => snapshot.exists() ? snapshot.data() as T : undefined);
  }

  addToCollection<T extends DocumentData>(
    path: string,
    data: WithFieldValue<T>
  ): Promise<DocumentReference<DocumentData>> {
    const ref = collection(this.firestore, path);
    return addDoc(ref, data);
  }

  setDocument(
    path: string,
    data: any
  ): Promise<void> {
    const ref = doc(this.firestore, path) as DocumentReference<DocumentData>;
    return setDoc(ref, data, { merge: true });
  }

  updateDocument<T extends DocumentData>(
    path: string,
    data: Partial<T>
  ): Promise<void> {
    const ref = doc(this.firestore, path) as any;
    return updateDoc(ref, data as UpdateData<T>);
  }

  updateTask(projectId: string, taskId: string, data: Partial<Task>): Promise<void> {
    const taskRef = doc(this.firestore, `projects/${projectId}/tasks/${taskId}`);
    return setDoc(taskRef, data, { merge: true });
  }
  
  deleteDocument(path: string): Promise<void> {
    const ref = doc(this.firestore, path);
    return deleteDoc(ref);
  }

  getDocumentObservable<T>(path: string): Observable<T> {
    const ref = doc(this.firestore, path);
    return docData(ref) as Observable<T>;
  }

  getTasks(): Observable<Task[]> {
    const tasksRef = collection(this.firestore, 'tasks') as CollectionReference<Task>;
    const converted = tasksRef.withConverter(taskConverter);
    return collectionData(converted, { idField: 'id' }).pipe(
      tap(data => console.log('[DEBUG] Firestoreデータ:', data))
    ) as Observable<Task[]>;
  }

  async getAllTasks(projectId: string): Promise<Task[]> {
    const snapshot = await getDocs(collection(this.firestore, `projects/${projectId}/tasks`));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  }

  getTasksByProjectId(projectId: string): Observable<Task[]> {
    const taskCollection = collection(this.firestore, `projects/${projectId}/tasks`);
    return collectionData(taskCollection, { idField: 'id' }) as Observable<Task[]>;
  }

  async getTasksByProjectIdOnce(projectId: string): Promise<Task[]> {
    const taskCollection = collection(this.firestore, `projects/${projectId}/tasks`);
    return await firstValueFrom(
      collectionData(taskCollection, { idField: 'id' }) as Observable<Task[]>
    );
  }

  getUsersByIds(userIds: string[]): Promise<{ uid: string, displayName: string }[]> {
    const userPromises = userIds.map(uid =>
      this.getDocument<{ displayName: string }>(`users/${uid}`).then(data => ({
        uid,
        displayName: data?.displayName ?? '未登録ユーザー'
      }))
    );
    return Promise.all(userPromises);
  }

  getUserById(uid: string): Promise<{
    [x: string]: string; displayName: string 
} | undefined> {
    return this.getDocument<{ displayName: string }>(`users/${uid}`);
  }

  async getUsers(): Promise<{ uid: string, displayName: string, email: string }[]> {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...(doc.data() as { displayName: string; email: string })
    }));
  }
  

  // async getUsers(): Promise<{ uid: string, displayName: string, email: string }[]> {
  //   const usersRef = collection(this.firestore, 'users');
  //   const snapshot = await getDocs(usersRef);
  //   return snapshot.docs.map(doc => ({
  //     uid: doc.id,
  //     ...(doc.data() as any),
  //   }));
  // }

  // getUsers(): Observable<any[]> {
  //   const usersRef = collection(this.firestore, 'users');
  //   return collectionData(usersRef, { idField: 'uid' });
  // }
  

  async updateUserSettings(projectId: string, userId: string, data: any): Promise<void> {
    const ref = doc(this.firestore, `projects/${projectId}/userSettings/${userId}`);
    return setDoc(ref, data, { merge: true });
  }


  addTask(projectId: string, task: any): Promise<void> {
    const taskCollection = collection(this.firestore, `projects/${projectId}/tasks`);
    return addDoc(taskCollection, task).then(() => {});
  }

  getSections(projectId: string): Observable<Section[]> {
    const sectionRef = collection(this.firestore, `projects/${projectId}/sections`);
    return collectionData(sectionRef, { idField: 'id' }) as Observable<Section[]>;
  }

  async getSectionsOnce(projectId: string): Promise<Section[]> {
    const sectionRef = collection(this.firestore, `projects/${projectId}/sections`);
    return await firstValueFrom(
      collectionData(sectionRef, { idField: 'id' }) as Observable<Section[]>
    );
  }

  getProjectMemberIds(projectId: string): Promise<string[]> {
    const projectRef = doc(this.firestore, `projects/${projectId}`);
    return getDoc(projectRef).then(snapshot => {
      if (!snapshot.exists()) return [];
      const data = snapshot.data();
      return data?.['memberIds'] ?? [];
    });
  }

  getProjectMembers(projectId: string): Observable<{ uid: string, displayName: string, email: string }[]> {
    const membersRef = collection(this.firestore, `projects/${projectId}/members`);
    return collectionData(membersRef, { idField: 'uid' }) as Observable<{ uid: string, displayName: string, email: string }[]>;
  }
    
  addSection(projectId: string, section: { title: string; order: number }) {
    const sectionRef = collection(this.firestore, `projects/${projectId}/sections`);
    return addDoc(sectionRef, section);
  }

  async deleteSectionWithTasks(projectId: string, sectionId: string, sectionTitle: string): Promise<void> {
    const taskPath = `projects/${projectId}/tasks`;
    const tasks = await this.getTasksByProjectIdOnce(projectId);
    const deletePromises = tasks
    .filter(t => t.section === sectionTitle)
    .map(t => this.deleteDocument(`${taskPath}/${t.id}`));
    
    await Promise.all(deletePromises);
    await this.deleteDocument(`projects/${projectId}/sections/${sectionId}`);
  }
  
  deleteSection(projectId: string, sectionId: string, targetSectionTitle: string): Promise<void> {
    const sectionRef = doc(this.firestore, `projects/${projectId}/sections/${sectionId}`);
    return deleteDoc(sectionRef);
  }

  async moveTasksToSection(projectId: string, sectionTitle: string, targetSectionTitle: string): Promise<void> {
    const taskPath = `projects/${projectId}/tasks`;
    const tasks = await this.getTasksByProjectIdOnce(projectId);
    const movePromises = tasks
      .filter(t => t.section === sectionTitle)
      .map(t => this.updateDocument(`${taskPath}/${t.id}`, { section: targetSectionTitle }));
    return Promise.all(movePromises).then(() => {});
  }

  async getUserSettings(projectId: string, userId: string): Promise<any> {
    const settingsRef = doc(this.firestore, `projects/${projectId}/userSettings/${userId}`);
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  }
  
  async saveUserSettings(projectId: string, userId: string, settings: any): Promise<void> {
    const settingsRef = doc(this.firestore, `projects/${projectId}/userSettings/${userId}`);
    await setDoc(settingsRef, settings, { merge: true }); // merge:trueで上書きじゃなく追記
  }

  removeMemberFromProject(projectId: string, userId: string): Promise<void> {
    const memberPath = `projects/${projectId}/members/${userId}`;
    return this.deleteDocument(memberPath);
  }  

}