import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../shared/navbar/navbar';
import { TaskCreateDTO, TaskResponseDTO } from '../../core/services/models/task.model';
import { AuthService } from '../../core/services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { TaskService } from './task.service';
import { extractErrorMessage } from './error-handler.util';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './tasks.html',
  styleUrls: ['./tasks.scss']
})
export class Tasks implements OnInit {

  authService = inject(AuthService);
  private taskService = inject(TaskService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  private readonly DICEBEAR_BASE = 'https://api.dicebear.com/8.x/avataaars/svg';
  private errorTimeout: any;

  tasks: TaskResponseDTO[] = [];
  loading = false;
  error: string | null = null;
  successMsg: string | null = null;
  minors: any[] = [];

  // Modal
  showCreateForm = false;
  newTask: TaskCreateDTO = {
    title: '',
    description: '',
    tokenReward: 10,
    minorId: 0,
    monitorCreatorId: 0
  };

  userRole: string = 'MONITOR';
  userId: number = 0;
  familyId: number = 0;

  // Paginação
  currentPage = 0;
  pageSize = 10;
  totalPages = 1;

  isRejectModalOpen = false;
  rejectTaskId: number | null = null;
  rejectTaskTitle: string = '';
  rejectReason: string = '';


  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.userRole = this.authService.getUserRole() || sessionStorage.getItem('role') || localStorage.getItem('role') || 'MONITOR';
    this.userId = Number(sessionStorage.getItem('userId') || localStorage.getItem('userId')) || 0;
    this.familyId = Number(sessionStorage.getItem('selectedFamilyId') || sessionStorage.getItem('selectedFamilyid') || localStorage.getItem('selectedFamilyId') || localStorage.getItem('familyId')) || 0;

    this.loadTasks();

    if (this.userRole === 'MONITOR') {
      this.loadMinors();
    }
  }

  showErrorMessage(message: string): void {
    this.error = message;

    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }

    this.errorTimeout = setTimeout(() => {
      this.error = null;
    }, 4000); // Some sozinho após 4 segundos
  }

  dismissError(): void {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    this.error = null;
  }

  loadMinors() {
    this.authService.getMyFamilies().subscribe({
      next: (families) => {
        if (families && families.length > 0) {
          const family = families.find((f: any) => f.id === this.familyId) || families[0];
          if (family && family.members) {
            this.minors = family.members.filter((m: any) => m.role === 'MINOR');
          }
        }
      },
      error: (err) => console.error('Erro ao carregar menores da família:', err)
    });
  }

  loadTasks() {
    this.loading = true;
    this.error = null;

    if (this.userRole === 'MONITOR') {
      if (!this.familyId) {
        this.error = 'ID da família não encontrado';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }
      this.taskService.getFamilyTasks(this.familyId, this.currentPage, this.pageSize).subscribe({
        next: (data: any) => {
          this.tasks = Array.isArray(data) ? data : (data?.content || []);
          this.totalPages = data?.totalPages || 1;
          this.currentPage = data?.number || 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => { console.error('Erro ao carregar tarefas da família:', err); this.error = 'Erro ao carregar tarefas da família.'; this.loading = false; this.cdr.detectChanges(); }
      });
    } else {
      if (!this.userId) {
        this.error = 'ID do usuário não encontrado';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }
      this.taskService.getMinorTasks(this.userId).subscribe({
        next: (data) => { this.tasks = data || []; this.loading = false; this.cdr.detectChanges(); },
        error: (err) => { console.error('Erro ao carregar tarefas:', err); this.error = 'Erro ao carregar tarefas.'; this.loading = false; this.cdr.detectChanges(); }
      });
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadTasks();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadTasks();
    }
  }

  toggleCreateForm() {
    this.showCreateForm = true;
    this.newTask = {
      title: '', description: '', tokenReward: 10, minorId: this.minors.length > 0 ? this.minors[0].id : 0, monitorCreatorId: this.userId
    };
  }

  closeCreateForm() {
    this.showCreateForm = false;
  }

  createTask() {
    this.loading = true;
    this.error = null;
    this.successMsg = null;

    console.log('ENVIANDO PARA O JAVA:', this.newTask);

    this.taskService.createTask(this.newTask).subscribe({
      next: (task) => {
        this.tasks.push(task);
        this.closeCreateForm();
        this.loading = false;
        this.successMsg = 'Tarefa criada com sucesso!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        console.error('Erro ao criar tarefa:', err);
        this.error = extractErrorMessage(err, 'Erro ao criar tarefa. Tente novamente.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  concludeTask(id: number) {
    this.loading = true;
    this.error = null;
    this.successMsg = null;

    this.taskService.concludeTask(id).subscribe({
      next: () => {
        this.successMsg = 'Tarefa concluída com sucesso!';
        this.loadTasks();
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        console.error('Erro ao concluir tarefa:', err);
        this.error = extractErrorMessage(err, 'Erro ao concluir tarefa. Tente novamente.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  approveTask(taskId: number): void {
    this.loading = true;
    this.taskService.approveTask(taskId).subscribe({
      next: () => {
        this.successMsg = 'Tarefa aprovada com sucesso!';

        // 1. Atualiza o status diretamente no item da lista para refletir na tela na hora:
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
          task.status = 'APROVADA'; // ou 'APPROVED', conforme seu enum de retorno
        }

        this.loadTasks();

        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || 'Erro ao aprovar a tarefa.';
      }
    });
  }

  openRejectModal(task: any): void {
    this.rejectTaskId = task.id;
    this.rejectTaskTitle = task.title;
    this.rejectReason = '';
    this.isRejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.isRejectModalOpen = false;
    this.rejectTaskId = null;
    this.rejectReason = '';
  }

  confirmReject(): void {
    if (!this.rejectTaskId) return;

    const reason = this.rejectReason.trim();
    if (!reason) {
      this.error = 'Por favor, informe o motivo da revisão.';
      return;
    }

    this.loading = true;
    this.taskService.rejectTask(this.rejectTaskId, reason).subscribe({
      next: () => {
        this.successMsg = 'Tarefa devolvida para revisão com sucesso!';
        // Atualiza o status da tarefa diretamente na lista da tabela
        const foundTask = this.tasks.find(t => t.id === this.rejectTaskId);
        if (foundTask) {
          foundTask.status = 'REJEITADA';
        }
        this.closeRejectModal();
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || 'Erro ao rejeitar a tarefa.';
        this.closeRejectModal();
      }
    });
  }

  deleteTask(id: number) {
    if (confirm('Tem certeza que deseja remover esta tarefa? Esta ação não pode ser desfeita.')) {
      this.loading = true;
      this.error = null;
      this.successMsg = null;

      this.taskService.deleteTask(id).subscribe({
        next: () => {
          this.successMsg = 'Tarefa removida com sucesso!';
          this.loadTasks();
          setTimeout(() => {
            this.successMsg = null;
            this.cdr.detectChanges();
          }, 2000);
        },
        error: (err: any) => {
          this.loading = false;
          const msg = err.error?.message || 'Erro ao excluir a tarefa.';
          this.showErrorMessage(msg);
        }
      });
    }
  }

  getStatusText(status: string): string {
    if (!status) return 'Desconhecido';
    switch (status.toUpperCase()) {
      case 'PENDING':
      case 'PENDENTE':
        return 'Pendente';
      case 'COMPLETED':
      case 'CONCLUIDA':
        return 'Completa';
      case 'APPROVED':
      case 'APROVADA':
        return 'Aprovada';
      case 'REJECTED':
      case 'REJEITADA':
        return 'Rejeitada';
      default:
        return status;
    }
  }
}