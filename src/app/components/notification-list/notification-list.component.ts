import { Component, OnInit } from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';
import type { Notification } from '../../models/notification.model';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { TaskPanelService } from '../../services/task-panel.service';


@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class NotificationListComponent implements OnInit {
  notifications: Notification[] = [];
  private uid!: string;
  filteredNotifications: Notification[] = [];
  selectedTypes: Notification['type'][] = [];
  showUnreadOnly: boolean = false;

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private firestore: Firestore,
    private taskPanelService: TaskPanelService
  ) {}

  async ngOnInit() {
    const user = await this.authService.getCurrentUserSync();
    this.uid = user.uid;
  
    this.notifications = await this.firestoreService.getNotifications(this.uid);
    this.applyFilters();
    const q = query(
      collection(this.firestore, 'notifications'),
      where('recipientId', '==', this.uid),
      where('isRead', '==', false)
    );
  
    onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const docData = change.doc.data();
          const newNotification: Notification = {
            id: change.doc.id,
            taskId: docData['taskId'],
            taskName: docData['taskName'],
            projectId: docData['projectId'],
            type: docData['type'],
            timestamp: docData['timestamp'],
            isRead: docData['isRead'],
            recipientId: docData['recipientId']
          };

          const alreadyExists = this.notifications.some(n => n.id === newNotification.id);
          if (!alreadyExists) {
            this.notifications.unshift(newNotification);
            this.applyFilters();
          }
    
          const settings = await this.firestoreService.getNotificationSettings(this.uid);
          if (settings?.external?.desktop) {
            this.showBrowserNotification(newNotification.taskName);
          }
        }
      }
    });
    
  }
  

  async onClick(notification: Notification) {
    if (!notification.isRead) {
      await this.firestoreService.markNotificationAsRead(notification.id);
      notification.isRead = true;
    }
  
    if (notification.projectId && notification.taskId) {
      this.taskPanelService.open(notification.projectId, notification.taskId);
    } else {
      console.warn('通知にprojectIdまたはtaskIdがありません');
    }
  }

  private showBrowserNotification(taskName: string) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification('新しいタスク', {
        body: `${taskName} が作成されました`
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('新しいタスク', {
            body: `${taskName} が作成されました`
          });
        }
      });
    }
  }

  getTypeLabel(type: Notification['type']): string {
    switch (type) {
      case 'new': return '【新規】';
      case 'update': return '【更新】';
      case 'deadline': return '【期日】';
      default: return '';
    }
  }

  applyFilters() {
    this.filteredNotifications = this.notifications.filter(n => {
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
    this.applyFilters();
  }
  
  toggleUnreadOnly() {
    this.showUnreadOnly = !this.showUnreadOnly;
    this.applyFilters();
  }  
  
}
