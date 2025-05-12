import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamProjectSelectDialogComponent } from './team-project-select-dialog.component';

describe('TeamProjectSelectDialogComponent', () => {
  let component: TeamProjectSelectDialogComponent;
  let fixture: ComponentFixture<TeamProjectSelectDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamProjectSelectDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamProjectSelectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
