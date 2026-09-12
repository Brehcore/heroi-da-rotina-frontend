import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Schemas } from '../../../../core/types/api.types';
import { environment } from '../../../../../environments/environment';

export type GamificationResponseDTO = Schemas['GamificationResponseDTO'];

@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/gamification`;

  getMinorGamification(minorId: number): Observable<GamificationResponseDTO> {
    return this.http.get<GamificationResponseDTO>(`${this.apiUrl}/minor/${minorId}`);
  }
}