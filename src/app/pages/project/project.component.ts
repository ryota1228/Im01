import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Task } from '../../models/task.model';
import { Section } from '../../models/section.model';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FilterDialogComponent } from '../../components/filter-dialog/filter-dialog.component';
import { TaskPanelService } from '../../services/task-panel.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, MatDialogModule, MatButtonModule],
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.css'],
})
export class ProjectComponent implements OnInit {
  projectId: string | null = null;
  projectTitle: string = 'プロジェクト名';

  currentView: 'list' | 'calendar' = 'list';
  searchKeyword: string = '';
  hideCompleted: boolean = false;
  availableSections: string[] = [];
  selectedSort: string = '期限降順';
  selectedStatuses: string[] = ['すべて'];
  selectedSections: string[] = ['すべて'];

  addingSection: string | null = null;
  newTask: Partial<Task> = { title: '', assignee: '', dueDate: undefined };
  collapsedSections = new Set<string>();
  draggedSection: Section | null = null;
  sectionsWithTasks: { section: Section; tasks: Task[]; isEditing?: boolean }[] = [];
  sectionOrder: Section[] = [];

  editingSectionId: string | null = null;
  editingSectionTitle: string = '';

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private firestore: Firestore,
    private dialog: MatDialog,
    private taskPanelService: TaskPanelService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.projectId = params.get('id');
      if (this.projectId) {
        this.loadProjectTitle(this.projectId);
        this.loadSectionsAndTasks(this.projectId);
      }
    });
  }

  async loadProjectTitle(projectId: string) {
    const ref = doc(this.firestore, `projects/${projectId}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as { title: string };
      this.projectTitle = data.title || 'プロジェクト名';
    }
  }

  updateProjectTitle(): void {
    if (!this.projectId) return;
    const ref = doc(this.firestore, `projects/${this.projectId}`);
    updateDoc(ref, { title: this.projectTitle });
  }

  loadSectionsAndTasks(projectId: string): void {
    this.firestoreService.getSections(projectId).subscribe(sections => {
      this.sectionOrder = sections.sort((a, b) => a.order - b.order);
      this.availableSections = ['すべて', ...sections.map(s => s.title)];
      this.firestoreService.getTasksByProjectId(projectId).subscribe(tasks => {
        const grouped: { [key: string]: Task[] } = {};
        for (const task of tasks) {
          const section = task.section || '未分類';
          if (!grouped[section]) grouped[section] = [];
          grouped[section].push(task);
        }
        this.sectionsWithTasks = this.sectionOrder.map(sec => ({
          section: sec,
          tasks: grouped[sec.title] || [],
          isEditing: false,
        }));
      });
    });
  }

  enableSectionEdit(section: Section): void {
    this.editingSectionId = section.id;
    this.editingSectionTitle = section.title;
  }
  
  async saveEditedSectionTitle(section: Section, newTitle: string): Promise<void> {
    if (!this.projectId || !newTitle.trim()) return;
  
    const oldTitle = section.title;
    const trimmedTitle = newTitle.trim();
  
    const sectionRef = doc(this.firestore, `projects/${this.projectId}/sections/${section.id}`);
    await updateDoc(sectionRef, { title: trimmedTitle });
  
    const tasks = await firstValueFrom(this.firestoreService.getTasksByProjectId(this.projectId));
    const updatePromises = tasks
      .filter(task => task.section === oldTitle)
      .map(task => {
        const taskRef = doc(this.firestore, `projects/${this.projectId}/tasks/${task.id}`);
        return updateDoc(taskRef, { section: trimmedTitle });
      });
  
    await Promise.all(updatePromises);
  
    this.loadSectionsAndTasks(this.projectId!);
    this.cancelEditSection();
  }
  
  cancelEditSection(): void {
    this.editingSectionId = null;
    this.editingSectionTitle = '';
  }

  filterDialogOpen(): void {
    const dialogRef = this.dialog.open(FilterDialogComponent, {
      data: {
        sections: this.availableSections.filter(s => s !== 'すべて'),
        currentStatuses: this.selectedStatuses.includes('すべて') ? [] : this.selectedStatuses,
        currentSections: this.selectedSections.includes('すべて') ? [] : this.selectedSections,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedStatuses = result.selectedStatuses.length > 0 ? result.selectedStatuses : ['すべて'];
        this.selectedSections = result.selectedSections.length > 0 ? result.selectedSections : ['すべて'];
      }
    });
  }

  onSectionDrop(event: CdkDragDrop<{ section: Section; tasks: Task[] }[]>): void {
    moveItemInArray(this.sectionsWithTasks, event.previousIndex, event.currentIndex);
    this.sectionOrder = this.sectionsWithTasks.map(entry => entry.section);
    if (!this.projectId) return;
    const updates = this.sectionOrder.map((sec, index) => {
      const ref = doc(this.firestore, `projects/${this.projectId}/sections/${sec.id}`);
      return updateDoc(ref, { order: index });
    });
    Promise.all(updates).then(() => this.loadSectionsAndTasks(this.projectId!));
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

  cancelAddTask(): void {
    this.addingSection = null;
    this.newTask = { title: '', assignee: '', dueDate: undefined };
  }

  openTaskPanel(task: Task): void {
    if (!this.projectId) return;
    this.taskPanelService.openPanel(task, this.projectId);
  }
}
