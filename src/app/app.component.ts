import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Task } from './models/task.model';
import { CommonModule } from '@angular/common';
import { TaskdetailComponent } from './components/taskdetail/taskdetail.component';
import { TaskPanelService } from './services/task-panel.service';
import { ViewEncapsulation } from '@angular/core';
import { ViewChild } from '@angular/core';
import { CalendarViewComponent } from './components/calendar-view/calendar-view.component';
import { UserRole } from './models/user-role.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    TaskdetailComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],

  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {
  selectedTask: Task | null = null;
  isTaskPanelOpen = false;
  projectId: string | null = null;
  autoMoveCompletedTasks: boolean = true;
  currentView: 'list' | 'calendar' = 'list';
  userRole: UserRole = 'viewer';

  constructor(private taskPanelService: TaskPanelService) {}

  @ViewChild('taskDetailComponent') taskDetailComp?: TaskdetailComponent;
  @ViewChild(CalendarViewComponent) calendarComp?: CalendarViewComponent;


  ngOnInit(): void {
    this.taskPanelService.selectedTask$.subscribe(task => this.selectedTask = task);
    this.taskPanelService.projectId$.subscribe(id => this.projectId = id);
    this.taskPanelService.isOpen$.subscribe(open => this.isTaskPanelOpen = open);
  
    this.taskPanelService.userRole$.subscribe(role => this.userRole = role);
  }
  

  openTaskPanel(task: Task, projectId: string, autoMoveCompletedTasks: boolean): void {
    this.selectedTask = task;
    this.projectId = projectId;
    this.autoMoveCompletedTasks = autoMoveCompletedTasks;
    this.isTaskPanelOpen = true;
  }

  async closePanel(save: boolean = true): Promise<void> {
    if (save && this.taskDetailComp) {
      await this.taskDetailComp.saveTask();
    }
    this.onTaskPanelClosed(save);
  }  

  onTaskPanelClosed(updated: boolean): void {
    this.isTaskPanelOpen = false;
    if (this.currentView === 'calendar') {
      this.calendarComp?.generateCalendar();
    }
  }

  onOverlayClick(): void {
    const detail = document.querySelector('app-taskdetail') as any;
    if (detail?.onClosePanel) {
      detail.onClosePanel();
    }
  }

}