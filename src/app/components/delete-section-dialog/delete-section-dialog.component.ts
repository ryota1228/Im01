import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { Section } from '../../models/section.model';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-delete-section-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatRadioModule, MatSelectModule],
  templateUrl: './delete-section-dialog.component.html',
  styleUrls: ['./delete-section-dialog.component.css']
})

export class DeleteSectionDialogComponent implements OnInit {
  action: 'delete' | 'move' = 'delete';
  targetSectionId: string | null = null;
  taskCount: number = 0;
  sectionTitle: string = '';
  sections: Section[] = [];

  constructor(
    public dialogRef: MatDialogRef<DeleteSectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      sectionId: string;
      sectionTitle: string;
      sections: Section[];
      tasks: Task[];
    }
  ) {}

  ngOnInit(): void {
    this.sectionTitle = this.data.sectionTitle;
    this.sections = this.data.sections;
    this.taskCount = this.data.tasks.filter(t => t.section === this.data.sectionTitle).length;
  }

  confirm(): void {
    this.dialogRef.close({ action: this.action, targetSectionId: this.targetSectionId });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}