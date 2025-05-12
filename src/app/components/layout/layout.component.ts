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
import { Project } from '../../models/project.model';
import { RouterModule } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';
import { Notification } from '../../models/notification.model';
import { NotificationListComponent } from '../notification-list/notification-list.component';
import { NotificationSettingsDialogComponent } from '../notification-settings-dialog/notification-settings-dialog.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MatDialogModule, MatButtonModule, MatIconModule, RouterModule, NotificationListComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  sidebarOpen = true;
  user$;
  selectedTask: Task | null = null;
  isTaskPanelOpen = false;
  projectId: string | null = null;
  joinedProjects: any;
  displayName: string = '';
  projects: Project[] = [];
  isProjectListOpen = false;
  showNotifications = false;
  hasUnread = false;

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

        

        const projects = await this.firestoreService.getProjectsByUser([user.uid]);
        const filtered = projects.filter(p => p.status !== 'completed');
        console.log('表示対象のプロジェクト', filtered);
        this.joinedProjects = filtered;

        const notifications = await this.firestoreService.getNotifications(user.uid);
        const top10 = notifications.slice(0, 10);
        this.hasUnread = top10.some(n => !n.isRead);
      }
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
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

openNotificationSettings(): void {
  this.dialog.open(NotificationSettingsDialogComponent, {
    width: '500px',
    data: {},
    disableClose: false
  });
}
  
}

export class AppModule {}