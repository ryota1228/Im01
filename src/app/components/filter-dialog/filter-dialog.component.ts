import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Component, Inject } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-filter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    FormsModule,
    MatButtonModule
  ],
  templateUrl: './filter-dialog.component.html',
  styleUrl: './filter-dialog.component.css'
})
export class FilterDialogComponent {
  allStatuses = ['未着手', '進行中', '完了'];
  allSections: string[] = [];

  selectedStatusesMap: { [key: string]: boolean } = {};
  selectedSectionsMap: { [key: string]: boolean } = {};

  constructor(
    public dialogRef: MatDialogRef<FilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sections: string[]; currentStatuses: string[], currentSections: string[] }
  ) {
    this.allSections = data.sections;

    data.currentStatuses.forEach(s => this.selectedStatusesMap[s] = true);
    data.currentSections.forEach(s => this.selectedSectionsMap[s] = true);
  }

  applyFilters(): void {
    const selectedStatuses = Object.keys(this.selectedStatusesMap).filter(k => this.selectedStatusesMap[k]);
    const selectedSections = Object.keys(this.selectedSectionsMap).filter(k => this.selectedSectionsMap[k]);

    this.dialogRef.close({ selectedStatuses, selectedSections });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}