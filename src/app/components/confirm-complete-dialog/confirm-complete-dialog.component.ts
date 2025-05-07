import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-complete-dialog',
  templateUrl: './confirm-complete-dialog.component.html',
  styleUrls: ['./confirm-complete-dialog.component.css'],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class ConfirmCompleteDialogComponent {
  constructor(public dialogRef: MatDialogRef<ConfirmCompleteDialogComponent>) {}
}