"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, Slack, Save, Trash2, Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const [preferences, setPreferences] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channel, setChannel] = useState("");
  const [slackConnected, setSlackConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<any>("/notifications").then(r => {
      const data = r.data || r;
      setPreferences(data.preferences || []);
      if (data.slack) {
        setWebhookUrl(data.slack.webhookUrl || "");
        setChannel(data.slack.channel || "");
        setSlackConnected(true);
      }
    }).catch(console.error);
  }, []);

  const togglePreference = (id: string) => {
    setPreferences(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await api.put("/notifications", { preferences });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleSlackSave = async () => {
    try {
      await api.put("/notifications/slack", { webhookUrl, channel });
      setSlackConnected(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSlackRemove = async () => {
    try {
      await api.delete("/notifications/slack");
      setWebhookUrl("");
      setChannel("");
      setSlackConnected(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Configure how you receive alerts and updates</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notification Preferences
            </CardTitle>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white"
              onClick={handleSavePreferences}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {preferences.length === 0 ? (
            <p className="text-sm text-gray-500">No notification preferences configured.</p>
          ) : (
            <div className="space-y-3">
              {preferences.map((pref) => (
                <div key={pref.id || pref.type} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-medium text-sm">{pref.label || pref.type}</p>
                    <p className="text-xs text-gray-500">{pref.description || pref.type}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.enabled ?? true}
                      onChange={() => togglePreference(pref.id || pref.type)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Slack className="w-5 h-5" /> Slack Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {slackConnected && (
            <Badge variant="success" className="mb-2">Connected</Badge>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Webhook URL</label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Channel</label>
            <Input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#notifications"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            {slackConnected && (
              <Button variant="outline" onClick={handleSlackRemove}>
                <Trash2 className="w-4 h-4 mr-1" /> Remove
              </Button>
            )}
            <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSlackSave}>
              <Save className="w-4 h-4 mr-1" /> {slackConnected ? "Update" : "Connect"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
