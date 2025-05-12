import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../../models/project.model';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-team-project-list',
  standalone: true,
  imports: [CommonModule, NgIf],
  templateUrl: './team-project-list.component.html'
})
export class TeamProjectListComponent {
  @Input() projects: Project[] = [];
}
