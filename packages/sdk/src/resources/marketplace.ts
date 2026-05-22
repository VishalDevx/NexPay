import { HttpClient } from '../utils/http-client';
import {
  SubMerchant,
  SubMerchantCreateParams,
  SplitTransaction,
  SplitParams,
} from '../types/marketplace';
import { ApiResponse } from '../types/common';

export class MarketplaceResource {
  constructor(private http: HttpClient) {}

  createSubMerchant(params: SubMerchantCreateParams): Promise<ApiResponse<SubMerchant>> {
    return this.http.post('/marketplace', params);
  }

  listSubMerchants(): Promise<ApiResponse<SubMerchant[]>> {
    return this.http.get('/marketplace');
  }

  createSplit(params: SplitParams): Promise<ApiResponse<SplitTransaction>> {
    return this.http.post('/marketplace/split', params);
  }
}
