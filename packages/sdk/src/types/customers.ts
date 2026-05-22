import { Metadata, PaginationParams } from './common';

export interface CustomerCreateParams {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Metadata;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Metadata;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerUpdateParams {
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Metadata;
}

export interface CustomerListParams extends PaginationParams {
  email?: string;
}
