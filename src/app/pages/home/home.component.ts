import { Component, OnInit } from '@angular/core';
import { Notification } from '../../models/notification.model';
import { Task } from '../../models/task.model';
import { Project } from '../../models/project.model';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { TaskPanelService } from '../../services/task-panel.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Timestamp } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CalendarViewComponent } from "../../components/calendar-view/calendar-view.component";
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarViewComponent, MatIconModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  currentTime: Date = new Date();
  attendanceStatus: string = '未設定';

  notifications: Notification[] = [];

  todaysTasks: Task[] = [];
  delayedTasks: Task[] = [];
  sortedProjects: (Project & { pinned: boolean; delayedCount: number })[] = [];

  newTaskTitle: string = '';
  isLoading: boolean = true;
  public uid: string = '';

  completedProjectIds: string[] = [];
  private completedProjectStatusMap: { [projectId: string]: boolean } = {};

  selectedTypes: Notification['type'][] = [];
  showUnreadOnly: boolean = false;
  typeFilter: { [key in Notification['type']]?: boolean } = {};

  chatNotifications: any[] = [];



  
  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private taskPanelService: TaskPanelService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
  const user = await this.authService.getCurrentUser();
  if (!user) return;
  this.uid = user.uid;

  this.startClock();
  await this.loadAttendanceStatus();
  await this.loadNotifications();
  await this.loadData();
  await this.loadChatNotifications();

  console.log('[読み込み完了後] chatNotifications =', this.chatNotifications);
}


  startClock() {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  async setAttendance(status: string) {
    this.attendanceStatus = status;
    await this.firestoreService.setUserAttendanceStatusSafe(this.uid, status);
  }

  async loadAttendanceStatus() {
    this.attendanceStatus = await this.firestoreService.getUserAttendanceStatusSafe(this.uid) || '未設定';
  }

  async loadNotifications() {
    this.notifications = await this.firestoreService.getAllNotifications(this.uid);
  }

  async loadData() {
    this.isLoading = true;
    await Promise.all([
      this.loadTasks(),
      this.loadProjects()
    ]);
    this.isLoading = false;
  }

  async loadProjects() {
    const projects = await this.firestoreService.getProjectsByUser([this.uid]);
    const pinnedIds = await this.firestoreService.getPinnedProjectIdsSafe(this.uid);
    const result = [];
  
    this.completedProjectStatusMap = {};
  
    for (const project of projects) {
      if (project.status === 'completed') continue;
      
      const tasks = await this.firestoreService.getTasksByProjectIdOnce(project.id);
      const delayedCount = tasks.filter(t => {
        const due = new Date(t.dueDate);
        return due < new Date() && t.status !== '完了';
      }).length;
  
      this.completedProjectStatusMap[project.id] = project.status === 'completed';
  
      result.push({ ...project, pinned: pinnedIds.includes(project.id), delayedCount });
    }
  
    this.sortedProjects = result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (a.dueDate?.toMillis?.() || 0) - (b.dueDate?.toMillis?.() || 0);
    });
  }
  
  async loadTasks() {
    let allTasks = await this.firestoreService.getAllTasksByUserOnce(this.uid);
    allTasks = allTasks.map(t => ({
      ...t,
      dueDate: this.toDate(t.dueDate),
      updatedAt: this.toDate(t.updatedAt)
    }));
  
    this.taskPanelService.setAvailableTasks(allTasks);
  
    const now = new Date();
    this.todaysTasks = allTasks.filter(t => {
      return t.dueDate && t.dueDate.toDateString() === now.toDateString();
    });
  
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.delayedTasks = allTasks.filter(task => {
      const due = this.toDate(task.dueDate);
      return (
        due && due < today &&
        task.status !== '完了' &&
        !this.completedProjectStatusMap[task.projectId ?? '']
      );
    });
  }
  

  async togglePin(projectId: string) {
    await this.firestoreService.togglePinProjectSafe(this.uid, projectId);
    await this.loadProjects();
  }

  goToProject(projectId: string) {
    this.router.navigate(['/project', projectId]);
  }

  openTask(input: Task | { projectId: string; taskId: string }): void {
    const projectId = 'projectId' in input ? input.projectId : input.projectId;
    const taskId = 'taskId' in input ? input.taskId : input.id;
  
    if (projectId && taskId) {
      this.taskPanelService.open(projectId, taskId);
    }
  }  

  async addTaskToToday() {
    if (!this.newTaskTitle.trim()) return;

    const today = new Date();
    const project = this.sortedProjects[0];
    if (!project) return;

    const task: Partial<Task> = {
      title: this.newTaskTitle.trim(),
      assignee: this.uid,
      dueDate: today,
      status: '未着手',
      projectId: project.id
    };

    await this.firestoreService.addTask(project.id, task);
    this.newTaskTitle = '';
    await this.loadTasks();
  }  

  goToAllNotifications() {
    this.router.navigate(['/notifications']);
  }

  private toDate(input: any): Date | null {
    if (input instanceof Date) return input;
    if (input instanceof Timestamp) return input.toDate();
    if (typeof input === 'string') {
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  openTaskPanel(task: Task): void {
    if (!task.projectId || !task.id) return;
  
    this.taskPanelService.open(task.projectId, task.id);
  }

  get filteredNotifications(): Notification[] {
    return this.notifications.filter(n => {
      const typeMatch = this.selectedTypes.length === 0 || this.selectedTypes.includes(n.type);
      const unreadMatch = !this.showUnreadOnly || !n.isRead;
      return typeMatch && unreadMatch;
    });
  }
  
  toggleType(type: Notification['type']) {
    if (this.selectedTypes.includes(type)) {
      this.selectedTypes = this.selectedTypes.filter(t => t !== type);
    } else {
      this.selectedTypes.push(type);
    }
  }  
  
  toggleUnreadOnly(event: Event) {
    const input = event.target as HTMLInputElement;
    this.showUnreadOnly = input.checked;
  }
  

  getTypeLabel(type: Notification['type']): string {
    switch (type) {
      case 'new': return '【新規】';
      case 'update': return '【更新】';
      case 'deadline': return '【期日】';
      default: return '';
    }
  }

  async onClickNotification(notification: Notification) {

    if (!notification.isRead) {
      await this.firestoreService.markNotificationAsRead(notification.id);
      notification.isRead = true;
    }
  

    if (notification.projectId && notification.taskId) {
      this.taskPanelService.open(notification.projectId, notification.taskId);
    } else {
      console.warn('通知に projectId または taskId が不足しています');
    }
  }

  async loadChatNotifications() {
    const rawNotifs = await this.firestoreService.getUserChatNotifications(this.uid);
    console.log('[DEBUG] rawNotifs', rawNotifs);
  
    const fromUids = [...new Set(rawNotifs.map(n => n.from))];
    const userMap = await this.firestoreService.getUserDisplayNameMap(fromUids);
  
    this.chatNotifications = rawNotifs.map(n => ({
      id: n.id,
      taskId: n.taskId,
      projectId: n.projectId,
      message: n.message,
      from: n.from,
      fromName: userMap[n.from] ?? '(不明ユーザー)',
      createdAt: n.createdAt,
      isRead: n.isRead
    }));
  
    console.log('[読み込み完了後] chatNotifications =', this.chatNotifications);
  }
  
  
  async onClickChatNotification(notif: any) {
    console.log('[onClickChatNotification]', notif);
  
    if (!notif.isRead && notif.id) {
      const notifPath = `users/${this.uid}/notifications/${notif.id}`;
      await this.firestoreService.updateDocument(notifPath, { isRead: true });
    }
  
    if (!notif.projectId || !notif.taskId) {
      console.warn('[onClickChatNotification] projectId または taskId が不足しています');
      return;
    }
  
    // 🔻 ここで Firestore から取得してパネルを開く（方法②）
    const task = await this.firestoreService.getTaskById(notif.projectId, notif.taskId);
    console.log('[onClickChatNotification] Firestoreから取得したtask:', task);
  
    if (task) {
      this.taskPanelService.openPanel(task, notif.projectId); // ← これでOK
    } else {
      console.warn('[onClickChatNotification] タスクが取得できませんでした');
    }
  
    await this.loadChatNotifications(); // ← これで未読マークも消える
  }
  
  
  
  
  
  
  
  
}