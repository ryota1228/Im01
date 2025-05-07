import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LogoutDialogComponent } from '../logout-dialog/logout-dialog.component';
import { Task } from '../../models/task.model';
import { TaskPanelService } from '../../services/task-panel.service';
import { CreateProjectDialogComponent } from '../create-project-dialog/create-project-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { FirestoreService } from '../../services/firestore.service';
import { Project } from '../../models/project.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MatDialogModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  sidebarOpen = true;
  user$;
  selectedTask: Task | null = null;
  isTaskPanelOpen = false;
  projectId: string | null = null;
  joinedProjects: any;
  displayName: string = '';
  projects: Project[] = [];
  isProjectListOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private taskPanelService: TaskPanelService,
    private firestoreService: FirestoreService
  )
  {
    this.user$ = this.authService.currentUser$;
  }

  async ngOnInit(): Promise<void> {
    this.taskPanelService.selectedTask$.subscribe(task => this.selectedTask = task);
    this.taskPanelService.projectId$.subscribe(id => this.projectId = id);
    this.taskPanelService.isOpen$.subscribe(open => this.isTaskPanelOpen = open);
  
    this.authService.currentUser$.subscribe(async user => {
      if (user?.uid) {
        const data = await this.firestoreService.getUserById(user.uid);
        this.displayName = data?.displayName ?? '';

        this.firestoreService.getProjectsByUser(user.uid).subscribe(projects => {
          const filtered = projects.filter(p => p.status !== 'completed');
          console.log('表示対象のプロジェクト:', filtered);
          this.joinedProjects = filtered;
        });        
      }
    });
  }  

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleProjectList() {
    this.isProjectListOpen = !this.isProjectListOpen;
  }

  logout() {
    const dialogRef = this.dialog.open(LogoutDialogComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    });
  }

  openedSection: string | null = null;

toggleSection(section: string) {
  this.openedSection = this.openedSection === section ? null : section;
}

openTaskPanel(task: Task, projectId: string | null): void {
  console.log('[DEBUG] openTaskPanel in AppComponent:', task, projectId);
  this.selectedTask = task;
  this.projectId = projectId;
  this.isTaskPanelOpen = true;
  console.log('[DEBUG] openTaskPanel in AppComponent:', this.selectedTask, this.projectId);
}

closePanel(): void {
  this.isTaskPanelOpen = false;
  this.selectedTask = null;
  this.projectId = null;
}

openCreateProjectDialog(): void {
  const dialogRef = this.dialog.open(CreateProjectDialogComponent);

  dialogRef.afterClosed().subscribe(newProjectId => {
    if (newProjectId) {
      this.router.navigate(['/project', newProjectId]);
    }
  });
}
  
}

export class AppModule {}