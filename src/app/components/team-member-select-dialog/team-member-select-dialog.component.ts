import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FirestoreService } from '../../services/firestore.service';
import { User } from '../../models/user.model';

interface UserOption {
  uid: string;
  displayName: string;
  email: string;
  checked: boolean;
}

@Component({
  selector: 'app-team-member-select-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatButtonModule],
  templateUrl: './team-member-select-dialog.component.html'
})
export class TeamMemberSelectDialogComponent implements OnInit {
  search = '';
  users: UserOption[] = [];

  constructor(
    private dialogRef: MatDialogRef<TeamMemberSelectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { teamId: string },
    private firestoreService: FirestoreService
  ) {}

  async ngOnInit() {
    const allUsers: User[] = await this.firestoreService.getAllUsers();
    this.users = allUsers.map(u => ({
      uid: u.uid,
      displayName: u.displayName,
      email: u.email,
      checked: false
    }));
  }

  get filteredUsers() {
    return this.users.filter(u =>
      u.displayName.toLowerCase().includes(this.search.toLowerCase()) ||
      u.email.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  async apply() {
    const selected = this.users.filter(u => u.checked);
    for (const user of selected) {
      await this.firestoreService.addMemberToTeam(this.data.teamId, user.uid);
    }
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
