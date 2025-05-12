import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';

interface ProjectOption {
  id: string;
  name: string;
  checked: boolean;
}

@Component({
  selector: 'app-team-project-select-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatButtonModule],
  templateUrl: './team-project-select-dialog.component.html'
})
export class TeamProjectSelectDialogComponent implements OnInit {
  search = '';
  projects: ProjectOption[] = [];

  constructor(
    private dialogRef: MatDialogRef<TeamProjectSelectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { teamId: string },
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    const currentUser = await this.authService.getCurrentUser();
    const allProjects = await this.firestoreService.getProjectsByUserId(currentUser?.uid ?? '');
    this.projects = allProjects.map(p => ({ id: p.id, name: p.title, checked: false }));
  }

  get filteredProjects() {
    return this.projects.filter(p => p.name.toLowerCase().includes(this.search.toLowerCase()));
  }

  async apply() {
    const selected = this.projects.filter(p => p.checked);
    for (const project of selected) {
      await this.firestoreService.addTeamToProject(this.data.teamId, project.id);
    }
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
