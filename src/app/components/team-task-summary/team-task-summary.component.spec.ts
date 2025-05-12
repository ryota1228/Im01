import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamTaskSummaryComponent } from './team-task-summary.component';

describe('TeamTaskSummaryComponent', () => {
  let component: TeamTaskSummaryComponent;
  let fixture: ComponentFixture<TeamTaskSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamTaskSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamTaskSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
