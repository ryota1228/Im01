import { Component } from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-admin-tools',
  templateUrl: './admin-tools.component.html',
  styleUrls: ['./admin-tools.component.css']
})
export class AdminToolsComponent {
  isRunning = false;
  log = '';

  constructor(private firestoreService: FirestoreService) {}

  async syncTeamMembersToProjects() {
    this.isRunning = true;
    this.log = '同期中...';

    try {
      await this.firestoreService.syncTeamMembersToProjects();
      this.log = '✅ 同期完了';
    } catch (error) {
      console.error(error);
      this.log = '❌ エラー発生: ' + (error as any).message;
    } finally {
      this.isRunning = false;
    }
  }

  async forceSendDeadlineNotifications() {
    this.isRunning = true;
    this.log = '期日通知チェック中...';
  
    try {
      const users = await this.firestoreService.getAllUsers();
      for (const user of users) {
        await this.firestoreService.checkDeadlineNotifications(user.uid);
      }
      this.log = '✅ 全ユーザーに対して期日通知をチェック＆送信しました';
    } catch (error) {
      console.error(error);
      this.log = '❌ 期日通知エラー: ' + (error as any).message;
    } finally {
      this.isRunning = false;
    }
  }
  


}
