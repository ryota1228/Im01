import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';


@Component({
  selector: 'app-email-exists-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-exists-dialog.component.html',
  styleUrl: './email-exists-dialog.component.css'
})

export class EmailExistsDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<EmailExistsDialogComponent>,
    private router: Router
  ) {}

  goTo(path: string) {
    this.dialogRef.close();
    this.router.navigate([path]);
  }
}
