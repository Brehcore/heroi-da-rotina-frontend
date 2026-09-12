import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { Schemas } from '../../../../core/types/api.types';
import { environment } from '../../../../../environments/environment';

export type TaskResponseDTO = Schemas['TaskResponseDTO'];

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Component({
  selector: 'app-minor-tasks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minor-tasks.html',
  styleUrls: ['./minor-tasks.scss']
})
export class MinorTasks implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiUrl = `${environment.apiUrl}/api/tasks`;

  tasksPage = signal<Page<TaskResponseDTO> | null>(null);
  allLoadedTasks: TaskResponseDTO[] = [];
  filteredTasks: TaskResponseDTO[] = [];

  loading = true;
  error: string | null = null;
  successMsg: string | null = null;
  actionLoadingId: number | null = null;

  selectedFilter: string = 'ALL';
  currentPage: number = 0;
  readonly pageSize: number = 6;

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    const minorId = this.authService.getCurrentUserId();
    if (!minorId) {
      this.error = 'Sessão expirada. Faça login novamente.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    const params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('size', this.pageSize.toString())
      .set('sort', 'creationDate,desc');

    this.http.get<Page<TaskResponseDTO>>(`${this.apiUrl}/minor/${minorId}`, { params }).subscribe({
      next: (page) => {
        this.tasksPage.set(page);
        this.allLoadedTasks = page.content || [];
        this.applyFilter(this.selectedFilter);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar tarefas do menor:', err);
        this.error = 'Não foi possível carregar as tarefas no momento.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter(filter: string): void {
    this.selectedFilter = filter;
    if (filter === 'ALL') {
      this.filteredTasks = [...this.allLoadedTasks];
    } else {
      this.filteredTasks = this.allLoadedTasks.filter((t) => t.status === filter);
    }
  }

  goToPage(page: number): void {
    const pageData = this.tasksPage();
    if (!pageData || page < 0 || page >= pageData.totalPages) return;
    this.currentPage = page;
    this.loadTasks();
  }

  onConcludeTask(task: TaskResponseDTO): void {
    if (!task.id) return;
    this.actionLoadingId = task.id;
    this.error = null;
    this.successMsg = null;

    this.http.patch<TaskResponseDTO>(`${this.apiUrl}/${task.id}/conclude`, {}).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.successMsg = `Tarefa "${task.title}" enviada para aprovação do responsável!`;
        this.loadTasks();
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.error = err.error?.message || 'Erro ao concluir tarefa. Tente novamente.';
        this.cdr.detectChanges();
      }
    });
  }
}