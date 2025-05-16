import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDisplaynameDialogComponent } from './edit-displayname-dialog.component';

describe('EditDisplaynameDialogComponent', () => {
  let component: EditDisplaynameDialogComponent;
  let fixture: ComponentFixture<EditDisplaynameDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDisplaynameDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditDisplaynameDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
