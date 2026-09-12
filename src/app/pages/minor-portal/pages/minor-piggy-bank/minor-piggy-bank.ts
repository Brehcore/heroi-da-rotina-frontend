import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { 
  MinorPiggyBankService, 
  PiggyBankDashboardDTO, 
  SavingsGoalResponseDTO,
  SavingsGoalCreateDTO 
} from './minor-piggy-bank.service';

@Component({
  selector: 'app-minor-piggy-bank',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './minor-piggy-bank.html',
  styleUrls: ['./minor-piggy-bank.scss']
})
export class MinorPiggyBank implements OnInit {
  private readonly piggyBankService = inject(MinorPiggyBankService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Estados com Signals
  readonly dashboard = signal<PiggyBankDashboardDTO | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Controle de Modais
  readonly showCreateModal = signal<boolean>(false);
  readonly showDepositModal = signal<boolean>(false);
  readonly showWithdrawModal = signal<boolean>(false);
  selectedGoal: SavingsGoalResponseDTO | null = null;

  // Formulário Nova Meta
  newGoalTitle = '';
  newGoalDescription = '';
  newGoalTargetAmount: number | null = null;
  newGoalTargetDate = '';
  newGoalIcon = 'TARGET';

  // Formulários de Movimentação
  actionAmount: number | null = null;

  readonly availableIcons = [
    { label: '🎯 Alvo', value: 'TARGET' },
    { label: '🚲 Bicicleta', value: 'BICYCLE' },
    { label: '🎮 Videogame', value: 'GAME' },
    { label: '📚 Livro', value: 'BOOK' },
    { label: '🎧 Fone', value: 'HEADPHONES' },
    { label: '👕 Roupa', value: 'CLOTHES' },
    { label: '⚽ Esporte', value: 'SPORTS' },
    { label: '🚀 Sonho', value: 'ROCKET' }
  ];

  // Métricas computadas
  readonly liquidBalance = computed(() => Number(this.dashboard()?.liquidWalletBalance) || 0);
  readonly totalSaved = computed(() => Number(this.dashboard()?.totalSavedInGoals) || 0);
  readonly totalCustody = computed(() => Number(this.dashboard()?.totalPiggyBalance) || 0);

  ngOnInit(): void {
    this.loadPiggyBank();
  }

  loadPiggyBank(): void {
    const minorId = this.authService.getCurrentUserId();

    if (!minorId) {
      this.errorMessage.set('Sessão expirada ou usuário não identificado.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.piggyBankService.getDashboard(minorId).subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar cofrinho', err);
        this.errorMessage.set('Não foi possível carregar os dados do seu cofrinho.');
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  // --- Criação de Meta ---
  openCreateGoalModal(): void {
  this.newGoalTitle = '';
  this.newGoalDescription = '';
  this.newGoalTargetAmount = null;
  this.newGoalTargetDate = '';
  this.newGoalIcon = 'TARGET';
  this.showCreateModal.set(true);
  }

  submitCreateGoal(): void {
    const minorId = this.authService.getCurrentUserId();
    if (!minorId) return;

    if (!this.newGoalTitle.trim() || !this.newGoalTargetAmount || this.newGoalTargetAmount < 1) {
      this.showToastError('Informe um título e um valor alvo de no mínimo R$ 1,00.');
      return;
    }

    const payload: SavingsGoalCreateDTO = {
      title: this.newGoalTitle.trim(),
      description: this.newGoalDescription.trim() || undefined,
      targetAmount: this.newGoalTargetAmount,
      targetDate: this.newGoalTargetDate ? this.newGoalTargetDate : undefined,
      icon: this.newGoalIcon
    };

    this.isProcessing.set(true);
    this.piggyBankService.createGoal(minorId, payload).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.showCreateModal.set(false);
        this.showToastSuccess('Meta criada com sucesso! 🎯');
        this.loadPiggyBank();
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.showToastError(err?.error?.message || 'Erro ao criar a meta de poupança.');
      }
    });
  }

  // --- Guardar Dinheiro na Meta ---
  openDepositModal(goal: SavingsGoalResponseDTO): void {
    this.selectedGoal = goal;
    this.actionAmount = null;
    this.showDepositModal.set(true);
  }

  submitDeposit(): void {
    const minorId = this.authService.getCurrentUserId();
    if (!minorId || !this.selectedGoal || !this.selectedGoal.id) return;

    if (!this.actionAmount || this.actionAmount < 0.5) {
      this.showToastError('O valor mínimo para guardar é de R$ 0,50.');
      return;
    }

    if (this.actionAmount > this.liquidBalance()) {
      this.showToastError(`Saldo livre insuficiente! Você tem apenas R$ ${this.liquidBalance().toFixed(2)} livre na carteira.`);
      return;
    }

    this.isProcessing.set(true);
    this.piggyBankService.depositToGoal(minorId, this.selectedGoal.id, { amount: this.actionAmount }).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.showDepositModal.set(false);
        this.showToastSuccess('Dinheiro guardado na meta com sucesso! 🐷');
        this.loadPiggyBank();
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.showToastError(err?.error?.message || 'Erro ao depositar na meta.');
      }
    });
  }

  // --- Quebrar Cofrinho / Resgatar da Meta ---
  openWithdrawModal(goal: SavingsGoalResponseDTO): void {
    this.selectedGoal = goal;
    this.actionAmount = null;
    this.showWithdrawModal.set(true);
  }

  submitWithdraw(): void {
    const minorId = this.authService.getCurrentUserId();
    if (!minorId || !this.selectedGoal || !this.selectedGoal.id) return;

    const currentSaved = Number(this.selectedGoal.currentAmount) || 0;

    if (!this.actionAmount || this.actionAmount <= 0) {
      this.showToastError('Informe um valor válido para resgate.');
      return;
    }

    if (this.actionAmount > currentSaved) {
      this.showToastError(`Você não pode resgatar mais do que tem nesta meta (R$ ${currentSaved.toFixed(2)}).`);
      return;
    }

    this.isProcessing.set(true);
    this.piggyBankService.withdrawFromGoal(minorId, this.selectedGoal.id, { amount: this.actionAmount }).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.showWithdrawModal.set(false);
        this.showToastSuccess('Valor resgatado para o saldo livre da carteira! 💸');
        this.loadPiggyBank();
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.showToastError(err?.error?.message || 'Erro ao resgatar o valor.');
      }
    });
  }

  getIconSymbol(iconKey?: string): string {
    switch (iconKey?.toUpperCase()) {
      case 'BICYCLE': return '🚲';
      case 'GAME': return '🎮';
      case 'BOOK': return '📚';
      case 'HEADPHONES': return '🎧';
      case 'CLOTHES': return '👕';
      case 'SPORTS': return '⚽';
      case 'ROCKET': return '🚀';
      default: return '🎯';
    }
  }

  private showToastSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMessage.set(null);
      this.cdr.detectChanges();
    }, 3000);
  }

  private showToastError(msg: string): void {
    this.errorMessage.set(msg);
    this.cdr.detectChanges();
    setTimeout(() => {
      this.errorMessage.set(null);
      this.cdr.detectChanges();
    }, 4000);
  }
}