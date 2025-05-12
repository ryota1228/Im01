import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationSettingsDialogComponent } from './notification-settings-dialog.component';

describe('NotificationSettingsDialogComponent', () => {
  let component: NotificationSettingsDialogComponent;
  let fixture: ComponentFixture<NotificationSettingsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationSettingsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
