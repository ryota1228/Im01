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
  docData
} from '@angular/fire/firestore';

import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { UpdateData } from '@angular/fire/firestore';
import { Task } from '../models/task.model';
import { taskConverter } from '../models/task.model';
import { Section } from '../models/section.model';


@Injectable({ providedIn: 'root' })
export class FirestoreService {
  constructor(
    private firestore: Firestore = inject(Firestore)
  ) {}

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

  setDocument<T extends DocumentData>(
    path: string,
    data: WithFieldValue<T>
  ): Promise<void> {
    const ref = doc(this.firestore, path);
    return setDoc(ref, data);
  }

  updateDocument<T extends DocumentData>(
    path: string,
    data: Partial<T>
  ): Promise<void> {
    const ref = doc(this.firestore, path) as any;
    return updateDoc(ref, data as UpdateData<T>);
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
      tap(data => console.log('[DEBUG] Firestoreデータ:', data))  // ←ここをpipeで繋ぐ
    ) as Observable<Task[]>;
  }

  getTasksByProjectId(projectId: string): Observable<Task[]> {
    const taskCollection = collection(this.firestore, `projects/${projectId}/tasks`);
    return collectionData(taskCollection, { idField: 'id' }) as Observable<Task[]>;
  }

  addTask(projectId: string, task: any): Promise<void> {
    const taskCollection = collection(this.firestore, `projects/${projectId}/tasks`);
    return addDoc(taskCollection, task).then(() => {});
  }

  getSections(projectId: string): Observable<Section[]> {
    const sectionRef = collection(this.firestore, `projects/${projectId}/sections`);
    return collectionData(sectionRef, { idField: 'id' }) as Observable<Section[]>;
  }

  addSection(projectId: string, section: { title: string; order: number }) {
    const sectionRef = collection(this.firestore, `projects/${projectId}/sections`);
    return addDoc(sectionRef, section);
  }
  
}