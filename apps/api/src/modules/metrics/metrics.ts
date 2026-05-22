export class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  private key(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) return name;
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}{${tagStr}}`;
  }

  incrementCounter(name: string, tags?: Record<string, string>): void {
    const k = this.key(name, tags);
    this.counters.set(k, (this.counters.get(k) || 0) + 1);
  }

  observeHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const k = this.key(name, tags);
    if (!this.histograms.has(k)) {
      this.histograms.set(k, []);
    }
    this.histograms.get(k)!.push(value);
  }

  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const k = this.key(name, tags);
    this.gauges.set(k, value);
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  getHistogram(name: string): { p50: number; p95: number; p99: number; count: number; sum: number } {
    const values = this.histograms.get(name) || [];
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    if (count === 0) {
      return { p50: 0, p95: 0, p99: 0, count: 0, sum: 0 };
    }

    const p50 = sorted[Math.floor(count * 0.5)] || 0;
    const p95 = sorted[Math.floor(count * 0.95)] || 0;
    const p99 = sorted[Math.floor(count * 0.99)] || 0;

    return { p50, p95, p99, count, sum };
  }

  getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  getAllMetrics() {
    const counters: Record<string, number> = {};
    for (const [k, v] of this.counters) {
      counters[k] = v;
    }

    const histograms: Record<string, any> = {};
    for (const [k] of this.histograms) {
      histograms[k] = this.getHistogram(k);
    }

    const gauges: Record<string, number> = {};
    for (const [k, v] of this.gauges) {
      gauges[k] = v;
    }

    return { counters, histograms, gauges };
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  toPrometheus(): string {
    const lines: string[] = [];

    for (const [k, v] of this.counters) {
      const [name, tags] = this.parseKey(k);
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${tags} ${v}`);
    }

    for (const [k] of this.histograms) {
      const [name, tags] = this.parseKey(k);
      const h = this.getHistogram(k);
      lines.push(`# HELP ${name} Histogram metric`);
      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_count${tags} ${h.count}`);
      lines.push(`${name}_sum${tags} ${h.sum}`);
      lines.push(`${name}_bucket{le="50"}${tags} ${h.p50}`);
      lines.push(`${name}_bucket{le="95"}${tags} ${h.p95}`);
      lines.push(`${name}_bucket{le="99"}${tags} ${h.p99}`);
    }

    for (const [k, v] of this.gauges) {
      const [name, tags] = this.parseKey(k);
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}${tags} ${v}`);
    }

    return lines.join("\n");
  }

  private parseKey(k: string): [string, string] {
    const braceIdx = k.indexOf("{");
    if (braceIdx === -1) return [k, ""];
    return [k.slice(0, braceIdx), k.slice(braceIdx)];
  }
}

export const metrics = new MetricsCollector();
