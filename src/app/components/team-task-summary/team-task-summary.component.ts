import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../services/firestore.service';
import { Task } from '../../models/task.model';
import { TaskPanelService } from '../../services/task-panel.service';

@Component({
  selector: 'app-team-task-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-task-summary.component.html',
  styleUrls: ['./team-task-summary.component.css']
})
export class TeamTaskSummaryComponent implements OnInit {
  @Input() teamId!: string;
  @Input() period: 'today' | 'week' | 'month' = 'today';

  tasks: Task[] = [];
  filter = 'all';

  constructor(private firestoreService: FirestoreService, private taskPanelService: TaskPanelService) {}

  async ngOnInit() {
    if (!this.teamId) {
      console.warn('teamId が未設定です');
      return;
    }
    this.tasks = await this.firestoreService.getTasksByTeam(this.teamId, this.period);
    this.convertDueDatesToDate();
  }

  async onPeriodChange() {
    this.tasks = await this.firestoreService.getTasksByTeam(this.teamId, this.period);
    this.convertDueDatesToDate();
  }

  filteredTasks(): Task[] {
    if (this.filter === 'all') return this.tasks;
    if (this.filter === 'completed') return this.tasks.filter(t => t.status === '完了');
    if (this.filter === 'overdue') return this.tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== '完了');
    if (this.filter === 'assigned') return this.tasks.filter(t => !!t.assignee);
    return this.tasks;
  }

  total(field: 'estimate' | 'actual'): number {
    return this.filteredTasks().reduce((sum, t) => sum + (t[field] || 0), 0);
  }

  private convertDueDatesToDate() {
    this.tasks = this.tasks.map(task => {
      const newTask = { ...task };
      if (newTask.dueDate && typeof newTask.dueDate.toDate === 'function') {
        newTask.dueDate = newTask.dueDate.toDate();
      }
      return newTask;
    });
  }

  openTask(task: Task): void {
    if (!task.projectId || !task.id) {
      console.warn('[WARN] プロジェクトIDまたはタスクIDが未定義のため、open() をスキップします', task);
      return;
    }
    this.taskPanelService.open(task.projectId!, task.id);
  }

}
