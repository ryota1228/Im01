import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NotificationSettings, NotificationScope } from '../../models/notification-settings.model';
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
  @Input() projectId?: string;
  settings: any = {};

  private userId: string = '';

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private dialogRef: MatDialogRef<NotificationSettingsDialogComponent>
  ) {}

  async ngOnInit() {
    const user = await this.authService.getCurrentUser();
    if (!user) return;
    this.userId = user.uid;

    const allSettings = await this.firestoreService.getNotificationSettings(this.userId);

    if (this.projectId && allSettings?.overrides?.[this.projectId]) {
      this.settings = { ...this.defaultSubSettings(), ...allSettings.overrides[this.projectId] };
    } else if (this.projectId) {
      this.settings = this.defaultSubSettings();
    } else {
      this.settings = { ...this.defaultSubSettings(), ...allSettings?.default };
    }
  }

  defaultSubSettings(): any {
    return {
      newTask: 'assigned',
      taskUpdate: 'assigned',
      comment: 'assigned',
      deadline: { daysBefore: 1, enabled: true },
      progress: true
    };
  }

  async save() {
    if (!this.userId) return;
  
    if (this.projectId) {
      await this.firestoreService.updateNotificationOverrides(this.userId, this.projectId, this.settings);
    } else {
      const existing = await this.firestoreService.getNotificationSettings(this.userId);
      const external = existing?.external ?? {
        desktop: false,
        email: false,
        slack: false
      };
  
      await this.firestoreService.updateNotificationSettings(this.userId, {
        default: this.settings,
        overrides: existing?.overrides ?? {},
        external
      });
    }
  
    this.dialogRef.close();
  }
  

  cancel() {
    this.dialogRef.close();
  }
}