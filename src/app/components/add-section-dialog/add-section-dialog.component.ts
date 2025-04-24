import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-add-section-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  templateUrl: './add-section-dialog.component.html',
  styleUrl: './add-section-dialog.component.css'
})
export class AddSectionDialogComponent {
  newTitle: string = '';

  constructor(
    public dialogRef: MatDialogRef<AddSectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectId: string }
  ) {}

  onConfirm(): void {
    this.dialogRef.close(this.newTitle.trim());
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

}