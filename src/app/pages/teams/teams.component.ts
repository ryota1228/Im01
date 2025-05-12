import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../services/firestore.service';
import { Team } from '../../models/team.model';
import { Project } from '../../models/project.model';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { TeamMemberListComponent } from "../../components/team-member-list/team-member-list.component";
import { TeamTaskSummaryComponent } from "../../components/team-task-summary/team-task-summary.component";
import { TeamProjectListComponent } from "../../components/team-project-list/team-project-list.component";
import { AuthService } from '../../services/auth.service';
import { TeamProjectSelectDialogComponent } from '../../components/team-project-select-dialog/team-project-select-dialog.component';
import { TeamMemberSelectDialogComponent } from '../../components/team-member-select-dialog/team-member-select-dialog.component';
import { MatDialog } from '@angular/material/dialog';

interface TeamWithProjects extends Team {
  projects: Project[];
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    RouterModule,
    TeamMemberListComponent,
    TeamTaskSummaryComponent,
  ],
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.css']
})
export class TeamsComponent implements OnInit {
  teams: TeamWithProjects[] = [];
  newTeamName = '';
  editingTeamId: string | null = null;
  editedTeamName = '';
  isExpanded: { [teamId: string]: boolean } = {};
  searchKeyword = '';
  sortOption: 'name' | 'createdAt' = 'name';

  constructor(private firestoreService: FirestoreService, private authService: AuthService, private dialog: MatDialog) {}

  async ngOnInit() {
    await this.reloadTeams();
  }

  async createTeam() {
    if (!this.newTeamName.trim()) return;
    const user = await this.authService.getCurrentUser();
    await this.firestoreService.createTeam({
      name: this.newTeamName,
      createdBy: user?.uid ?? ''
    });
    this.newTeamName = '';
    await this.reloadTeams();
  }

  startEditing(team: Team) {
    this.editingTeamId = team.id;
    this.editedTeamName = team.name;
  }

  async saveEdit(teamId: string) {
    await this.firestoreService.updateTeamName(teamId, this.editedTeamName);
    this.editingTeamId = null;
    await this.reloadTeams();
  }

  cancelEdit() {
    this.editingTeamId = null;
  }

  async deleteTeam(teamId: string) {
    if (confirm('このチームを削除しますか？')) {
      await this.firestoreService.deleteTeam(teamId);
      await this.reloadTeams();
    }
  }

  openProjectSelectDialog(teamId: string) {
    const dialogRef = this.dialog.open(TeamProjectSelectDialogComponent, {
      width: '400px',
      data: { teamId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.reloadTeams();
    });
  }

  openMemberSelectDialog(teamId: string) {
    const dialogRef = this.dialog.open(TeamMemberSelectDialogComponent, {
      width: '400px',
      data: { teamId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.reloadTeams();
    });
  }

  async reloadTeams() {
    const rawTeams = await this.firestoreService.getAllTeams();
  
    this.teams = await Promise.all(
      rawTeams.map(async team => {
        const memberIds = team.memberIds || [];
  
        const allProjects = await this.firestoreService.getProjectsByUsers(memberIds);
  
        const filteredProjects = allProjects.filter(project => {
          const projectMemberIds = project.memberIds ?? [];
          const stillHasTeamMember = memberIds.some(uid => projectMemberIds.includes(uid));
          const isNotCompleted = project.status !== 'completed';
          return stillHasTeamMember && isNotCompleted;
        });
  
        return { ...team, projects: filteredProjects };
      })
    );
  }
  
  
  
  
  

  toggle(teamId: string) {
    this.isExpanded[teamId] = !this.isExpanded[teamId];
  }

  expandAll() {
    this.teams.forEach(team => this.isExpanded[team.id] = true);
  }

  collapseAll() {
    this.teams.forEach(team => this.isExpanded[team.id] = false);
  }

  get filteredTeams() {
    return this.teams.filter(t => 
      t.name.toLowerCase().includes(this.searchKeyword.toLowerCase())
    );
  }

  get sortedTeams(): TeamWithProjects[] {
  const sorted = [...this.filteredTeams];
  if (this.sortOption === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => {
      const dateA = new Date(a.createdAt ?? '').getTime();
      const dateB = new Date(b.createdAt ?? '').getTime();
      return dateB - dateA;
    });
  }
  return sorted;
}

isCurrentUserMember(project: Project): boolean {
  return project.memberIds?.includes(this.authService.currentUser?.uid ?? '');
}

}