import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ScreenTimeService } from '../../../screentime/screentime.service';
import { NotificationWebSocketService } from '../../../../core/services/notification-websocket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Schemas } from '../../../../core/types/api.types';

export type ScreenTimeResponseDTO = Schemas['ScreenTimeResponseDTO'];


@Component({
  selector: 'app-minor-screentime',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './minor-screentime.html',
  styleUrls: ['./minor-screentime.scss']
})
export class MinorScreenTime implements OnInit, OnDestroy {
  private readonly screenTimeService = inject(ScreenTimeService);
  private readonly wsService = inject(NotificationWebSocketService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  private wsSubscription?: Subscription;

  minorId: number | null = null;
  tokensToExchange: number = 5;

  submitting = false;
  successResult: ScreenTimeResponseDTO | null = null;
  errorMessage: string | null = null;
  statusNotice: string | null = null;

  // Opções rápidas de fichas para seleção simplificada
  quickTokenOptions: number[] = [2, 5, 10, 20];

  ngOnInit(): void {
    this.minorId = this.authService.getCurrentUserId() 
      || Number(sessionStorage.getItem('userId') || localStorage.getItem('userId')) 
      || null;

    if (this.minorId) {
      this.initWebSocket(this.minorId);
    }
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }

  private initWebSocket(minorId: number): void {
    this.wsService.connectForMinor(minorId);

    this.wsSubscription = this.wsService.getNotifications().subscribe({
      next: (notification: ScreenTimeResponseDTO) => {
        if (!notification) return;

        // Se houver uma solicitação em tela e for referente a ela
        if (this.successResult && (!notification.requestId || notification.requestId === this.successResult.requestId)) {
          if (notification.status === 'REJECTED') {
            // Destrava a tela imediatamente
            this.successResult = null;
            this.statusNotice = null;
            this.errorMessage = '❌ Sua solicitação de tempo de tela foi recusada pelo seu responsável. Nenhuma ficha foi descontada.';
            this.cdr.detectChanges();
          } else if (notification.status === 'APPROVED') {
            this.successResult = notification;
            this.statusNotice = '🎉 Parabéns! Seu tempo de tela foi aprovado pelo responsável!';
            this.errorMessage = null;
            this.cdr.detectChanges();
          }
        }
      },
      error: (err) => console.error('Erro ao processar notificação de tempo de tela via WebSocket:', err)
    });
  }

  selectQuickOption(amount: number): void {
    this.tokensToExchange = amount;
    this.clearAlerts();
  }

  onExchangeTokens(): void {
    if (!this.minorId) {
      this.errorMessage = 'Identificador do menor não encontrado na sessão.';
      return;
    }

    if (!this.tokensToExchange || this.tokensToExchange <= 0) {
      this.errorMessage = 'Informe uma quantidade válida de fichas (mínimo 1).';
      return;
    }

    this.submitting = true;
    this.clearAlerts();

    const payload = {
      minorId: this.minorId,
      tokens: this.tokensToExchange
    };

    this.screenTimeService.exchangeTokens(payload).subscribe({
      next: (response: ScreenTimeResponseDTO) => {
        this.successResult = response;
        this.submitting = false;

        if (response.status === 'PENDING') {
          this.statusNotice = '⏳ Pedido enviado! Aguardando aprovação do seu responsável...';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submitting = false;
        if (err.error && typeof err.error.message === 'string') {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Não foi possível solicitar o tempo de tela. Verifique o saldo de fichas ou limite diário.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  resetRequest(): void {
    this.clearAlerts();
  }

  private clearAlerts(): void {
    this.errorMessage = null;
    this.successResult = null;
    this.statusNotice = null;
  }
}