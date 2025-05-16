import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-displayname-dialog',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, ReactiveFormsModule],
  templateUrl: './edit-displayname-dialog.component.html',
  styleUrls: ['./edit-displayname-dialog.component.css']
})
export class EditDisplayNameDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditDisplayNameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentName: string },
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      displayName: [data.currentName, [Validators.required, Validators.maxLength(30)]]
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;

    const newName = this.form.value.displayName;
    const user = await this.authService.getCurrentUserSync();

    await this.firestoreService.updateDocument(`users/${user.uid}`, {
      displayName: newName
    });

    this.dialogRef.close(newName);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}