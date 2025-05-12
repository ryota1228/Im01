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

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private firestore: Firestore,
    private taskPanelService: TaskPanelService
  ) {}

  async ngOnInit() {
    const user = await this.authService.getCurrentUserSync();
    this.uid = user.uid;

    // 最初に既存通知を取得
    this.notifications = await this.firestoreService.getNotifications(this.uid);

    // Firestoreの通知をリアルタイムで監視
    const q = query(
      collection(this.firestore, 'notifications'),
      where('recipientId', '==', this.uid),
      where('isRead', '==', false)
    );

    onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const docData = change.doc.data();
          const full: Notification = {
            id: change.doc.id,
            taskId: docData['taskId'],
            taskName: docData['taskName'],
            projectId: docData['projectId'],
            type: docData['type'],
            timestamp: docData['timestamp'],
            isRead: docData['isRead'],
            recipientId: docData['recipientId']
          };
    
          this.notifications.unshift(full);
    
          const settings = await this.firestoreService.getNotificationSettings(this.uid);
          if (settings?.external?.desktop) {
            this.showBrowserNotification(full.taskName);
          }
        }
      }
    });
  }

  async onClick(notification: Notification) {
    if (!notification.isRead) {
      await this.firestoreService.markNotificationAsRead(notification.id);
      notification.isRead = true; // 即時UI反映
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
  
  
}
