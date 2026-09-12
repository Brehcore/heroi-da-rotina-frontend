import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Schemas } from '../../../../core/types/api.types';
import { environment } from '../../../../../environments/environment';

export type PiggyBankDashboardDTO = Schemas['PiggyBankDashboardDTO'];
export type SavingsGoalResponseDTO = Schemas['SavingsGoalResponseDTO'];
export type SavingsGoalCreateDTO = Schemas['SavingsGoalCreateDTO'];
export type SavingsGoalDepositDTO = Schemas['SavingsGoalDepositDTO'];
export type SavingsGoalWithdrawDTO = Schemas['SavingsGoalWithdrawDTO'];

@Injectable({
  providedIn: 'root'
})
export class MinorPiggyBankService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/minor-portal/piggy-bank`;

  getDashboard(minorId: number): Observable<PiggyBankDashboardDTO> {
    return this.http.get<PiggyBankDashboardDTO>(`${this.apiUrl}/minor/${minorId}`);
  }

  createGoal(minorId: number, dto: SavingsGoalCreateDTO): Observable<SavingsGoalResponseDTO> {
    return this.http.post<SavingsGoalResponseDTO>(`${this.apiUrl}/minor/${minorId}/goals`, dto);
  }

  depositToGoal(minorId: number, goalId: number, dto: SavingsGoalDepositDTO): Observable<SavingsGoalResponseDTO> {
    return this.http.post<SavingsGoalResponseDTO>(`${this.apiUrl}/minor/${minorId}/goals/${goalId}/deposit`, dto);
  }

  withdrawFromGoal(minorId: number, goalId: number, dto: SavingsGoalWithdrawDTO): Observable<SavingsGoalResponseDTO> {
    return this.http.post<SavingsGoalResponseDTO>(`${this.apiUrl}/minor/${minorId}/goals/${goalId}/withdraw`, dto);
  }
}