import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../services/firestore.service';

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
  styleUrls: ['./filter-dialog.component.css']
})
export class FilterDialogComponent implements OnInit {

  allStatuses = ['未着手', '進行中', '確認待ち', '確認中', '差し戻し', '完了'];
  selectedStatusesMap: { [status: string]: boolean } = {};

  allAssignees: string[] = [];
  selectedAssigneesMap: { [name: string]: boolean } = {};

  allPriorities = ['最優先', '高', '中', '低'];
  selectedPrioritiesMap: { [priority: string]: boolean } = {};
  
  estimateLessThanActualOnly: boolean = false;
  overdueOnly: boolean = false;


  isOpen: { status: boolean; assignee: boolean; priority: boolean; extra: boolean } = {
    status: false,
    assignee: false,
    priority: false,
    extra: true,
  };  
  
  toggleSection(section: 'status' | 'assignee' | 'priority' | 'extra'): void {
    this.isOpen[section] = !this.isOpen[section];
  }

  
  

  constructor(
    public dialogRef: MatDialogRef<FilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      projectId: string,
      currentStatuses: string[],
      currentAssignees: string[],
      currentPriorities: string[],
      estimateLessThanActualOnly: boolean,
      overdueOnly: boolean
    },
    private firestoreService: FirestoreService
  ) {}

  ngOnInit(): void {
    const {
      currentStatuses = [],
      currentAssignees = [],
      currentPriorities = [],
      estimateLessThanActualOnly = false,
      overdueOnly = false 
    } = this.data ?? {};
  
    currentStatuses.forEach(s => this.selectedStatusesMap[s] = true);
    currentAssignees.forEach(a => this.selectedAssigneesMap[a] = true);
    currentPriorities.forEach(p => this.selectedPrioritiesMap[p] = true);
  
    this.estimateLessThanActualOnly = estimateLessThanActualOnly;
    this.overdueOnly = overdueOnly;
  
    this.firestoreService.getProjectMembers(this.data.projectId).then(members => {
      const names = members
        .map(m => m.displayName)
        .filter(name => typeof name === 'string' && name.trim().length > 0);
    
      this.allAssignees = names;
    
      for (const name of this.allAssignees) {
        if (this.selectedAssigneesMap[name] === undefined) {
          this.selectedAssigneesMap[name] = false;
        }
      }
    });    
  }  
  
  applyFilters(): void {
    const selectedStatuses = Object.keys(this.selectedStatusesMap || {}).filter(k => this.selectedStatusesMap[k]);
    const selectedAssignees = Object.keys(this.selectedAssigneesMap || {}).filter(k => this.selectedAssigneesMap[k]);
    const selectedPriorities = Object.keys(this.selectedPrioritiesMap || {}).filter(k => this.selectedPrioritiesMap[k]);
  
    const estimateLessThanActualOnly = this.estimateLessThanActualOnly;
    const overdueOnly = this.overdueOnly;
  
    this.dialogRef.close({
      selectedStatuses,
      selectedAssignees,
      selectedPriorities,
      estimateLessThanActualOnly,
      overdueOnly,
    });
  }  

  onClear(): void {
    this.selectedStatusesMap = {};
    this.selectedAssigneesMap = {};
    this.selectedPrioritiesMap = {};
    this.estimateLessThanActualOnly = false;
    this.overdueOnly = false;
  }
  
  onCancel(): void {
    this.dialogRef.close();
  }
}