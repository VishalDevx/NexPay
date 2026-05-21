"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, UserPlus, Shield, Ban, FileText, Globe, Clock, LogOut,
  Check, X, Copy, Loader2, Settings,
} from "lucide-react";

const roles = ["Owner", "Admin", "Developer", "Finance", "Read-only"];

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<"team" | "submerchants" | "sessions">("team");
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<any[]>([]);
  const [subMerchants, setSubMerchants] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Developer");
  const [inviting, setInviting] = useState(false);

  const [showCreateSub, setShowCreateSub] = useState(false);
  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subCommission, setSubCommission] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamRes, sessionsRes, subsRes] = await Promise.all([
          api.get<any>("/team"),
          api.get<any>("/sessions"),
          api.get<any>("/marketplace/sub-merchants"),
        ]);
        setMembers(teamRes);
        setSessions(sessionsRes);
        setSubMerchants(subsRes);
      } catch (err) {
        console.error("Team fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const newMember = await api.post<any>("/team/invite", { email: inviteEmail, name: inviteName, role: inviteRole });
      setMembers((prev) => [...prev, newMember]);
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("Developer");
    } catch (err) {
      console.error("Invite error:", err);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    setRemovingId(id);
    try {
      await api.delete("/team/" + id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Remove member error:", err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      await api.post("/team/" + id + "/resend-invite");
    } catch (err) {
      console.error("Resend invite error:", err);
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    setUpdatingRole(id);
    try {
      await api.patch("/team/" + id, { role });
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    } catch (err) {
      console.error("Role update error:", err);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await api.delete("/sessions/" + id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Revoke session error:", err);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setRevokingAll(true);
    try {
      await api.delete("/sessions");
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err) {
      console.error("Revoke all sessions error:", err);
    } finally {
      setRevokingAll(false);
    }
  };

  const handleCreateSubMerchant = async () => {
    if (!subName || !subEmail) return;
    setCreatingSub(true);
    try {
      const newSub = await api.post<any>("/marketplace/sub-merchants", {
        name: subName,
        email: subEmail,
        commissionPct: Number(subCommission),
      });
      setSubMerchants((prev) => [...prev, newSub]);
      setShowCreateSub(false);
      setSubName("");
      setSubEmail("");
      setSubCommission("");
    } catch (err) {
      console.error("Create sub-merchant error:", err);
    } finally {
      setCreatingSub(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

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
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">{m.name?.charAt(0) || "?"}</span>
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
                      {m.role === "Owner" ? (
                        <Badge variant="info">Owner</Badge>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          disabled={updatingRole === m.id}
                          className="text-sm border rounded-md px-2 py-1 bg-white"
                        >
                          {roles.filter((r) => r !== "Owner").map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      )}
                      {m.status === "invited" && (
                        <Button variant="ghost" size="sm" onClick={() => handleResendInvite(m.id)} title="Resend invite">
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                      {m.role !== "Owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={removingId === m.id}
                        >
                          {removingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
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
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" />
                  </div>
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
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white" disabled={!inviteEmail || inviting} onClick={handleInvite}>
                    {inviting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Sending...</> : "Send Invite"}
                  </Button>
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
                {subMerchants.map((sm) => (
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
                        <p className="font-medium">${sm.volume || "0"}</p>
                        <p className="text-xs text-gray-500">Volume</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{sm.commission || sm.commissionPct ? `${sm.commission || sm.commissionPct}%` : "0%"}</p>
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
                    <Input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Seller business name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input type="email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} placeholder="seller@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Commission %</label>
                    <Input type="number" value={subCommission} onChange={(e) => setSubCommission(e.target.value)} placeholder="5" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowCreateSub(false)}>Cancel</Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                    disabled={!subName || !subEmail || creatingSub}
                    onClick={handleCreateSubMerchant}
                  >
                    {creatingSub ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Creating...</> : "Create Sub-Merchant"}
                  </Button>
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
              {sessions.map((s) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleRevokeSession(s.id)}
                      disabled={revokingId === s.id}
                    >
                      {revokingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200"
                onClick={handleRevokeAllOthers}
                disabled={revokingAll}
              >
                {revokingAll ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Ban className="w-4 h-4 mr-1" />}
                Revoke All Other Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
