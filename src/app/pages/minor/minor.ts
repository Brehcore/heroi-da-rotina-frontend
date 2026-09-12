import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Navbar } from '../../shared/navbar/navbar';
import { WalletResponseDTO } from '../../core/services/models/wallet.model';
import { TaskCreateDTO, TaskResponseDTO } from '../../core/services/models/task.model';
import { TaskService } from '../tasks/task.service';
import { WalletService } from '../wallet/wallet.service';
import { extractErrorMessage } from '../tasks/error-handler.util';
import { TransactionService } from '../wallet/transactions.service'

export interface TransactionDTO {
  id: number;
  type: 'CREDIT' | 'DEBIT';
  motive: string;
  formattedValue: string;
  date: string;
}

@Component({
  selector: 'app-minor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar],
  templateUrl: './minor.html',
  styleUrls: ['./minor.scss']
})
export class Minor implements OnInit {
  authService = inject(AuthService);
  private taskService = inject(TaskService);
  private walletService = inject(WalletService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private transactionService = inject(TransactionService)

  minorId: string | null = null;
  minorName: string | null = null;
  wallet: WalletResponseDTO | null = null;
  tasks: TaskResponseDTO[] = [];
  completedTasks: TaskResponseDTO[] = []; // Adicionado para tarefas que o menor concluiu e aguardam aprovação
  transactions: TransactionDTO[] = [];
  loading = false;
  error: string | null = null;
  successMsg: string | null = null;

  // Form states
  showCreateTaskForm = false;
  newTask = {
    title: '',
    description: '',
    tokenReward: 0
  };

  // Filtros e Paginação - Tarefas
  taskSearchTerm: string = '';
  taskFilterDate: string = '';
  taskCurrentPage: number = 1;
  taskItemsPerPage: number = 10;
  itemsPerPageOptions: number[] = [10, 20, 50, 100];

  get filteredTasks(): TaskResponseDTO[] {
    let filtered = this.tasks;
    if (this.taskSearchTerm) {
      const term = this.taskSearchTerm.toLowerCase();
      filtered = filtered.filter(t => t.title?.toLowerCase().includes(term));
    }
    if (this.taskFilterDate) {
      filtered = filtered.filter(t => {
        if (!t.creationDate) return false;
        return t.creationDate.substring(0, 10) === this.taskFilterDate;
      });
    }
    return filtered;
  }

  get paginatedTasks(): TaskResponseDTO[] {
    const start = (this.taskCurrentPage - 1) * this.taskItemsPerPage;
    return this.filteredTasks.slice(start, start + this.taskItemsPerPage);
  }

  get totalTaskPages(): number {
    return Math.ceil(this.filteredTasks.length / this.taskItemsPerPage) || 1;
  }

  nextTaskPage(): void {
    if (this.taskCurrentPage < this.totalTaskPages) {
      this.taskCurrentPage++;
    }
  }

  prevTaskPage(): void {
    if (this.taskCurrentPage > 1) {
      this.taskCurrentPage--;
    }
  }

  onTaskFilterChange(): void {
    this.taskCurrentPage = 1;
  }

  // Filtros e Paginação - Transações
  txSearchTerm: string = '';
  txFilterDate: string = '';
  txCurrentPage: number = 1;
  txItemsPerPage: number = 10;

  get filteredTransactions(): TransactionDTO[] {
    let filtered = this.transactions;
    if (this.txSearchTerm) {
      const term = this.txSearchTerm.toLowerCase();
      filtered = filtered.filter(t => t.motive?.toLowerCase().includes(term));
    }
    if (this.txFilterDate) {
      filtered = filtered.filter(t => {
        if (!t.date) return false;
        return t.date.substring(0, 10) === this.txFilterDate;
      });
    }
    return filtered;
  }

  get paginatedTransactions(): TransactionDTO[] {
    const start = (this.txCurrentPage - 1) * this.txItemsPerPage;
    return this.filteredTransactions.slice(start, start + this.txItemsPerPage);
  }

  get totalTxPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.txItemsPerPage) || 1;
  }

  nextTxPage(): void {
    if (this.txCurrentPage < this.totalTxPages) {
      this.txCurrentPage++;
    }
  }

  prevTxPage(): void {
    if (this.txCurrentPage > 1) {
      this.txCurrentPage--;
    }
  }

  onTxFilterChange(): void {
    this.txCurrentPage = 1;
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.minorId = this.route.snapshot.queryParamMap.get('minorId');
    this.minorName = this.route.snapshot.queryParamMap.get('minorName');

    if (!this.minorId || this.minorId === 'null' || this.minorId === '') {
      this.error = 'ID do menor não identificado';
      this.router.navigate(['/members']);
      return;
    }

    this.fetchWalletData();
    this.fetchTasks();
    this.fetchTasksForApproval();
    this.fetchTransactions();
  }

  fetchWalletData(): void {
    if (!this.minorId) return;

    this.loading = true;
    this.error = null;

    this.walletService.getWallet(Number(this.minorId)).subscribe({
      next: (data) => {
        this.wallet = data as any;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao buscar carteira:', err);
        this.error = 'Erro ao carregar carteira do menor';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  fetchTasks(): void {
    if (!this.minorId) return;

    this.taskService.getMinorTasks(Number(this.minorId)).subscribe({
      next: (data) => {
        this.tasks = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao buscar tarefas:', err);
        this.cdr.detectChanges();
      }
    });
  }

  fetchTasksForApproval(): void {
    if (!this.minorId) return;

    this.taskService.getMinorPendingTasks(Number(this.minorId)).subscribe({
      next: (data) => {
        this.completedTasks = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao buscar tarefas para aprovação:', err);
        this.cdr.detectChanges();
      }
    });
  }

  fetchTransactions(): void {
    if (!this.minorId) return;

    this.transactionService.getTransactions(Number(this.minorId)).subscribe({
      next: (data) => {
        // O backend retorna as transações dentro da propriedade "content" de acordo com o JSON de exemplo
        this.transactions = data.content || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao buscar transações:', err);
      }
    });
  }

  createTask(): void {
    if (!this.newTask.title.trim() || !this.newTask.description.trim()) {
      this.error = 'Título e descrição são obrigatórios';
      return;
    }

    if (!this.minorId) {
      this.error = 'ID do menor não identificado';
      return;
    }

    const createTaskDTO: TaskCreateDTO = {
      title: this.newTask.title,
      description: this.newTask.description,
      tokenReward: this.newTask.tokenReward,
      minorId: parseInt(this.minorId, 10),
      monitorCreatorId: Number(sessionStorage.getItem('userId') || localStorage.getItem('userId')) || 0
    };

    this.loading = true;
    this.error = null;
    this.successMsg = null;

    this.taskService.createTask(createTaskDTO).subscribe({
      next: (response) => {
        console.log('Tarefa criada com sucesso:', response);
        this.loading = false;
        this.tasks.push(response);
        this.closeCreateTaskForm(); // Fecha o formulário
        this.fetchTasks(); // Atualiza a lista de "Todas as Tarefas"
        this.successMsg = 'Tarefa criada com sucesso!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        console.error('Erro ao criar tarefa:', err);
        this.error = 'Erro ao criar tarefa';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  approveTask(taskId: number): void {
    this.loading = true;
    this.error = null;
    this.successMsg = null;

    this.taskService.approveTask(taskId).subscribe({
      next: () => {
        console.log('Tarefa aprovada com sucesso');
        this.loading = false;
        this.fetchTasks();
        this.fetchTasksForApproval();
        this.fetchWalletData();
        this.successMsg = 'Tarefa aprovada com sucesso!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        console.error('Erro ao aprovar tarefa:', err);
        
        this.error = extractErrorMessage(err, 'Erro ao aprovar tarefa. Tente novamente.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  rejectTask(taskId: number): void {
    const reason = prompt('Qual o motivo da reprovação da tarefa?');

    // Cancela a ação se o usuário clicar em Cancelar ou deixar em branco
    if (!reason || reason.trim() === '') {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMsg = null;

    this.taskService.rejectTask(taskId, reason).subscribe({
      next: () => {
        this.loading = false;
        this.fetchTasks();
        this.fetchTasksForApproval();
        this.successMsg = 'Tarefa rejeitada com sucesso!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        this.error = extractErrorMessage(err, 'Erro ao rejeitar tarefa. Tente novamente.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleCreateTaskForm(): void {
    this.showCreateTaskForm = !this.showCreateTaskForm;
  }

  closeCreateTaskForm(): void {
    this.showCreateTaskForm = false;
    this.newTask = {
      title: '',
      description: '',
      tokenReward: 0
    };
  }

  goBack(): void {
    this.router.navigate(['/members']);
  }

  getTaskStatusColor(status: string): string {
    if (!status) return '';
    switch (status.toUpperCase()) {
      case 'PENDING':
      case 'PENDENTE':
        return 'pending';
      case 'APPROVED':
      case 'APROVADA':
        return 'approved';
      case 'COMPLETED':
      case 'CONCLUIDA':
        return 'completed';
      case 'REJECTED':
      case 'REJEITADA':
        return 'rejected';
      default:
        return '';
    }
  }

  getTaskStatusText(status: string): string {
    if (!status) return 'Desconhecido';
    switch (status.toUpperCase()) {
      case 'PENDING':
      case 'PENDENTE':
        return 'Pendente';
      case 'APPROVED':
      case 'APROVADA':
        return 'Aprovada';
      case 'COMPLETED':
      case 'CONCLUIDA':
        return 'Concluída';
      case 'REJECTED':
      case 'REJEITADA':
        return 'Rejeitada';
      default:
        return status;
    }
  }

  getUserName(): string {
    return 'Monitor';
  }
}
