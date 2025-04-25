import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Task } from '../../models/task.model';
import { Section } from '../../models/section.model';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule} from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FilterDialogComponent } from '../../components/filter-dialog/filter-dialog.component';
import { TaskPanelService } from '../../services/task-panel.service';
import { SortDialogComponent } from '../../components/sort-dialog/sort-dialog.component';
import { AddSectionDialogComponent } from '../../components/add-section-dialog/add-section-dialog.component';
import { DeleteSectionDialogComponent } from '../../components/delete-section-dialog/delete-section-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, MatDialogModule, MatButtonModule, MatSnackBarModule, MatCheckboxModule],
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
  selectedSort: string = 'ユーザー設定順';
  selectedStatuses: string[] = ['すべて'];
  selectedSections: string[] = ['すべて'];

  addingSection: string | null = null;
  newTask: Partial<Task> = { title: '', assignee: '', dueDate: undefined };
  collapsedSections = new Set<string>();
  draggedSection: Section | null = null;
  editingSectionId: string | null = null;
  editingSectionTitle: string = '';

  
  sectionsWithTasks: { section: Section; tasks: Task[] }[] = [];
  sectionOrder: Section[] = [];

  addingNewSection: boolean = false;
  newSectionTitle: string = '';

  readonly COMPLETED_SECTION_TITLE = '完了済み';

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private firestore: Firestore,
    private dialog: MatDialog,
    private taskPanelService: TaskPanelService,
    private snackBar: MatSnackBar,
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

  async updateTaskStatus(task: Task, newStatus: string): Promise<void> {
    if (!this.projectId || !task.id) return;

    const updates: any = { status: newStatus };

    if (newStatus === '完了') {
      updates.section = this.COMPLETED_SECTION_TITLE;
      updates.completionOrder = Date.now();

      this.snackBar.open('完了済みに移動しました', '', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['complete-snackbar']
      });
    }

    await this.firestoreService.updateDocument(
      `projects/${this.projectId}/tasks/${task.id}`, updates
    );

    this.loadSectionsAndTasks(this.projectId);
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
        this.sectionsWithTasks = this.sectionOrder.map(sec => {
          const isCompleted = sec.isFixed === true;
          if (isCompleted) this.collapsedSections.add(sec.title);

          let tasks = grouped[sec.title] || [];

          tasks = tasks.sort((a, b) => {

            if(isCompleted)
              {return (a.completionOrder || 0) - (b.completionOrder || 0);}
            if (a.order != null && b.order != null) return a.order - b.order;
            if (a.order != null) return -1;
            if (b.order != null) return 1;
            return 0;
          });
          
          return {section: sec,tasks};
        });
      });
    });
  }

  addSectionDialogOpen(): void {
    const dialogRef = this.dialog.open(AddSectionDialogComponent, {
      data: {}
    });

    dialogRef.afterClosed().subscribe(async (title: string | null) => {
      if (!title || !this.projectId) return;
  
      const order = this.sectionsWithTasks.length;
      await this.firestoreService.addSection(this.projectId, {
        title,
        order,
      });
  
      this.loadSectionsAndTasks(this.projectId);
    });
  }

  deleteSectionDialogOpen(section: Section): void {
    const dialogRef = this.dialog.open(DeleteSectionDialogComponent, {
      data: {
        sections: this.sectionOrder.filter(s => s.id !== section.id),
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result || !this.projectId) return;

    if (result.action === 'delete') {
      this.firestoreService.deleteSectionWithTasks(this.projectId, section.id, section.title);
      
    } else if (result.action === 'move' && result.targetSectionId) {
      const targetTitle = this.sectionOrder.find(s => s.id === result.targetSectionId)?.title;
      if (targetTitle) {
        this.firestoreService.moveTasksToSection(this.projectId, section.title, targetTitle)
          .then(() => this.firestoreService.deleteSection(this.projectId!, section.id, targetTitle));
          
      }
    }

      this.loadSectionsAndTasks(this.projectId!);
    });
  }

  toggleSection(title: string): void {
    if (this.collapsedSections.has(title)) {
      this.collapsedSections.delete(title);
    } else {
      this.collapsedSections.add(title);
    }
  }

  enableSectionEdit(section: Section): void {
    this.editingSectionId = section.id;
    this.editingSectionTitle = section.title;
  }

  cancelEditSection(): void {
    this.editingSectionId = null;
    this.editingSectionTitle = '';
  }

  async saveEditedSectionTitle(section: Section, newTitle: string): Promise<void> {
    const newTitleTrimmed = newTitle.trim();
    if (!this.projectId || !newTitleTrimmed) return;

    const oldTitle = section.title;
    const ref = doc(this.firestore, `projects/${this.projectId}/sections/${section.id}`);
    await updateDoc(ref, { title: newTitleTrimmed });

    const tasksSnapshot = await this.firestoreService.getTasksByProjectIdOnce(this.projectId);
    const updates = tasksSnapshot!
      .filter(t => t.section === oldTitle)
      .map(t => this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${t.id}`, { section: newTitleTrimmed }));

    await Promise.all(updates);
    this.cancelEditSection();
    this.loadSectionsAndTasks(this.projectId);
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

  onTaskDrop(event: CdkDragDrop<Task[]>, sectionTitle: string): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
  
    const movedTasks = event.container.data;
  
    movedTasks.forEach((task, index) => {
      const updates: Partial<Task> = {
        order: index,
        section: sectionTitle,
      };
      this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${task.id}`, updates)
        .then(() => console.log(`[DEBUG] タスク ${task.title} の order=${index} 更新完了`));
    });

    this.loadSectionsAndTasks(this.projectId!);
  }

  isSectionCollapsed(title: string): boolean {
    return this.collapsedSections.has(title);
  }

  startAddTask(sectionTitle: string): void {
    this.addingSection = sectionTitle;
    this.newTask = { title: '', assignee: '', dueDate: undefined };
  }

  async saveTask(): Promise<void> {
    if (!this.newTask.title || !this.projectId || !this.addingSection) return;

    const sectionTitle = this.addingSection;

    const allTasks = await this.firestoreService.getTasksByProjectIdOnce(this.projectId);
    const targetTasks = allTasks.filter(t => t.section === sectionTitle && t.order !=null);

    const bumpPromises = targetTasks.map(t => {
      return this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${t.id}`, {
        order: (t.order ?? 0) + 1,
      })
    })

    await Promise.all(bumpPromises);

    const dueDate = typeof this.newTask.dueDate === 'string'
    ? new Date(this.newTask.dueDate)
    : this.newTask.dueDate || null;
    
    const task: Task = {
      id: '',
      title: this.newTask.title!,
      assignee: this.newTask.assignee || '',
      dueDate: dueDate,
      status: '未着手',
      section: this.addingSection,
      order: 0,
    };
    await this.firestoreService.addTask(this.projectId, task);
    this.cancelAddTask();
    this.loadSectionsAndTasks(this.projectId!);
  }

  cancelAddTask(): void {
    this.addingSection = null;
    this.newTask = { title: '', assignee: '', dueDate: undefined };
  }

  openTaskPanel(task: Task): void {
    if (!this.projectId) return;
    this.taskPanelService.openPanel(task, this.projectId);
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

  sortDialogOpen(): void{
    const dialogRef = this.dialog.open(SortDialogComponent, {
      data: {
        sections: this.availableSections.filter(s => s !== 'すべて'),
      },
    });
  }

  get connectedDropListIds(): string[] {
    return this.sectionsWithTasks.map(s => 'dropList-' + s.section.id);
  }

reOrderTasksByDueDate(): void{
  if (!this.projectId) return;

  this.firestoreService.getTasksByProjectId(this.projectId).subscribe(tasks => {
    const updates = tasks
    .filter(t => t.order == null)
    .map(t => this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${t.id}`, {
      order: null
    }));

    Promise.all(updates).then(() => this.loadSectionsAndTasks(this.projectId!));
  });
}
}
