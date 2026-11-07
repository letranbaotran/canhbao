'use client';

import mqtt, { MqttClient } from 'mqtt';
import { IoTTelemetryData } from '@/components/IoTSimulatorTab';

export interface SyncMessage {
  senderId: string;
  timestamp: number;
  data: IoTTelemetryData;
  scenarioName?: string;
  scenarioId?: string;
  action?: 'SYNC' | 'STOP_ALL_ALERTS_SYSTEM_WIDE';
  triggerSource: 'BUTTON_TEST' | 'SCENARIO_CLICK' | 'SLIDER_CHANGE' | 'RESET_NORMAL' | 'STOP_ALARM';
}

type SyncCallback = (msg: SyncMessage) => void;
type StatusCallback = (status: 'connected' | 'connecting' | 'disconnected', broker: string) => void;

class RealtimeSyncManager {
  private client: MqttClient | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private myClientId: string = '';
  private syncCallbacks: Set<SyncCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private currentStatus: 'connected' | 'connecting' | 'disconnected' = 'connecting';
  private currentBroker: string = 'EMQX Public WSS';
  private readonly TOPIC = 'easupso/canhbao/v1/telemetry_sync';

  constructor() {
    if (typeof window !== 'undefined') {
      this.myClientId = 'easup_' + Math.random().toString(36).substring(2, 10);
      this.initBroadcastChannel();
      this.initStorageFallback();
      this.initMqtt();
      this.initMobileLifecycleListeners();
    }
  }

  private initMobileLifecycleListeners() {
    if (typeof window === 'undefined') return;

    // Hồi sinh kết nối MQTT khi người dùng mở lại Safari trên iOS hoặc bật màn hình
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndReconnectMqtt();
      }
    });

    window.addEventListener('pageshow', () => {
      this.checkAndReconnectMqtt();
    });

    window.addEventListener('focus', () => {
      this.checkAndReconnectMqtt();
    });
  }

  private initStorageFallback() {
    if (typeof window === 'undefined') return;
    try {
      window.addEventListener('storage', (e) => {
        if (e.key === 'easup_sync_fallback' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed && parsed.senderId !== this.myClientId && parsed.data) {
              this.notifySync(parsed.data);
            }
          } catch {}
        }
      });
    } catch {}
  }

  public checkAndReconnectMqtt() {
    if (!this.client || !this.client.connected) {
      this.updateStatus('connecting');
      try {
        if (this.client) {
          this.client.reconnect();
        } else {
          this.initMqtt();
        }
      } catch {
        this.initMqtt();
      }
    }
  }

  private initBroadcastChannel() {
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('easupso_iot_sync_bc');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.senderId !== this.myClientId) {
            this.notifySync(event.data);
          }
        };
      }
    } catch {
      // BroadcastChannel không được hỗ trợ trong môi trường hạn chế
    }
  }

  private initMqtt() {
    const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
    this.currentBroker = 'EMQX Cloud (WSS SSL)';
    this.updateStatus('connecting');

    try {
      this.client = mqtt.connect(BROKER_URL, {
        clientId: this.myClientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 3000,
        keepalive: 20,
      });

      this.client.on('connect', () => {
        this.updateStatus('connected');
        this.client?.subscribe(this.TOPIC, { qos: 1 });
      });

      this.client.on('message', (topic, payload) => {
        if (topic === this.TOPIC) {
          try {
            const parsed: SyncMessage = JSON.parse(payload.toString());
            if (parsed && parsed.senderId !== this.myClientId) {
              this.notifySync(parsed);
            }
          } catch {
            // Gói tin không đúng định dạng
          }
        }
      });

      this.client.on('reconnect', () => {
        this.updateStatus('connecting');
      });

      this.client.on('close', () => {
        this.updateStatus('disconnected');
      });

      this.client.on('error', () => {
        this.updateStatus('disconnected');
      });
    } catch {
      this.updateStatus('disconnected');
    }
  }

  private updateStatus(status: 'connected' | 'connecting' | 'disconnected') {
    this.currentStatus = status;
    this.statusCallbacks.forEach((cb) => {
      try {
        cb(status, this.currentBroker);
      } catch {
        // Safe callback execution
      }
    });
  }

  private notifySync(msg: SyncMessage) {
    this.syncCallbacks.forEach((cb) => {
      try {
        cb(msg);
      } catch {
        // Safe callback execution
      }
    });
  }

  /**
   * Đăng ký lắng nghe tín hiệu đồng bộ từ các máy khác
   */
  public onSync(callback: SyncCallback): () => void {
    this.syncCallbacks.add(callback);
    return () => {
      this.syncCallbacks.delete(callback);
    };
  }

  /**
   * Đăng ký lắng nghe trạng thái kết nối mạng MQTT
   */
  public onStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.currentStatus, this.currentBroker);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Phát lệnh đồng bộ toàn hệ thống đến tất cả các máy đang mở trang
   */
  public broadcastTelemetry(
    data: IoTTelemetryData,
    triggerSource: 'BUTTON_TEST' | 'SCENARIO_CLICK' | 'SLIDER_CHANGE' | 'RESET_NORMAL' | 'STOP_ALARM' = 'BUTTON_TEST',
    scenarioName?: string,
    scenarioId?: string,
    action: 'SYNC' | 'STOP_ALL_ALERTS_SYSTEM_WIDE' = 'SYNC'
  ): boolean {
    const message: SyncMessage = {
      senderId: this.myClientId,
      timestamp: Date.now(),
      data,
      scenarioName,
      scenarioId,
      action,
      triggerSource,
    };

    // 1. Đồng bộ tức thì tới các tab trên cùng máy qua BroadcastChannel & localStorage Fallback (iOS Safari)
    try {
      this.broadcastChannel?.postMessage(message);
    } catch {
      // Ignored
    }
    try {
      localStorage.setItem(
        'easup_sync_fallback',
        JSON.stringify({
          senderId: this.myClientId,
          timestamp: Date.now(),
          data: message,
        })
      );
    } catch {
      // Ignored
    }

    // 2. Phát broadcast toàn cầu qua MQTT Broker over WSS
    if (this.client && this.client.connected) {
      this.client.publish(this.TOPIC, JSON.stringify(message), { qos: 1 });
      return true;
    }

    return false;
  }

  /**
   * Admin / Cán bộ phát lệnh TẮT TOÀN BỘ CẢNH BÁO trên toàn hệ thống đến tất cả các máy
   */
  public broadcastStopAllAlerts(safeResetData: IoTTelemetryData): boolean {
    return this.broadcastTelemetry(
      safeResetData,
      'STOP_ALARM',
      'Vận hành An toàn (Dưới Báo động I)',
      'NONE',
      'STOP_ALL_ALERTS_SYSTEM_WIDE'
    );
  }

  public getStatus() {
    return {
      status: this.currentStatus,
      broker: this.currentBroker,
      clientId: this.myClientId,
    };
  }
}

export const realtimeSync = new RealtimeSyncManager();
