"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, UserPlus, Shield, Ban, FileText, Globe, Clock, LogOut,
  Check, X, Copy, Loader2, Settings,
} from "lucide-react";

const mockTeamMembers = [
  { id: "u1", name: "Alice Johnson", email: "alice@acme.com", role: "Owner", status: "active", lastActive: "2 min ago" },
  { id: "u2", name: "Bob Smith", email: "bob@acme.com", role: "Admin", status: "active", lastActive: "1 hour ago" },
  { id: "u3", name: "Carol Davis", email: "carol@acme.com", role: "Developer", status: "active", lastActive: "3 hours ago" },
  { id: "u4", name: "David Wilson", email: "david@acme.com", role: "Finance", status: "active", lastActive: "1 day ago" },
  { id: "u5", name: "Eve Brown", email: "eve@acme.com", role: "Read-only", status: "invited", lastActive: "—" },
];

const mockSubMerchants = [
  { id: "sm1", name: "Seller One", email: "seller1@marketplace.com", status: "active", volume: "$45,200", commission: "5%" },
  { id: "sm2", name: "Seller Two", email: "seller2@marketplace.com", status: "pending", volume: "$12,800", commission: "3%" },
  { id: "sm3", name: "Seller Three", email: "seller3@marketplace.com", status: "active", volume: "$89,100", commission: "7%" },
];

const mockSessions = [
  { id: "s1", device: "Chrome on macOS", ip: "203.0.113.1", lastActive: "Now", current: true },
  { id: "s2", device: "Safari on iOS", ip: "198.51.100.5", lastActive: "2 hours ago", current: false },
  { id: "s3", device: "Firefox on Windows", ip: "192.0.2.10", lastActive: "1 day ago", current: false },
];

const roles = ["Owner", "Admin", "Developer", "Finance", "Read-only"];

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<"team" | "submerchants" | "sessions">("team");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Developer");
  const [showCreateSub, setShowCreateSub] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account & Team</h1>
        <p className="text-sm text-gray-500 mt-1">Manage team members, sub-merchants, and sessions</p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: "team" as const, label: "Team Members", icon: Users },
          { id: "submerchants" as const, label: "Sub-Merchants", icon: UserPlus },
          { id: "sessions" as const, label: "Sessions", icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
                activeTab === tab.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "team" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Members</CardTitle>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => setShowInvite(true)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTeamMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">{m.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{m.name}</p>
                          {m.status === "invited" && <Badge variant="warning">Invited</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={m.role === "Owner" ? "info" : "neutral"}>{m.role}</Badge>
                      {m.role !== "Owner" && (
                        <Button variant="ghost" size="sm" className="text-red-500">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {showInvite && (
            <Card className="border-blue-200">
              <CardHeader><CardTitle>Invite Team Member</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                      {roles.filter((r) => r !== "Owner").map((r) => (<option key={r}>{r}</option>))}
                    </select>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  Invite link will expire in 48 hours. You can revoke before acceptance.
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white" disabled={!inviteEmail}>Send Invite</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Audit Log</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { action: "API key generated", user: "Alice J.", date: "2 min ago" },
                  { action: "Payout triggered", user: "Bob S.", date: "1 hour ago" },
                  { action: "Webhook endpoint created", user: "Carol D.", date: "3 hours ago" },
                  { action: "Fraud rule updated", user: "Alice J.", date: "5 hours ago" },
                ].map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <span>{entry.action}</span>
                    <div className="flex items-center gap-4 text-gray-500">
                      <span>{entry.user}</span>
                      <span className="text-xs">{entry.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "submerchants" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sub-Merchant Accounts</CardTitle>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => setShowCreateSub(true)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Create Sub-Merchant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockSubMerchants.map((sm) => (
                  <div key={sm.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{sm.name}</p>
                        <Badge variant={sm.status === "active" ? "success" : "warning"}>{sm.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{sm.email}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="font-medium">${sm.volume}</p>
                        <p className="text-xs text-gray-500">Volume</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{sm.commission}</p>
                        <p className="text-xs text-gray-500">Commission</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {showCreateSub && (
            <Card className="border-blue-200">
              <CardHeader><CardTitle>Create Sub-Merchant</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Business name</label>
                    <Input placeholder="Seller business name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input type="email" placeholder="seller@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Commission %</label>
                    <Input type="number" placeholder="5" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowCreateSub(false)}>Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white">Create Sub-Merchant</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === "sessions" && (
        <Card>
          <CardHeader><CardTitle>Active Sessions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.device}</p>
                        {s.current && <Badge variant="success">Current</Badge>}
                      </div>
                      <p className="text-sm text-gray-500">IP: {s.ip} · Last active: {s.lastActive}</p>
                    </div>
                  </div>
                  {!s.current && (
                    <Button variant="ghost" size="sm" className="text-red-500">
                      <LogOut className="w-4 h-4" /> Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button variant="outline" size="sm" className="text-red-500 border-red-200">
                <Ban className="w-4 h-4 mr-1" /> Revoke All Other Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
