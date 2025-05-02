import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';

interface SectionSortOption {
  id: string;
  title: string;
  selectedSort: 'default' | 'dueDate' | 'priority';
}

@Component({
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, CommonModule, NgFor, MatDividerModule],
  selector: 'app-sort-dialog',
  templateUrl: './sort-dialog.component.html',
  styleUrls: ['./sort-dialog.component.css'],
})
export class SortDialogComponent {
  sectionOptions: SectionSortOption[];
  bulkSort: 'default' | 'dueDate' | 'priority' | null = null;

  sortOptions = [
    { value: 'default', label: 'ユーザー設定順' },
    { value: 'dueDate', label: '期日順' },
    { value: 'priority', label: '優先度順' },
  ];

  constructor(
    public dialogRef: MatDialogRef<SortDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sections: SectionSortOption[] }
  ) {
    this.sectionOptions = data.sections.map(section => ({ ...section }));
  }

  applyBulkSort(value: 'default' | 'dueDate' | 'priority'): void {
    this.sectionOptions = this.sectionOptions.map(section => ({
      ...section,
      selectedSort: value
    }));
  }

  onSave(): void {
    this.dialogRef.close(this.sectionOptions);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}