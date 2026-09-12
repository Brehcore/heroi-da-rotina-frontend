import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { TaskService } from '../tasks/task.service';
import { TaskResponseDTO } from '../../core/services/models/task.model';
import { extractErrorMessage } from '../tasks/error-handler.util';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [CommonModule, Navbar, FormsModule],
	templateUrl: './home.html',
	styleUrls: ['./home.scss']
})
export class Home implements OnInit {
	private authService = inject(AuthService);
	private router = inject(Router);
	private route = inject(ActivatedRoute);
	private platformId = inject(PLATFORM_ID);
	private taskService = inject(TaskService);
	private cdr = inject(ChangeDetectorRef);

	pendingTasks: TaskResponseDTO[] = [];
	loading = false;
	familyId: string | null = null;
	error: string | null = null;
	successMsg: string | null = null;

	isRejectModalOpen = false;
	rejectTaskId: number | null = null;
	rejectTaskTitle: string = '';
	rejectReason: string = '';

	// Altere o método de clique no botão "Rejeitar":
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

	ngOnInit(): void {
		// prioriza query param, depois sessionStorage
		this.familyId = this.route.snapshot.queryParamMap.get('family') || null;

		if (!this.familyId && isPlatformBrowser(this.platformId)) {
			this.familyId = sessionStorage.getItem('selectedFamilyId') || localStorage.getItem('selectedFamilyId');
		}

		if (!this.familyId) {
			// redireciona para seleção de família
			this.router.navigate(['/family-selection']);
			return;
		}

		if (!isPlatformBrowser(this.platformId)) {
			// não executar requisições durante server-side prerender
			return;
		}

		this.fetchTasksForApproval();
	}

	fetchTasksForApproval(): void {
		if (!this.familyId) return;

		this.loading = true;

		this.taskService.getTasksToApprove(Number(this.familyId)).subscribe({
			next: (data) => {
				this.pendingTasks = data || [];
				this.loading = false;
				this.cdr.detectChanges();
			},
			error: (err) => {
				console.error('Erro ao buscar tarefas pendentes:', err);
				this.error = 'Não foi possível carregar as tarefas';
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
				this.loading = false;
				// Remoção otimista da tarefa na tela para evitar piscar a tela de "Carregando"
				this.pendingTasks = this.pendingTasks.filter(t => t.id !== taskId);
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

	onRejectTask(taskId: number): void {
		const reason = prompt('Informe o motivo da rejeição da tarefa:')?.trim();
		if (reason === undefined) return;

		this.loading = true;
		this.taskService.rejectTask(taskId, reason).subscribe({
			next: () => {
				this.successMsg = 'Tarefa rejeitada com sucesso!';
				this.pendingTasks = this.pendingTasks.filter(t => t.id !== taskId);
				this.loading = false;
			},
			error: (err: any) => {
				this.loading = false;
				this.error = err.error?.message || 'Erro ao rejeitar tarefa.';
			}
		});
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
      this.pendingTasks = this.pendingTasks.filter(t => t.id !== this.rejectTaskId);
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

	changeFamilyNavigation() {
		this.router.navigate(['/family-selection']);
	}
}
