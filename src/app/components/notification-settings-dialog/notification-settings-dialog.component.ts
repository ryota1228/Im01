import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NotificationSettings } from '../../models/notification-settings.model';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notification-settings-dialog',
  templateUrl: './notification-settings-dialog.component.html',
  styleUrls: ['./notification-settings-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class NotificationSettingsDialogComponent implements OnInit {
  settings!: NotificationSettings;

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private dialogRef: MatDialogRef<NotificationSettingsDialogComponent>
  ) {}

  async ngOnInit() {
    const user = await this.authService.getCurrentUser();
    if (user) {
      this.settings =
        (await this.firestoreService.getNotificationSettings(user.uid)) ||
        this.defaultSettings();
    }
  }  

  defaultSettings(): NotificationSettings {
    return {
      newTask: 'assigned',
      taskUpdate: 'assigned',
      comment: 'assigned',
      deadline: { daysBefore: 1, enabled: true },
      progress: true,
      external: {
        desktop: false,
        email: false,
        slack: false,
      },
    };
  }

  async save() {
    const user = await this.authService.getCurrentUserSync();
    if (user) {
      await this.firestoreService.updateNotificationSettings(user.uid, this.settings);
      this.dialogRef.close();
    }
  }  

  cancel() {
    this.dialogRef.close();
  }
}
