import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GamificationService } from './gamification.service';
import { AuthService } from '../../../../core/services/auth.service';

export interface DailyQuote {
  quote: string;
  author: string;
}

const DEFAULT_QUOTE: DailyQuote = {
  quote: 'Disciplina hoje, liberdade amanhã!',
  author: 'Seu futuro herói'
};

@Component({
  selector: 'app-minor-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './minor-sidebar.html',
  styleUrls: ['./minor-sidebar.scss']
})
export class MinorSidebar implements OnInit {
  private readonly gamificationService = inject(GamificationService);
  private readonly authService = inject(AuthService);

  // Estados com fallback
  readonly level = signal<number>(1);
  readonly currentXp = signal<number>(0);
  readonly targetXp = signal<number>(100);
  readonly xpPercentage = signal<number>(0);

  // Permite sobrescrever via @Input() se necessário
  @Input()
  set initialLevel(val: number | undefined) {
    if (val !== undefined) this.level.set(val);
  }

  @Input()
  set initialCurrentXp(val: number | undefined) {
    if (val !== undefined) this.currentXp.set(val);
  }

  @Input()
  set initialTargetXp(val: number | undefined) {
    if (val !== undefined) this.targetXp.set(val);
  }

  private _dailyQuote: DailyQuote = DEFAULT_QUOTE;

  @Input()
  set dailyQuote(val: DailyQuote | null | undefined) {
    this._dailyQuote = val ?? DEFAULT_QUOTE;
  }
  get dailyQuote(): DailyQuote {
    return this._dailyQuote;
  }

  ngOnInit(): void {
    this.loadGamification();
  }

  loadGamification(): void {
    const minorId = this.authService.getCurrentUserId();
    if (!minorId) return;

    this.gamificationService.getMinorGamification(minorId).subscribe({
      next: (data) => {
        if (data) {
          this.level.set(data.currentLevel ?? 1);
          this.currentXp.set(data.currentXp ?? 0);
          this.targetXp.set(data.targetXp ?? 100);
          this.xpPercentage.set(data.progressPercentage ?? 0);
        }
      },
      error: (err) => {
        console.error('Erro ao sincronizar nível e XP na sidebar', err);
      }
    });
  }
}