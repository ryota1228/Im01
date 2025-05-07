import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmCompleteDialogComponent } from './confirm-complete-dialog.component';

describe('ConfirmCompleteDialogComponent', () => {
  let component: ConfirmCompleteDialogComponent;
  let fixture: ComponentFixture<ConfirmCompleteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmCompleteDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmCompleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
