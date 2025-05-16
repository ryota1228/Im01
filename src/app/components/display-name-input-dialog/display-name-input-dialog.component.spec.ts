import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayNameInputDialogComponent } from './display-name-input-dialog.component';

describe('DisplayNameInputDialogComponent', () => {
  let component: DisplayNameInputDialogComponent;
  let fixture: ComponentFixture<DisplayNameInputDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayNameInputDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayNameInputDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
