import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { NgFor } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { UserRole } from '../../models/user-role.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-invite-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatInputModule,
    NgFor
  ],
  templateUrl: './invite-member-dialog.component.html',
  styleUrls: ['./invite-member-dialog.component.css']
})
export class InviteMemberDialogComponent implements OnInit {
  searchTerm = '';
  users: { uid: string; displayName: string; email: string }[] = [];
  filteredUsers: { uid: string; displayName: string; email: string }[] = [];
  selectedUserIds = new Set<string>();
  existingMemberIds = new Set<string>();
  projectId: string;
  memberList: { uid: string; displayName: string; email: string }[] = [];
  ownerId: string | undefined;
  selectedUserRoles: { [uid: string]: UserRole } = {};

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { projectId: string },
    public dialogRef: MatDialogRef<InviteMemberDialogComponent>,
    private firestoreService: FirestoreService,
    private snackBar: MatSnackBar
  ) {
    this.projectId = data.projectId;
  }

  async ngOnInit(): Promise<void> {
    const allUsers = await this.firestoreService.getUsers();
    this.users = allUsers ?? [];
    this.filteredUsers = [...this.users];
    this.projectId = this.data.projectId;

    const projectDoc = await this.firestoreService.getDocument<{ ownerId: string }>(`projects/${this.projectId}`);
    this.ownerId = projectDoc?.ownerId ?? '';
  
    const memberDocs = await firstValueFrom(
      this.firestoreService.getCollection<{ uid: string; displayName: string; email: string }>(
        `projects/${this.projectId}/members`
      )
    );
    this.existingMemberIds = new Set((memberDocs ?? []).map(doc => doc.uid));
    this.memberList = memberDocs ?? [];

    console.log('[ALL USERS]', allUsers);
  }

  onSearchChange(): void {
    const keyword = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user => {
      const name = user.displayName?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return name.includes(keyword) || email.includes(keyword);
    });
  }  

  toggleSelection(uid: string): void {
    if (this.selectedUserIds.has(uid)) {
      this.selectedUserIds.delete(uid);
      delete this.selectedUserRoles[uid];
    } else {
      this.selectedUserIds.add(uid);
      this.selectedUserRoles[uid] = 'editor';
    }
  }
  

  isAlreadyMember(uid: string): boolean {
    return this.existingMemberIds.has(uid);
  }

  async addSelectedUsers(): Promise<void> {
    for (const uid of this.selectedUserIds) {
      const userDoc = this.users.find(u => u.uid === uid);
      const role = this.selectedUserRoles[uid] || 'viewer';
      if (!userDoc) continue;
    
      await this.firestoreService.setDocument(
        `projects/${this.projectId}/members/${uid}`,
        {
          uid,
          displayName: userDoc.displayName,
          email: userDoc.email,
          role: role
        }
      );
    }
      this.dialogRef.close(true);
  }
  
  async confirmRemoveMember(uid: string): Promise<void> {
    const ok = window.confirm('このユーザーをプロジェクトから削除しますか？');
    if (!ok) return;
  
    try {
      await this.firestoreService.removeMemberFromProject(this.projectId, uid);
    } catch (err) {
      console.error('削除に失敗しました', err);
    }
  }

  async updateMemberRole(uid: string, role: UserRole): Promise<void> {
    try {
      await this.firestoreService.setDocument(`projects/${this.projectId}/members/${uid}`, {
        role: role
      });
      console.log(`ロール更新: ${uid} → ${role}`);
    } catch (error) {
      console.error('ロール更新失敗:', error);
    }
  }
  
  async saveMemberRoles(): Promise<void> {
    try {
      for (const member of this.memberList) {
        const role = this.selectedUserRoles[member.uid];
        if (role) {
          await this.firestoreService.updateDocument(
            `projects/${this.projectId}/members/${member.uid}`,
            { role }
          );
        }
      }
      this.snackBar.open('メンバーの権限を更新しました', '', { duration: 3000 });
    } catch (error) {
      console.error('ロール更新エラー:', error);
      this.snackBar.open('ロールの更新に失敗しました', '', { duration: 3000 });
    }
  }  

  cancel(): void {
    this.dialogRef.close();
  }
}
