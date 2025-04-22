import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Task } from './models/task.model';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  selectedTask: Task | null = null;
  isTaskPanelOpen = false;
  projectId: string | null = null;

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