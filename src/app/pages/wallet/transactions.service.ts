import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Schemas } from '../../core/types/api.types';
import { environment } from '../../../environments/environment';

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
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/transactions`;

  getTransactions(
    minorId: number,
    page: number = 0,
    size: number = 10,
    sort: string = 'id,desc'
  ): Observable<PageResponse<TransactionDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http.get<PageResponse<TransactionDTO>>(`${this.apiUrl}/minor/${minorId}/transactions`, { params });
  }

  depositTokens(minorId: number, amount: number, motive: string): Observable<void> {
    const params = new HttpParams().set('amount', amount.toString()).set('motive', motive);
    return this.http.post<void>(`${this.apiUrl}/minor/${minorId}/deposit-tokens`, {}, { params, responseType: 'text' as 'json' });
  }

  deductTokens(minorId: number, amount: number, motive: string): Observable<void> {
    const payload = { amount, motive };
    return this.http.post<void>(`${this.apiUrl}/minor/${minorId}/deduct-tokens`, payload);
  }

  convertTokensToMoney(minorId: number, tokensToConvert: number): Observable<void> {
    const payload: ConvertTokensDTO = { tokensToConvert };
    return this.http.post<void>(`${this.apiUrl}/minor/${minorId}/convert`, payload, { responseType: 'text' as 'json' });
  }
}