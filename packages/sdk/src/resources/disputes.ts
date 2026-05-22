import { HttpClient } from '../utils/http-client';
import { Dispute, DisputeEvidence, DisputeListParams } from '../types/disputes';
import { ApiResponse } from '../types/common';

export class DisputeResource {
  constructor(private http: HttpClient) {}

  retrieve(id: string): Promise<ApiResponse<Dispute>> {
    return this.http.get(`/disputes/${id}`);
  }

  list(params?: DisputeListParams): Promise<ApiResponse<Dispute[]>> {
    return this.http.get('/disputes', params as Record<string, unknown>);
  }

  submitEvidence(id: string, evidence: DisputeEvidence): Promise<ApiResponse<Dispute>> {
    return this.http.post(`/disputes/${id}/evidence`, evidence);
  }
}
