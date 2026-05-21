"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, MessageSquare, X, Send, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import React from "react";
import { api } from "@/lib/api";

const categoryOptions = [
  { value: "PAYMENT_FAILED", label: "Payment Failed" },
  { value: "SETTLEMENT_DELAYED", label: "Settlement Delayed" },
  { value: "REFUND_ISSUE", label: "Refund Issue" },
  { value: "WEBHOOK_ISSUE", label: "Webhook Issue" },
  { value: "KYC_ISSUE", label: "KYC Issue" },
  { value: "DISPUTE_ISSUE", label: "Dispute Issue" },
  { value: "ACCOUNT_SUSPENSION", label: "Account Suspension" },
  { value: "GENERAL", label: "General" },
  { value: "BILLING", label: "Billing" },
  { value: "TECHNICAL", label: "Technical" },
];

const statusBadgeVariantForTicket = (status: string) => {
  const map: Record<string, string> = {
    OPEN: "info",
    PENDING_MERCHANT: "warning",
    PENDING_INTERNAL: "orange",
    RESOLVED: "success",
    CLOSED: "neutral",
  };
  return map[status] || "neutral";
};

const priorityBadgeVariant = (priority: string) => {
  const map: Record<string, string> = {
    LOW: "neutral",
    MEDIUM: "info",
    HIGH: "orange",
    URGENT: "destructive",
  };
  return map[priority] || "neutral";
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("GENERAL");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newMessage, setNewMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [search]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await api.get<any>("/support/tickets?" + params.toString());
      setTickets(res.data || res || []);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
      setMessages([]);
      return;
    }
    setExpandedTicket(ticketId);
    setMessagesLoading(true);
    try {
      const res = await api.get<any>("/support/tickets/" + ticketId + "/messages");
      setMessages(res.data || res || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      await api.post("/support/tickets/" + ticketId + "/messages", { message: replyText });
      setReplyText("");
      const res = await api.get<any>("/support/tickets/" + ticketId + "/messages");
      setMessages(res.data || res || []);
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const closeTicket = async (ticketId: string) => {
    try {
      await api.post("/support/tickets/" + ticketId + "/close");
      fetchTickets();
      if (expandedTicket === ticketId) {
        setExpandedTicket(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to close ticket:", err);
    }
  };

  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreatingTicket(true);
    try {
      await api.post("/support/tickets", {
        subject: newSubject,
        category: newCategory,
        priority: newPriority,
        message: newMessage,
      });
      setShowNewTicket(false);
      setNewSubject("");
      setNewCategory("GENERAL");
      setNewPriority("MEDIUM");
      setNewMessage("");
      fetchTickets();
    } catch (err) {
      console.error("Failed to create ticket:", err);
    } finally {
      setCreatingTicket(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your support requests and inquiries</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => setShowNewTicket(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Ticket
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tickets by subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tickets.length > 0 ? (
                tickets.map((t: any) => (
                  <React.Fragment key={t.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openTicket(t.id)}
                    >
                      <TableCell className="font-medium">{t.subject}</TableCell>
                      <TableCell className="text-sm text-gray-600">{t.category}</TableCell>
                      <TableCell>
                        <Badge variant={priorityBadgeVariant(t.priority) as any}>{t.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariantForTicket(t.status) as any}>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell>
                        {expandedTicket === t.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </TableCell>
                    </TableRow>
                    {expandedTicket === t.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-gray-50 p-4">
                          {messagesLoading ? (
                            <div className="space-y-3">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="space-y-3 max-h-80 overflow-y-auto">
                                {messages.length > 0 ? (
                                  messages.map((m: any, i: number) => (
                                    <div
                                      key={i}
                                      className={`p-3 rounded-lg ${m.isFromMerchant !== false ? "bg-blue-50 border border-blue-200 ml-8" : "bg-gray-100 border border-gray-200 mr-8"}`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-gray-500">
                                          {m.isFromMerchant !== false ? "You" : m.sender || "Support Team"}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                                        </span>
                                      </div>
                                      <p className="text-sm">{m.message || m.content}</p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-gray-400 text-center py-4">No messages yet</p>
                                )}
                              </div>
                              {t.status !== "CLOSED" && t.status !== "RESOLVED" && (
                                <div className="flex gap-2">
                                  <textarea
                                    className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none"
                                    rows={3}
                                    placeholder="Type your reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                  />
                                  <div className="flex flex-col gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-500 text-white"
                                      onClick={() => sendReply(t.id)}
                                      disabled={!replyText.trim() || sendingReply}
                                    >
                                      <Send className="w-4 h-4 mr-1" /> {sendingReply ? "Sending..." : "Send"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => closeTicket(t.id)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" /> Close
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {(t.status === "CLOSED" || t.status === "RESOLVED") && (
                                <p className="text-sm text-gray-400 text-center">This ticket is {t.status.toLowerCase()}.</p>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No support tickets found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showNewTicket && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowNewTicket(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Create New Ticket</h3>
              <button onClick={() => setShowNewTicket(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Brief description of the issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  {categoryOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <Select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                  rows={5}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                  onClick={createTicket}
                  disabled={!newSubject.trim() || !newMessage.trim() || creatingTicket}
                >
                  {creatingTicket ? "Creating..." : "Submit Ticket"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
