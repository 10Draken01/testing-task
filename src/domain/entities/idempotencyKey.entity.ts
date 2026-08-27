export interface IdempotencyKeyEntity {
  idempotencyKey: string;
  method: string;
  path: string;
  bodyHash: string;
  status: 'processing' | 'completed';
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: string;
}