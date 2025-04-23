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
import { TaskdetailComponent } from '../../pages/taskdetail/taskdetail.component';
import { TaskPanelService } from '../../services/task-panel.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MatDialogModule,
    MatButtonModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  sidebarOpen = true;
  user$;
  selectedTask: Task | null = null;
  isTaskPanelOpen = false;
  projectId: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private taskPanelService: TaskPanelService
  )
  {
    this.user$ = this.authService.currentUser$;
  }

  ngOnInit() {
    this.taskPanelService.selectedTask$.subscribe(task => this.selectedTask = task);
    this.taskPanelService.projectId$.subscribe(id => this.projectId = id);
    this.taskPanelService.isOpen$.subscribe(open => this.isTaskPanelOpen = open);
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
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
  
}

export class AppModule {}