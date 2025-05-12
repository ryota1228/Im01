import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../services/firestore.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-team-member-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-member-list.component.html',
  styleUrls: ['./team-member-list.component.css']
})
export class TeamMemberListComponent implements OnInit {
  @Input() teamId!: string;

  members: User[] = [];
  newMemberUid = '';

  constructor(private firestoreService: FirestoreService) {}

  async ngOnInit() {
    this.members = await this.firestoreService.getTeamMembers(this.teamId);
  }

  async addMember() {
    if (!this.newMemberUid.trim()) return;
    await this.firestoreService.addMemberToTeam(this.teamId, this.newMemberUid);
    this.newMemberUid = '';
    this.members = await this.firestoreService.getTeamMembers(this.teamId);
  }

  async removeMember(uid: string) {
    if (confirm('このメンバーをチームから削除しますか？')) {
      await this.firestoreService.removeMemberFromTeam(this.teamId, uid);
      this.members = await this.firestoreService.getTeamMembers(this.teamId);
    }
  }
}
