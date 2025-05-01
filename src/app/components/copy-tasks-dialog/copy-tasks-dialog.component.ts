import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Section } from '../../models/section.model';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-copy-tasks-dialog',
  templateUrl: './copy-tasks-dialog.component.html',
  styleUrls: ['./copy-tasks-dialog.component.css'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    NgFor,
    FormsModule
  ]
})
export class CopyTasksDialogComponent {
  selectedSectionId: string | null = null;
  sections: Section[] = [];

  constructor(
    private dialogRef: MatDialogRef<CopyTasksDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sections: Section[] }
  ) {
    this.sections = data.sections;
  }

  onConfirm() {
    this.dialogRef.close(this.selectedSectionId);
  }

  onCancel() {
    this.dialogRef.close();
  }
}