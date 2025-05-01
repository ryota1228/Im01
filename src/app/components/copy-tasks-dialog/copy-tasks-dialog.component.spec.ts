import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CopyTasksDialogComponent } from './copy-tasks-dialog.component';

describe('CopyTasksDialogComponent', () => {
  let component: CopyTasksDialogComponent;
  let fixture: ComponentFixture<CopyTasksDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopyTasksDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CopyTasksDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
