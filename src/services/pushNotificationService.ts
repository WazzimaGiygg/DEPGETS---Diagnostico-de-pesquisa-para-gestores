export interface PushLogItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  channel: 'Web/Mobile SW Push' | 'Web Notification API' | 'Alerta Nativo In-App';
}

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private listeners: Array<(logs: PushLogItem[]) => void> = [];
  private logs: PushLogItem[] = [];

  async initServiceWorker(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      return true;
    } catch {
      return false;
    }
  }

  getPermissionState(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await this.initServiceWorker();
      }
      return result;
    } catch {
      return 'denied';
    }
  }

  subscribeLogs(cb: (logs: PushLogItem[]) => void): () => void {
    this.listeners.push(cb);
    cb(this.logs);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private addLog(item: PushLogItem) {
    this.logs = [item, ...this.logs].slice(0, 20);
    this.listeners.forEach((cb) => cb(this.logs));
  }

  async sendNativePush(title: string, body: string, tag = 'diagorg-event'): Promise<PushLogItem> {
    const now = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let channel: PushLogItem['channel'] = 'Alerta Nativo In-App';

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (!this.swRegistration && 'serviceWorker' in navigator) {
          this.swRegistration = await navigator.serviceWorker.getRegistration() || null;
        }
        if (this.swRegistration && 'showNotification' in this.swRegistration) {
          await this.swRegistration.showNotification(title, {
            body,
            tag,
          });
          channel = 'Web/Mobile SW Push';
        } else {
          new Notification(title, { body, tag });
          channel = 'Web Notification API';
        }
      } catch {
        channel = 'Alerta Nativo In-App';
      }
    }

    const logItem: PushLogItem = {
      id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      timestamp: now,
      channel,
    };

    this.addLog(logItem);
    return logItem;
  }
}

export const pushService = new PushNotificationService();
