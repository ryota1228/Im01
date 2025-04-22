import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { Task } from '../../models/task.model';
import { Section } from '../../models/section.model';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  moveItemInArray,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FilterDialogComponent } from '../../components/filter-dialog/filter-dialog.component';
@Component({
  selector: 'app-project',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule,MatDialogModule,MatButtonModule],
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.css'],
})
export class ProjectComponent implements OnInit {
  projectId: string | null = null;

  currentView: 'list' | 'calendar' = 'list';
  searchKeyword: string = '';
  selectedStatus: string = 'すべて';
  selectedSection: string = 'すべて';
  hideCompleted: boolean = false;
  availableSections: string[] = [];
  selectedSort: string = '期限昇順';

  addingSection: string | null = null;
  newTask: Partial<Task> = {
    title: '',
    assignee: '',
    dueDate: undefined,
  };
  collapsedSections = new Set<string>();

  draggedSection: Section | null = null;
  sectionsWithTasks: { section: Section; tasks: Task[] }[] = [];
  sectionOrder: Section[] = [];

  @Output() openTask = new EventEmitter<{ task: Task; projectId: string }>();

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private firestore: Firestore,
    private dialog: MatDialog
  ) {}

  sortTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      if (this.selectedSort === '期限昇順') {
        return a.dueDate?.getTime() - b.dueDate?.getTime() || 0;
      } else {
        return b.dueDate?.getTime() - a.dueDate?.getTime() || 0;
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.projectId = params.get('id');
      if (this.projectId) {
        this.loadSectionsAndTasks(this.projectId);
      }
    });
  }

  loadSectionsAndTasks(projectId: string): void {
    this.firestoreService.getSections(projectId).subscribe((sections) => {
      this.sectionOrder = sections.sort((a, b) => a.order - b.order);
      this.availableSections = ['すべて', ...sections.map((s) => s.title)];

      this.firestoreService.getTasksByProjectId(projectId).subscribe((tasks) => {
        const grouped: { [key: string]: Task[] } = {};
        for (const task of tasks) {
          const section = task.section || '未分類';
          if (!grouped[section]) grouped[section] = [];
          grouped[section].push(task);
        }

        this.sectionsWithTasks = this.sectionOrder.map((sec) => ({
          section: sec,
          tasks: grouped[sec.title] || [],
        }));
      });
    });
  }

  openTaskPanel(task: Task): void {
    if (!this.projectId) return;
    console.log('[DEBUG] emit openTask to AppComponent:', task, this.projectId);
    this.openTask.emit({ task, projectId: this.projectId });
  }

  toggleSection(title: string): void {
    if (this.collapsedSections.has(title)) {
      this.collapsedSections.delete(title);
    } else {
      this.collapsedSections.add(title);
    }
  }

  isSectionCollapsed(title: string): boolean {
    return this.collapsedSections.has(title);
  }

  startAddTask(sectionTitle: string): void {
    this.addingSection = sectionTitle;
    this.newTask = { title: '', assignee: '', dueDate: undefined };
  }

  cancelAddTask(): void {
    this.addingSection = null;
    this.newTask = { title: '', assignee: '', dueDate: undefined };
  }

  saveTask(): void {
    if (!this.newTask.title || !this.projectId || !this.addingSection) return;

    const dueDate = typeof this.newTask.dueDate === 'string' ? new Date(this.newTask.dueDate) : this.newTask.dueDate || null;

    const task: Task = {
      id: '',
      title: this.newTask.title!,
      assignee: this.newTask.assignee || '',
      dueDate: dueDate,
      status: '未着手',
      section: this.addingSection,
    };

    this.firestoreService.addTask(this.projectId, task).then(() => {
      this.cancelAddTask();
      this.loadSectionsAndTasks(this.projectId!);
    });
  }

  onSectionDrop(event: CdkDragDrop<{ section: Section; tasks: Task[] }[]>): void {
    moveItemInArray(this.sectionsWithTasks, event.previousIndex, event.currentIndex);
    this.sectionOrder = this.sectionsWithTasks.map((entry) => entry.section);

    if (!this.projectId) return;

    const updates = this.sectionOrder.map((sec, index) => {
      const ref = doc(this.firestore, `projects/${this.projectId}/sections/${sec.id}`);
      return updateDoc(ref, { order: index });
    });

    Promise.all(updates).then(() => {
      this.loadSectionsAndTasks(this.projectId!);
    });
  }

  filterDialogOpen() {
    console.log('フィルターダイアログを開く');
    this.dialog.open(FilterDialogComponent);
  }
}