import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService, TransactionDTO, PageResponse } from '../../../wallet/wallet.service';
import { Schemas } from '../../../../core/types/api.types';
import { TransactionService } from '../../../wallet/transactions.service';

export type WalletResponseDTO = Schemas['WalletResponseDTO'];

@Component({
  selector: 'app-minor-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './minor-wallet.html',
  styleUrls: ['./minor-wallet.scss']
})
export class MinorWallet implements OnInit {
  private walletService = inject(WalletService);
  private transactionService = inject(TransactionService)

  wallet: WalletResponseDTO | null = null;
  transactions: TransactionDTO[] = [];
  filteredTransactions: TransactionDTO[] = [];

  // Estados de carregamento
  loading = true;
  loadingTransactions = false;
  error: string | null = null;
  minorId: number | null = null;

  // Filtros e Paginação (Spring Pageable)
  searchTerm = '';
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50];
  totalPages = 0;
  totalElements = 0;
  currentSort = 'id,desc';

  ngOnInit(): void {
    const rawId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    this.minorId = rawId ? Number(rawId) : null;

    if (!this.minorId) {
      this.error = 'Sessão inválida. Faça login novamente.';
      this.loading = false;
      return;
    }

    this.loadWalletData();
    this.loadTransactions();
  }

  loadWalletData(): void {
    if (!this.minorId) return;

    this.walletService.getWallet(this.minorId).subscribe({
      next: (data) => {
        this.wallet = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar carteira:', err);
        this.error = 'Não foi possível carregar as informações da carteira.';
        this.loading = false;
      }
    });
  }

  loadTransactions(): void {
    if (!this.minorId) return;

    this.loadingTransactions = true;
    this.transactionService.getTransactions(this.minorId, this.currentPage, this.pageSize, this.currentSort).subscribe({
      next: (res: PageResponse<TransactionDTO>) => {
        this.transactions = res.content || [];
        this.totalPages = res.page?.totalPages ?? 0;
        this.totalElements = res.page?.totalElements ?? 0;
        this.applyLocalSearch();
        this.loadingTransactions = false;
      },
      error: (err) => {
        console.error('Erro ao carregar transações:', err);
        this.loadingTransactions = false;
      }
    });
  }

  applyLocalSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredTransactions = [...this.transactions];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredTransactions = this.transactions.filter(t => 
      t.motive?.toLowerCase().includes(term) ||
      t.formattedValue?.toLowerCase().includes(term) ||
      t.type?.toLowerCase().includes(term)
    );
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadTransactions();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadTransactions();
  }

  onSortChange(sort: string): void {
    this.currentSort = sort;
    this.currentPage = 0;
    this.loadTransactions();
  }

  getFrequencyLabel(freq?: string): string {
    switch (freq) {
      case 'DAILY': return 'Diário';
      case 'WEEKLY': return 'Semanal';
      case 'MONTHLY': return 'Mensal';
      default: return 'Não configurada';
    }
  }
}