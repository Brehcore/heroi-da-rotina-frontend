import { Component } from "@angular/core";
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
selector: 'app-minor-portal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './minor-achievements.html',
  styleUrls: ['./minor-achievements.scss']
})
export class MinorAchievements {

}