import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamMemberSelectDialogComponent } from './team-member-select-dialog.component';

describe('TeamMemberSelectDialogComponent', () => {
  let component: TeamMemberSelectDialogComponent;
  let fixture: ComponentFixture<TeamMemberSelectDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamMemberSelectDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamMemberSelectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
