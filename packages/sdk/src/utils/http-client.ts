import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  NexPayAuthenticationError,
  NexPayPaymentError,
  NexPayValidationError,
  NexPayRateLimitError,
  NexPayApiError,
} from './errors';
import { ApiResponse, PaginatedResponse } from '../types/common';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
};

export class HttpClient {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;

  constructor(baseURL: string, apiKey: string, timeout: number = 30000, retryConfig?: RetryConfig) {
    this.retryConfig = { ...DEFAULT_RETRY, ...retryConfig };

    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>('get', path, { params });
  }

  async post<T>(path: string, data?: unknown, idempotencyKey?: string): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.request<T>('post', path, { data, headers });
  }

  async patch<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('patch', path, { data });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('delete', path);
  }

  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    config?: AxiosRequestConfig,
    attempt: number = 0,
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.request({
        method,
        url: path,
        ...config,
      });
      return response.data;
    } catch (error: unknown) {
      if (!axios.isAxiosError(error)) {
        throw error;
      }

      const status = error.response?.status || 500;
      const data = error.response?.data as Record<string, unknown> | undefined;
      const message = (data?.message as string) || error.message;

      const shouldRetry =
        (status === 429 || status >= 500) && attempt < this.retryConfig.maxRetries;

      if (shouldRetry) {
        const delay = this.retryConfig.baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.request<T>(method, path, config, attempt + 1);
      }

      throw this.mapError(status, message, data);
    }
  }

  private mapError(status: number, message: string, details?: unknown): never {
    switch (status) {
      case 401:
        throw new NexPayAuthenticationError(message, details);
      case 402:
        throw new NexPayPaymentError(message, details);
      case 422:
        throw new NexPayValidationError(message, details);
      case 429:
        throw new NexPayRateLimitError(message, details);
      default:
        throw new NexPayApiError(message, status, details);
    }
  }
}
