import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Schemas } from '../../core/types/api.types';
import { environment } from '../../../environments/environment';

export type WalletResponseDTO = Schemas['WalletResponseDTO'];
export type InterestConfigDTO = Schemas['InterestConfigDTO'];
export type ConvertTokensDTO = Schemas['ConvertTokensDTO'];

export interface PageResponse<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface TransactionDTO {
  id: number;
  type: 'CREDIT' | 'DEBIT';
  motive: string;
  formattedValue: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/wallets`;

  getWallet(minorId: number): Observable<WalletResponseDTO> {
    return this.http.get<WalletResponseDTO>(`${this.apiUrl}/minor/${minorId}?t=${new Date().getTime()}`);
  }
  

  updateQuotation(minorId: number, value: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/minor/${minorId}/quotation?value=${value}`, {}, { responseType: 'text' as 'json' });
  }

  updateInterestConfig(minorId: number, config: InterestConfigDTO): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/minor/${minorId}/interest-config`, config, { responseType: 'text' as 'json' });
  }
}