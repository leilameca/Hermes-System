export interface OfflineOperation {
  id: string;
  type: string;
  createdAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  payload: unknown;
}
