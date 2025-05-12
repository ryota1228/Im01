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
  getDocs,
  query,
  where,
  orderBy,
  arrayRemove,
  arrayUnion,
  Timestamp
} from '@angular/fire/firestore';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { UpdateData } from '@angular/fire/firestore';
import { Task } from '../models/task.model';
import { taskConverter } from '../models/task.model';
import { Section } from '../models/section.model';
import { firstValueFrom } from 'rxjs';
import { Input } from '@angular/core';
import { Project } from '../models/project.model';
import { GoalCard, MilestoneCard } from '../models/goal.model';
import { Notification } from '../models/notification.model';
import { NotificationSettings } from '../models/notification-settings.model';
import { Team } from '../models/team.model';
import { User } from '../models/user.model';


@Injectable({ providedIn: 'root' })
export class FirestoreService {

  @Input() projectId!: string;

  isFixed = true
  private userTaskCache: Task[] | null = null;


  constructor(
    private firestore: Firestore = inject(Firestore),
  ) {}

  getTasksByParentMilestoneId(projectId: string, milestoneId: string): Observable<Task[]> {
    const tasksRef = collection(this.firestore, `projects/${projectId}/tasks`);
    const q = query(tasksRef, where('parentMilestoneId', '==', milestoneId));
    return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
  }
  

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

  async getProjectsByUser(userIds: string[]): Promise<Project[]> {
    if (!userIds || userIds.length === 0) return [];
  
    const q = query(
      collection(this.firestore, 'projects'),
      where('memberIds', 'array-contains-any', userIds)
    );
  
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  }

  async getProjectsByUsers(userIds: string[]): Promise<Project[]> {
    if (!userIds || userIds.length === 0) return [];
  
    const q = query(
      collection(this.firestore, 'projects'),
      where('memberIds', 'array-contains-any', userIds)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
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
    const querySnapshot = await getDocs(collection(this.firestore, `projects/${projectId}/tasks`));
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as Omit<Task, 'id' | 'projectId'>;
      return {
        ...data,
        id: doc.id,
        projectId
      };
    });
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
    const q = query(sectionRef, orderBy('order'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Section));
  }

  getProjectMemberIds(projectId: string): Promise<string[]> {
    const projectRef = doc(this.firestore, `projects/${projectId}`);
    return getDoc(projectRef).then(snapshot => {
      if (!snapshot.exists()) return [];
      const data = snapshot.data();
      return data?.['memberIds'] ?? [];
    });
  }

  async getProjectMembers(projectId: string): Promise<{ uid: string; displayName: string; email: string; role: string }[]> {
    const membersCollection = collection(this.firestore, `projects/${projectId}/members`);
    const snap = await getDocs(membersCollection);
    return snap.docs.map(doc => ({ uid: doc.id, ...(doc.data() as any) }));
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

  async markProjectAsCompleted(projectId: string): Promise<void> {
    const docRef = doc(this.firestore, `projects/${projectId}`);
    await updateDoc(docRef, { status: 'completed' });
  }

  async getUserRoleInProject(projectId: string, userId: string): Promise<'owner' | 'editor' | 'viewer' | null> {
    const path = `projects/${projectId}/members/${userId}`;
    const data = await this.getDocument<{ role: string }>(path);
    return data?.role as 'owner' | 'editor' | 'viewer' ?? null;
  }

  getGoalCard(projectId: string, sectionId: string): Observable<GoalCard | null> {
    const goalRef = doc(this.firestore, `projects/${projectId}/sections/${sectionId}/goals/goal`);
    return docData(goalRef) as Observable<GoalCard>;
  }
  
  getMilestoneCards(projectId: string, sectionId: string): Observable<MilestoneCard[]> {
    const milestoneRef = collection(this.firestore, `projects/${projectId}/sections/${sectionId}/milestones`);
    return collectionData(milestoneRef, { idField: 'id' }) as Observable<MilestoneCard[]>;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const q = query(
      collection(this.firestore, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Notification[];
  }
  
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const ref = doc(this.firestore, `notifications/${notificationId}`);
    await updateDoc(ref, { isRead: true });
  }
  
  async createNotification(data: Omit<Notification, 'id'>): Promise<void> {
    await addDoc(collection(this.firestore, 'notifications'), data);
  }

  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    const ref = doc(this.firestore, `users/${userId}`);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as any).notificationSettings as NotificationSettings : null;
  }
  
  async updateNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
    const ref = doc(this.firestore, `users/${userId}`);
    await setDoc(ref, { notificationSettings: settings }, { merge: true });
  }

  async sendNotificationToProjectMembers(
    projectId: string,
    taskId: string,
    taskName: string,
    type: Notification['type'],
    performerUid: string
  ): Promise<void> {
    const membersSnap = await getDoc(doc(this.firestore, `projects/${projectId}`));
    const memberIds: string[] = membersSnap.data()?.['memberIds'] || [];
  
    for (const uid of memberIds) {
      if (uid === performerUid) continue;
  
      const settingsSnap = await getDoc(doc(this.firestore, `users/${uid}`));
      const settings = settingsSnap.data()?.['notificationSettings'] as NotificationSettings | undefined;

      const task = await this.getTaskById(projectId, taskId);
      if (!task) return;
  
      if (!this.shouldNotify(type, uid, settings, performerUid, task, projectId)) continue;
  
      await addDoc(collection(this.firestore, 'notifications'), {
        projectId,
        taskId,
        taskName,
        type,
        timestamp: new Date(),
        isRead: false,
        recipientId: uid,
      });
    }
  }

  private shouldNotify(
    type: Notification['type'],
    uid: string,
    settings: NotificationSettings | undefined,
    performerUid: string,
    task: Task,
    projectId: string
  ): boolean {
    if (!settings) return false;
  
    const typeToKeyMap: { [K in Notification['type']]: keyof NotificationSettings['default'] } = {
      new: 'newTask',
      update: 'taskUpdate',
      comment: 'comment',
      deadline: 'deadline',
      progress: 'progress'
    };
  
    const key = typeToKeyMap[type];
    const projectSettings = settings.overrides?.[projectId];
    const mode = projectSettings?.[key] ?? settings.default?.[key];
  
    const shouldNotify =
      mode === 'all' || (mode === 'assigned' && task.assignee === uid);
  

    console.log('[通知チェック] shouldNotify:', {
      uid,
      projectId,
      type,
      settingKey: key,
      mode,
      assignee: task.assignee,
      performer: performerUid,
      shouldNotify
    });
  
    if (!mode || mode === 'none') return false;
    return shouldNotify;
  }

  async shouldNotifyUpdate(
    uid: string,
    settings: NotificationSettings | undefined,
    before: Task,
    after: Task,
    projectId: string
  ): Promise<boolean> {
    if (!settings) return false;
  
    const projectSettings = settings.overrides?.[projectId];
    const mode = projectSettings?.taskUpdate ?? settings.default?.taskUpdate;
  
    if (!mode || mode === 'none') return false;
  
    const chatChanged = before.chat !== after.chat;
    if (chatChanged) return false;
  
    const wasAssigned = before.assignee === uid;
    const isAssignedNow = after.assignee === uid;
  
    if (mode === 'all') return true;
  
    if (mode === 'assigned') {
      if (wasAssigned || (!wasAssigned && isAssignedNow)) {
        return true;
      }
    }
  
    return false;
  }
  

  async updateTaskWithNotification(
    projectId: string,
    taskId: string,
    newData: Partial<Task>,
    performerUid: string
  ): Promise<void> {
    const beforeTask = await this.getTaskById(projectId, taskId);
    if (!beforeTask) return;
  
    const taskRef = doc(this.firestore, `projects/${projectId}/tasks/${taskId}`);
    await setDoc(taskRef, newData, { merge: true });
  
    const afterTask = { ...beforeTask, ...newData };
  
    const memberIds: string[] = (await this.getProjectMemberIds(projectId)) ?? [];
  
    for (const uid of memberIds) {
      if (uid === performerUid) continue;
      const settingsRaw = await this.getNotificationSettings(uid);
      const settings = settingsRaw ?? undefined;
      const should = await this.shouldNotifyUpdate(uid, settings, beforeTask, afterTask, projectId);

      if (!should) continue;
  
      await this.createNotification({
        projectId,
        taskId,
        taskName: afterTask.title,
        type: 'update',
        recipientId: uid,
        timestamp: new Date(),
        isRead: false,
      });
    }
  }
  
  private async isAssignedTo(uid: string, taskId: string): Promise<boolean> {
    const taskSnap = await getDoc(doc(this.firestore, `tasks/${taskId}`));
    const task = taskSnap.data() as Task;
    return task?.assignee === uid;
  }
  

async sendSlackNotification(uid: string, taskTitle: string) {
  const userDoc = await this.getUserDocument(uid);
  const webhookUrl = userDoc?.slackWebhook;
  if (!webhookUrl) return;

  const payload = {
    text: `📝 新しいタスクが作成されました: *${taskTitle}*`
  };

  await fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  });
}

async getUserDocument(uid: string): Promise<any> {
  const docSnap = await getDoc(doc(this.firestore, `users/${uid}`));
  return docSnap.exists() ? docSnap.data() : null;
}

async getAllNotifications(uid: string): Promise<Notification[]> {
  const q = query(
    collection(this.firestore, 'notifications'),
    where('recipientId', '==', uid),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  })) as Notification[];
}

async getTaskById(projectId: string, taskId: string): Promise<Task | null> {
  const docRef = doc(this.firestore, `projects/${projectId}/tasks/${taskId}`);
  const snap = await getDoc(docRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } as Task : null;
  
}

async getUserAttendanceStatusSafe(uid: string): Promise<string> {
  const ref = doc(this.firestore, `users/${uid}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data()['currentAttendanceStatus'] ?? '') : '';
}

async setUserAttendanceStatusSafe(uid: string, status: string): Promise<void> {
  const ref = doc(this.firestore, `users/${uid}`);
  await setDoc(ref, { currentAttendanceStatus: status }, { merge: true });
}

async getAllTasksByUserOnce(uid: string): Promise<Task[]> {
  if (this.userTaskCache) return this.userTaskCache;

  const projectsSnap = await getDocs(
    query(collection(this.firestore, 'projects'), where('memberIds', 'array-contains', uid))
  );

  const allTasks: Task[] = [];

  for (const project of projectsSnap.docs) {
    const projectId = project.id;
    const tasksRef = collection(this.firestore, `projects/${projectId}/tasks`);
    const tasksSnap = await getDocs(tasksRef);

    for (const doc of tasksSnap.docs) {
      const task = { id: doc.id, ...doc.data(), projectId } as Task;
      if (task.assignee === uid) {
        allTasks.push(task);
      }
    }
  }

  this.userTaskCache = allTasks;
  return allTasks;
}


async getPinnedProjectIdsSafe(uid: string): Promise<string[]> {
  const ref = doc(this.firestore, `users/${uid}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data()['pinnedProjects'] ?? []) : [];
}

async togglePinProjectSafe(uid: string, projectId: string): Promise<void> {
  const ref = doc(this.firestore, `users/${uid}`);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const current: string[] = data['pinnedProjects'] ?? [];

  if (current.includes(projectId)) {
    await updateDoc(ref, { pinnedProjects: arrayRemove(projectId) });
  } else {
    await updateDoc(ref, { pinnedProjects: arrayUnion(projectId) });
  }
}

  async getAllTeams(): Promise<Team[]> {
    const snap = await getDocs(collection(this.firestore, 'teams'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
  }

  async createTeam(data: { name: string; createdBy: string }): Promise<void> {
    const ref = doc(collection(this.firestore, 'teams'));
    await setDoc(ref, {
      name: data.name,
      createdBy: data.createdBy,
      memberIds: [data.createdBy],
      createdAt: new Date().toISOString()
    });
  }

  async updateTeamName(teamId: string, newName: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'teams', teamId), { name: newName });
  }

  async deleteTeam(teamId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'teams', teamId));
  }

  async addTeamToProject(teamId: string, projectId: string): Promise<void> {
    const projectRef = doc(this.firestore, 'projects', projectId);
    await updateDoc(projectRef, { teamIds: arrayUnion(teamId) });
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    const teamSnap = await getDoc(doc(this.firestore, 'teams', teamId));
    const memberIds = teamSnap.data()?.['memberIds'] || [];
    const usersSnap = await getDocs(query(collection(this.firestore, 'users'), where('uid', 'in', memberIds)));
    return usersSnap.docs.map(d => d.data() as User);
  }

  async addMemberToTeam(teamId: string, uid: string): Promise<void> {

    await updateDoc(doc(this.firestore, 'teams', teamId), {
      memberIds: arrayUnion(uid)
    });
  

    const projectsSnap = await getDocs(
      query(collection(this.firestore, 'projects'), where('memberIds', 'array-contains', uid))
    );

    const allProjectsSnap = await getDocs(collection(this.firestore, 'projects'));
    const allProjects = allProjectsSnap.docs;
  
    for (const projectDoc of allProjects) {
      const projectId = projectDoc.id;
      const data = projectDoc.data();
      const currentMemberIds = data['memberIds'] || [];
  
      if (!currentMemberIds.includes(uid)) {
        await updateDoc(doc(this.firestore, 'projects', projectId), {
          memberIds: arrayUnion(uid)
        });
      }
    }
  }
  

  async removeMemberFromTeam(teamId: string, uid: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'teams', teamId), {
      memberIds: arrayRemove(uid)
    });
  }

  async getTasksByTeam(teamId: string, period: 'today' | 'week' | 'month'): Promise<Task[]> {
    const teamSnap = await getDoc(doc(this.firestore, 'teams', teamId));
    const memberIds: string[] = teamSnap.data()?.['memberIds'] || [];
    if (!memberIds.length) return [];
  
    const projectsSnap = await getDocs(collection(this.firestore, 'projects'));
    const allTasks: Task[] = [];
  
    for (const project of projectsSnap.docs) {
      const projectId = project.id;
      const tasksSnap = await getDocs(
        query(
          collection(this.firestore, `projects/${projectId}/tasks`),
          where('assignee', 'in', memberIds)
        )
      );
  
      for (const doc of tasksSnap.docs) {
        const data = doc.data() as Task;
        const taskDueDate = (data.dueDate instanceof Timestamp)
          ? data.dueDate.toDate()
          : new Date(data.dueDate);
  
        if (!this.isDateInPeriod(taskDueDate, period)) continue;
  
        allTasks.push({
          ...data,
          id: doc.id,
          projectId
        });
      }
    }
  
    return allTasks;
  }

  private isDateInPeriod(date: Date, period: 'today' | 'week' | 'month'): boolean {
    const now = new Date();
    const target = new Date(date);

    switch (period) {
      case 'today':
        return target.toDateString() === now.toDateString();

      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return target >= weekStart && target <= weekEnd;
      }

      case 'month':
        return (
          target.getFullYear() === now.getFullYear() &&
          target.getMonth() === now.getMonth()
        );
    }
  }
  
  async getProjectsByUserId(uid: string): Promise<Project[]> {
    const q = query(
      collection(this.firestore, 'projects'),
      where('memberIds', 'array-contains', uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  }  

  async getAllUsers(): Promise<User[]> {
    const snap = await getDocs(collection(this.firestore, 'users'));
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data['displayName'] ?? '未設定',
        email: data['email'] ?? ''
      };
    });
  }

  async getProjectsByTeam(teamId: string): Promise<Project[]> {
    const q = query(
      collection(this.firestore, 'projects'),
      where('teamIds', 'array-contains', teamId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  }

  async getProjectsByIds(projectIds: string[]): Promise<Project[]> {
    if (projectIds.length === 0) return [];
  
    const projectDocs = await getDocs(
      query(collection(this.firestore, 'projects'), where('__name__', 'in', projectIds))
    );
  
    return projectDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  }

  async syncTeamMembersToProjects(): Promise<void> {
    const teamsSnap = await getDocs(collection(this.firestore, 'teams'));
    const allProjectsSnap = await getDocs(collection(this.firestore, 'projects'));
  
    const allProjects = allProjectsSnap.docs.map(doc => ({
      id: doc.id,
      ref: doc.ref,
      data: doc.data()
    }));
  
    for (const teamDoc of teamsSnap.docs) {
      const teamData = teamDoc.data();
      const memberIds: string[] = teamData['memberIds'] || [];
  
      for (const uid of memberIds) {
        for (const project of allProjects) {
          const projectMemberIds: string[] = project.data['memberIds'] || [];
  
          if (!projectMemberIds.includes(uid)) {
            console.log(`[SYNC] 追加: ${uid} を project: ${project.id} に`);
            await updateDoc(project.ref, {
              memberIds: arrayUnion(uid)
            });
          }
        }
      }
    }
  
    console.log('✅ 全チームメンバーのプロジェクト参加同期が完了しました');
  }

  async getProjectTitleById(projectId: string): Promise<string | null> {
    try {
      const docRef = doc(this.firestore, `projects/${projectId}`);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data()['title'] ?? null;
      } else {
        console.warn(`プロジェクト ${projectId} が見つかりません`);
        return null;
      }
    } catch (e) {
      console.error('プロジェクトタイトルの取得に失敗:', e);
      return null;
    }
  }

  async checkDeadlineNotifications(uid: string): Promise<void> {
    const projects = await this.getProjectsByUserId(uid);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const project of projects) {
      const settings = await this.getNotificationSettings(uid);
      const override = settings?.overrides?.[project.id]?.deadline;
      const global = settings?.default?.deadline;
      const deadlineSetting = override ?? global;
  
      if (!deadlineSetting?.enabled) continue;
  
      const daysBefore = deadlineSetting.daysBefore ?? 1;
      const notifyDate = new Date(today);
      notifyDate.setDate(notifyDate.getDate() + daysBefore);
  
      const tasks = await this.getTasksByProjectIdOnce(project.id);
  
      for (const task of tasks) {
        if (task.assignee !== uid || task.status === '完了') continue;
  
        const taskDueDate = task.dueDate instanceof Date
          ? task.dueDate
          : new Date(task.dueDate as string);
  
        if (
          taskDueDate.getFullYear() === notifyDate.getFullYear() &&
          taskDueDate.getMonth() === notifyDate.getMonth() &&
          taskDueDate.getDate() === notifyDate.getDate()
        ) {
          const exists = await this.checkExistingNotification(uid, project.id, task.id, 'deadline');
          if (!exists) {
            await this.createNotification({
              recipientId: uid,
              projectId: project.id,
              taskId: task.id,
              taskName: task.title,
              type: 'deadline',
              timestamp: new Date(),
              isRead: false
            });
          }
        }
      }
    }
  }

  private async checkExistingNotification(
    uid: string,
    projectId: string,
    taskId: string,
    type: Notification['type']
  ): Promise<boolean> {
    const q = query(
      collection(this.firestore, 'notifications'),
      where('recipientId', '==', uid),
      where('projectId', '==', projectId),
      where('taskId', '==', taskId),
      where('type', '==', type)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  }

  async updateNotificationOverrides(userId: string, projectId: string, override: any): Promise<void> {
    const ref = doc(this.firestore, `users/${userId}`);
    await setDoc(ref, { [`notificationSettings.overrides.${projectId}`]: override }, { merge: true });
  }
  
  async removeMemberFromProject(projectId: string, userId: string): Promise<void> {
    const memberPath = `projects/${projectId}/members/${userId}`;
    await this.deleteDocument(memberPath);


    const projectRef = doc(this.firestore, `projects/${projectId}`);
    await updateDoc(projectRef, {
      memberIds: arrayRemove(userId)
    });
  }

  
}