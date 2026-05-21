"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Ban, Gauge, Globe, RefreshCw } from "lucide-react";

export default function FraudRulesPage() {
  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    api.get<any>("/fraud-rules").then(r => setRules(r.data || [])).catch(console.error);
  }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.put("/fraud-rules/" + id, { enabled });
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fraud Rules</h1>
        <p className="text-sm text-gray-500 mt-1">Configure fraud detection and prevention rules</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <Card key={rule.id || rule.name} className="hover:shadow-md transition">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled ?? true}
                    onChange={(e) => handleToggle(rule.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
              <h3 className="font-semibold mb-1">{rule.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{rule.description || rule.desc}</p>
              <div className="flex items-center gap-2">
                <Badge variant={rule.enabled ? "success" : "neutral"}>
                  {rule.enabled ? "Active" : "Disabled"}
                </Badge>
                {rule.isAdmin && (
                  <Badge variant="warning">Admin</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
