import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService } from '../minor-sidebar/gamification.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-minor-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minor-header.html',
  styleUrls: ['./minor-header.scss']
})
export class MinorHeader implements OnInit {
  private readonly gamificationService = inject(GamificationService);
  private readonly authService = inject(AuthService);

  @Input() minorName: string = 'Campeão';
  @Input() minorProfileUrl: string | null = null;
  @Input() notificationCount: number = 3;

  // Estados de Gamificação para o mobile
  readonly level = signal<number>(1);
  readonly currentXp = signal<number>(0);
  readonly targetXp = signal<number>(100);
  readonly xpPercentage = signal<number>(0);

  // Permite sobrescrever via @Input() caso o componente pai passe diretamente
  @Input()
  set initialLevel(val: number | undefined) {
    if (val !== undefined) this.level.set(val);
  }

  @Input()
  set initialXpPercentage(val: number | undefined) {
    if (val !== undefined) this.xpPercentage.set(val);
  }

  @Output() logoutEvent = new EventEmitter<void>();

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
        console.error('Erro ao sincronizar nível no header do menor', err);
      }
    });
  }

  onLogout(): void {
    this.logoutEvent.emit();
  }
}