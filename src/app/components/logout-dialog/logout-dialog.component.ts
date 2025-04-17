import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './logout-dialog.component.html',
  styleUrls: ['./logout-dialog.component.css']
})
export class LogoutDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<LogoutDialogComponent>,
    private authService: AuthService,
    private router: Router
  )
  {

  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onConfirm(): Promise<void> {
    await this.authService.logout();
    this.dialogRef.close();
    this.router.navigate(['/login']);
    console.log('ログアウトしました');
  }
}
