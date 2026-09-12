import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../shared/navbar/navbar';
import { AuthService } from '../../core/services/auth.service';
import { WalletService } from './wallet.service';
import { TransactionService } from './transactions.service';
import { Schemas } from '../../core/types/api.types';

export type InterestFrequencyType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type WalletResponseDTO = Schemas['WalletResponseDTO'];

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './wallet.html',
  styleUrls: ['./wallet.scss']
})
export class Wallet implements OnInit {
  authService = inject(AuthService);
  private walletService = inject(WalletService);
  private transactionService = inject(TransactionService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  userRole: string = 'MONITOR';
  familyId: number = 0;

  minors: any[] = [];
  selectedMinorId: number = 0;
  wallet: WalletResponseDTO | null = null;
  
  // Variáveis de Formulários
  tokensToConvert: number | null = null;
  transactionAmount: number = 0;
  transactionMotive: string = '';
  
  newQuotation: number = 0;
  
  interestRate: number = 0;
  interestEnabled: boolean = false;
  interestFrequency: InterestFrequencyType = 'WEEKLY';

  loading = false;
  error: string | null = null;
  successMsg: string | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.userRole = this.authService.getUserRole() || sessionStorage.getItem('role') || localStorage.getItem('role') || 'MONITOR';
    this.familyId = Number(sessionStorage.getItem('selectedFamilyId') || localStorage.getItem('selectedFamilyId') || localStorage.getItem('familyId')) || 0;

    if (this.userRole === 'MONITOR') {
      this.loadMinors();
    }
  }

  loadMinors() {
    this.authService.getMyFamilies().subscribe({
      next: (families) => {
        if (families && families.length > 0) {
          const family = families.find((f: any) => f.id === this.familyId) || families[0];
          if (family && family.members) {
            this.minors = family.members.filter((m: any) => m.role === 'MINOR');
            if (this.minors.length > 0) {
              this.selectedMinorId = this.minors[0].id;
              this.loadWallet();
            }
          }
        }
      },
      error: (err) => { 
        console.error('Erro ao carregar família:', err);
      }
    });
  }

  onMinorChange() {
    this.loadWallet();
  }

  loadWallet() {
    if (!this.selectedMinorId) return;
    this.loading = true;
    this.error = null;
    
    this.walletService.getWallet(this.selectedMinorId).subscribe({
      next: (data) => { 
        if (data) {
          this.wallet = data;
          
          const money = (data as any).moneyBalances ?? (data as any).moneyBalance ?? 0;
          const tokens = (data as any).tokenBalances ?? (data as any).tokensBalance ?? (data as any).tokenBalance ?? 0;
          const quotation = (data as any).tokenQuotation ?? (data as any).tokenQuotations ?? 0;

          this.wallet.moneyBalance = Number(money) || 0;
          this.wallet.tokensBalance = Number(tokens) || 0;
          this.wallet.tokenQuotation = Number(quotation) || 0;
          
          this.newQuotation = this.wallet.tokenQuotation;
          this.interestRate = Number(data.interestRate) || 0;
          this.interestEnabled = Boolean(data.interestEnabled);
          this.interestFrequency = (data.interestFrequency as InterestFrequencyType) || 'WEEKLY';
        }
        this.loading = false; 
        this.cdr.detectChanges();
      },
      error: (err) => { 
        console.error(err); 
        this.error = 'Erro ao carregar a carteira do menor.'; 
        this.loading = false; 
        this.cdr.detectChanges();
      }
    });
  }

  depositTokens() {
    if (!this.selectedMinorId || !this.transactionAmount || !this.transactionMotive) return;
    this.loading = true; this.error = null; this.successMsg = null;

    this.transactionService.depositTokens(this.selectedMinorId, this.transactionAmount, this.transactionMotive).subscribe({
      next: () => { 
        this.successMsg = 'Fichas depositadas com sucesso!'; 
        this.cdr.detectChanges();
        this.transactionAmount = 0; 
        this.transactionMotive = ''; 
        this.loadWallet(); 
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: () => { 
        this.error = 'Erro ao depositar fichas.'; 
        this.loading = false; 
        this.cdr.detectChanges();
      }
    });
  }

  deductTokens() {
    if (!this.selectedMinorId || !this.transactionAmount || !this.transactionMotive) return;
    this.loading = true; this.error = null; this.successMsg = null;

    this.transactionService.deductTokens(this.selectedMinorId, this.transactionAmount, this.transactionMotive).subscribe({
      next: () => { 
        this.successMsg = 'Fichas removidas com sucesso!'; 
        this.cdr.detectChanges();
        this.transactionAmount = 0; 
        this.transactionMotive = ''; 
        this.loadWallet(); 
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: () => { 
        this.error = 'Erro ao remover fichas.'; 
        this.loading = false; 
        this.cdr.detectChanges();
      }
    });
  }

  updateQuotation() {
    if (!this.selectedMinorId || this.newQuotation < 0) return;
    this.loading = true; this.error = null; this.successMsg = null;

    this.walletService.updateQuotation(this.selectedMinorId, this.newQuotation).subscribe({
      next: () => { 
        this.successMsg = 'Cotação atualizada!'; 
        this.cdr.detectChanges();
        this.loadWallet(); 
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: () => { 
        this.error = 'Erro ao atualizar cotação.'; 
        this.loading = false; 
        this.cdr.detectChanges();
      }
    });
  }

  updateInterest() {
    if (!this.selectedMinorId) return;
    this.loading = true; this.error = null; this.successMsg = null;

    const config = {
      rate: this.interestRate,
      enabled: this.interestEnabled,
      frequency: this.interestFrequency
    };

    this.walletService.updateInterestConfig(this.selectedMinorId, config).subscribe({
      next: () => { 
        this.successMsg = 'Configuração de juros salva!'; 
        this.cdr.detectChanges();
        this.loadWallet(); 
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: () => { 
        this.error = 'Erro ao atualizar juros.'; 
        this.loading = false; 
        this.cdr.detectChanges();
      }
    });
  }

  convertTokens() {
    const currentTokens = this.wallet?.tokensBalance || 0;

    if (!this.selectedMinorId) return;

    if (!this.tokensToConvert || this.tokensToConvert <= 0) {
      this.error = 'Informe uma quantidade de fichas válida maior que zero.';
      return;
    }

    if (this.tokensToConvert > currentTokens) {
      this.error = `Saldo insuficiente. O menor possui apenas ${currentTokens} fichas.`;
      return;
    }

    const cotacao = this.wallet?.tokenQuotation || 0;
    const valorEstimado = (this.tokensToConvert * cotacao).toFixed(2);

    if (!confirm(`Deseja converter ${this.tokensToConvert} fichas em R$ ${valorEstimado} no cofrinho?`)) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMsg = null;

    this.transactionService.convertTokensToMoney(this.selectedMinorId, this.tokensToConvert).subscribe({
      next: () => {
        this.successMsg = `${this.tokensToConvert} fichas convertidas com sucesso em R$ ${valorEstimado}!`;
        this.tokensToConvert = null;
        this.cdr.detectChanges();
        this.loadWallet();
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        console.error(err);
        this.error = err?.error?.message || 'Erro ao converter fichas.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getFrequencyText(freq: string | undefined): string {
    if (!freq) return 'Semanal';
    switch (freq.toUpperCase()) {
      case 'DAILY': return 'Diário';
      case 'WEEKLY': return 'Semanal';
      case 'MONTHLY': return 'Mensal';
      default: return 'Semanal';
    }
  }
}