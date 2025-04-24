import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteSectionDialogComponent } from './delete-section-dialog.component';

describe('DeleteSectionDialogComponent', () => {
  let component: DeleteSectionDialogComponent;
  let fixture: ComponentFixture<DeleteSectionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteSectionDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteSectionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
