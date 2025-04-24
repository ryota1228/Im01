import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Section } from '../../models/section.model';

@Component({
  selector: 'app-delete-section-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatRadioModule, MatSelectModule],
  templateUrl: './delete-section-dialog.component.html',
  styleUrl: './delete-section-dialog.component.css'
})
export class DeleteSectionDialogComponent {
  action: 'delete' | 'move' = 'delete';
  targetSectionId: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<DeleteSectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sections: Section[] },
  ) {}

  confirm(): void {
    this.dialogRef.close({ action: this.action, targetSectionId: this.targetSectionId });
  }


}
