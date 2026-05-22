export interface NexPayConfig {
  apiKey: string;
  environment?: 'sandbox' | 'live';
  baseURL?: string;
  timeout?: number;
  retryConfig?: {
    maxRetries?: number;
    baseDelay?: number;
  };
}

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export type Amount = number;

export type IdempotencyKey = string;

export type Metadata = Record<string, string>;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
