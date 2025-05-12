import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamProjectListComponent } from './team-project-list.component';

describe('TeamProjectListComponent', () => {
  let component: TeamProjectListComponent;
  let fixture: ComponentFixture<TeamProjectListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamProjectListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamProjectListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
