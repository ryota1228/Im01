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
import { firstValueFrom } from 'rxjs';


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
      tap(data => console.log('[DEBUG] Firestoreデータ:', data))
    ) as Observable<Task[]>;
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
  }
  
}