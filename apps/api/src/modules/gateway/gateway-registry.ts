import type { GatewayAdapter } from "./gateway.types";

export class GatewayRegistry {
  private adapters: Map<string, GatewayAdapter> = new Map();

  register(adapter: GatewayAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: string): GatewayAdapter | undefined {
    return this.adapters.get(provider);
  }

  getAll(): GatewayAdapter[] {
    return Array.from(this.adapters.values());
  }

  has(provider: string): boolean {
    return this.adapters.has(provider);
  }
}

export const gatewayRegistry = new GatewayRegistry();
