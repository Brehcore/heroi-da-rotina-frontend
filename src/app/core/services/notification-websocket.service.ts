import { Injectable, inject, NgZone } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { ScreenTimeResponseDTO } from './models/screentime.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationWebSocketService {
  private stompClient: Client | null = null;
  private notificationSubject = new Subject<ScreenTimeResponseDTO>();
  private ngZone = inject(NgZone);

  public getNotifications(): Observable<ScreenTimeResponseDTO> {
    return this.notificationSubject.asObservable();
  }

  private emitNotification(message: Message): void {
    if (message.body) {
      const notification: ScreenTimeResponseDTO = JSON.parse(message.body);
      this.ngZone.run(() => {
        this.notificationSubject.next(notification);
      });
    }
  }

  /**
   * Converte a URL HTTP para WS nativo com sufixo /websocket exigido pelo Spring Boot
   */
  private getNativeBrokerUrl(): string {
    const rawUrl = environment.wsUrl.replace(/^http/, 'ws');
    return rawUrl.endsWith('/websocket') ? rawUrl : `${rawUrl}/websocket`;
  }

  private ensureConnected(onConnectCallback: () => void): void {
    if (this.stompClient?.active) {
      onConnectCallback();
      return;
    }

    this.stompClient = new Client({
      brokerURL: this.getNativeBrokerUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (msg: string) => console.log('STOMP: ', msg)
    });

    this.stompClient.onConnect = () => {
      console.log('WebSocket Nativo Conectado!');
      onConnectCallback();
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Broker reportou erro: ' + frame.headers['message']);
      console.error('Detalhes adicionais: ' + frame.body);
    };

    this.stompClient.activate();
  }

  public connect(familyId: number): void {
    this.ensureConnected(() => {
      this.stompClient?.subscribe(`/topic/notifications/family/${familyId}`, (message: Message) => {
        this.emitNotification(message);
      });
    });
  }

  public connectForMinor(minorId: number): void {
    this.ensureConnected(() => {
      this.stompClient?.subscribe(`/topic/notifications/minor/${minorId}`, (message: Message) => {
        this.emitNotification(message);
      });
    });
  }

  public disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
  }
}