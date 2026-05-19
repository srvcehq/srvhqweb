"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { db } from "@/data/api";
import { Communication, Contact } from "@/data/types";
import { findContactName } from "@/lib/contact-display";
import { useCompany } from "@/providers/company-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Mail,
  Phone,
  StickyNote,
  MessageCircle,
  Search,
  ArrowLeft,
  Send,
  CheckCheck,
  Check,
  AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (messageDate.getTime() === yesterday.getTime()) return "Yesterday";
  const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageLabel(type: string, dateStr: string): string {
  const typeLabel =
    type === "sms" ? "Text" : type === "email" ? "Email" : type === "call" ? "Call" : "Note";
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  let timeStr: string;
  if (messageDate.getTime() === today.getTime()) {
    timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } else if (messageDate.getTime() === yesterday.getTime()) {
    timeStr = "Yesterday";
  } else {
    timeStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return `${typeLabel} • ${timeStr}`;
}

function typeIcon(type: string) {
  switch (type) {
    case "email": return <Mail className="w-4 h-4" />;
    case "sms": return <MessageCircle className="w-4 h-4" />;
    case "call": return <Phone className="w-4 h-4" />;
    case "note": return <StickyNote className="w-4 h-4" />;
    default: return <MessageSquare className="w-4 h-4" />;
  }
}

function ChannelTag({ type }: { type: string }) {
  const cfg: Record<string, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
    email: { label: "Email", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40", Icon: Mail },
    sms: { label: "Text", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40", Icon: MessageCircle },
    call: { label: "Call", cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/40", Icon: Phone },
    note: { label: "Note", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40", Icon: StickyNote },
  };
  const c = cfg[type] ?? cfg.note;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${c.cls}`}>
      <c.Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function statusIcon(status?: string) {
  switch (status) {
    case "delivered": return <CheckCheck className="w-3.5 h-3.5 text-green-500" />;
    case "read": return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
    case "sent": return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
    case "failed": return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    default: return null;
  }
}

function statusLabel(status?: string) {
  switch (status) {
    case "delivered": return "Delivered";
    case "read": return "Read";
    case "sent": return "Sent";
    case "failed": return "Failed";
    default: return null;
  }
}

function formatFullDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

/* ------------------------------------------------------------------ */
/* MessageBubble                                                       */
/* ------------------------------------------------------------------ */

function MessageBubble({ comm, onDetail }: { comm: Communication; onDetail: (c: Communication) => void }) {
  const isOutbound = comm.direction === "outbound" || !comm.direction;
  const isInbound = comm.direction === "inbound";
  const isSmsOrEmail = comm.type === "sms" || comm.type === "email";
  const label = formatMessageLabel(comm.type, comm.sent_at || comm.created_date);
  const stIcon = statusIcon(comm.status);

  return (
    <div
      className={`flex flex-col cursor-pointer group ${isInbound ? "items-start" : "items-end"}`}
      onClick={() => onDetail(comm)}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        {stIcon && <span className="flex items-center">{stIcon}</span>}
      </div>
      {isSmsOrEmail ? (
        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm transition-shadow duration-150 group-hover:shadow-md ${
          isOutbound ? "bg-green-600 text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
        }`}>
          {comm.subject && (
            <p className={`font-medium text-xs mb-1 ${isOutbound ? "text-green-100" : "text-muted-foreground"}`}>
              {comm.subject}
            </p>
          )}
          <p className="whitespace-pre-wrap">{comm.body || "No content"}</p>
        </div>
      ) : (
        <div className="max-w-[85%] rounded-lg border border-border bg-card px-4 py-3 text-sm transition-shadow duration-150 group-hover:shadow-md">
          <div className="mb-1.5"><ChannelTag type={comm.type} /></div>
          {comm.subject && <p className="font-medium text-foreground text-sm mb-1">{comm.subject}</p>}
          <p className="whitespace-pre-wrap text-muted-foreground">{comm.body || "No content"}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CommunicationsPage() {
  const { currentCompanyId, currentCompany } = useCompany();
  const brandName = currentCompany?.name || "Your business";

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [detailComm, setDetailComm] = useState<Communication | null>(null);
  const [showMobileConversation, setShowMobileConversation] = useState(false);

  const smsEndRef = useRef<HTMLDivElement>(null);
  const emailEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [comms, ctcts] = await Promise.all([
        db.Communication.filter({ company_id: currentCompanyId }),
        db.Contact.filter({ company_id: currentCompanyId }),
      ]);
      setCommunications(comms);
      setContacts(ctcts);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  const getContactName = (contactId: string) => findContactName(contacts, contactId);

  const contactsWithPreview = useMemo(() => {
    const contactMap = new Map<string, { contact: Contact; lastMessage: string; lastMessageTime: string; lastMessageType: Communication["type"] }>();
    for (const comm of communications) {
      const commTime = new Date(comm.sent_at || comm.created_date).getTime();
      const existing = contactMap.get(comm.contact_id);
      if (!existing || commTime > new Date(existing.lastMessageTime).getTime()) {
        const contact = contacts.find((c) => c.id === comm.contact_id);
        if (contact) {
          contactMap.set(comm.contact_id, {
            contact,
            lastMessage: comm.body || comm.subject || "",
            lastMessageTime: comm.sent_at || comm.created_date,
            lastMessageType: comm.type,
          });
        }
      }
    }
    return Array.from(contactMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [communications, contacts]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contactsWithPreview;
    const q = searchQuery.toLowerCase();
    return contactsWithPreview.filter(
      ({ contact }) =>
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(q) ||
        contact.phone?.toLowerCase().includes(q) ||
        contact.email?.toLowerCase().includes(q)
    );
  }, [contactsWithPreview, searchQuery]);

  const selectedComms = useMemo(() => {
    if (!selectedContactId) return [];
    return communications
      .filter((c) => c.contact_id === selectedContactId)
      .sort((a, b) => new Date(a.sent_at || a.created_date).getTime() - new Date(b.sent_at || b.created_date).getTime());
  }, [communications, selectedContactId]);

  const smsComms = useMemo(() => selectedComms.filter((c) => c.type === "sms"), [selectedComms]);
  const emailComms = useMemo(() => selectedComms.filter((c) => c.type === "email"), [selectedComms]);

  const selectedContact = useMemo(() => contacts.find((c) => c.id === selectedContactId), [contacts, selectedContactId]);

  useEffect(() => {
    setSmsBody("");
    setEmailBody("");
    setEmailSubject("");
  }, [selectedContactId]);

  useEffect(() => {
    setTimeout(() => {
      smsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      emailEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [selectedComms.length, selectedContactId]);

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowMobileConversation(true);
  };

  const handleSendSms = async () => {
    if (!smsBody.trim() || !selectedContactId) return;
    const newComm = await db.Communication.create({
      contact_id: selectedContactId,
      company_id: currentCompanyId,
      type: "sms",
      direction: "outbound",
      channel: "manual",
      body: smsBody,
      sent_at: new Date().toISOString(),
      status: "sent",
    });
    setCommunications((prev) => [...prev, newComm]);
    setSmsBody("");
  };

  const handleSendEmail = async () => {
    if (!emailBody.trim() || !selectedContactId) return;
    const newComm = await db.Communication.create({
      contact_id: selectedContactId,
      company_id: currentCompanyId,
      type: "email",
      direction: "outbound",
      channel: "manual",
      subject: emailSubject,
      body: emailBody,
      sent_at: new Date().toISOString(),
      status: "sent",
    });
    setCommunications((prev) => [...prev, newComm]);
    setEmailBody("");
    setEmailSubject("");
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex overflow-hidden">
        {/* ============ CONTACTS SIDEBAR ============ */}
        <div className={`w-full md:w-80 md:min-w-[320px] border-r border-border bg-background flex flex-col ${showMobileConversation ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-border shrink-0">
            <h1 className="text-lg font-bold text-foreground mb-3">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No conversations found</div>
            ) : (
              filteredContacts.map(({ contact, lastMessage, lastMessageTime, lastMessageType }) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectContact(contact.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors duration-150 ${
                    selectedContactId === contact.id
                      ? "bg-green-50 dark:bg-green-950/30 border-l-2 border-l-green-600"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {contact.first_name} {contact.last_name}
                    </span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatRelativeTime(lastMessageTime)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <ChannelTag type={lastMessageType} />
                    <p className="text-xs text-muted-foreground truncate leading-relaxed">{lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ============ RIGHT SIDE: TWO PANELS ============ */}
        <div className={`flex-1 flex flex-col min-w-0 bg-background ${showMobileConversation ? "flex" : "hidden md:flex"}`}>
          {selectedContactId && selectedContact ? (
            <>
              {/* Shared contact header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowMobileConversation(false)}
                  className="md:hidden p-1 -ml-1 rounded-lg hover:bg-muted"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground truncate">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {[selectedContact.phone, selectedContact.email].filter(Boolean).join(" • ")}
                  </p>
                </div>
              </div>

              {/* Two panels */}
              <div className="flex-1 flex min-w-0 overflow-hidden">

                {/* ---- SMS PANEL ---- */}
                <div className="flex-1 flex flex-col border-r border-border min-w-0">
                  {/* Panel label */}
                  <div className="px-4 py-2.5 border-b border-border bg-muted/20 shrink-0 flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Text Messages</span>
                  </div>

                  {/* SMS thread */}
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {smsComms.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        No text messages yet
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        {smsComms.map((comm) => (
                          <MessageBubble key={comm.id} comm={comm} onDetail={setDetailComm} />
                        ))}
                        <div ref={smsEndRef} />
                      </div>
                    )}
                  </div>

                  {/* SMS compose */}
                  <div className="border-t border-border px-4 py-3 shrink-0">
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Sending as <span className="font-medium text-foreground">{brandName}</span> &bull; via text message
                    </p>
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Type a message..."
                        value={smsBody}
                        onChange={(e) => setSmsBody(e.target.value)}
                        className="flex-1 text-sm h-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendSms();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendSms}
                        disabled={!smsBody.trim()}
                        size="icon"
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 h-9 w-9 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ---- EMAIL PANEL ---- */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Panel label */}
                  <div className="px-4 py-2.5 border-b border-border bg-muted/20 shrink-0 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Email</span>
                  </div>

                  {/* Email thread */}
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {emailComms.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        No emails yet
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        {emailComms.map((comm) => (
                          <MessageBubble key={comm.id} comm={comm} onDetail={setDetailComm} />
                        ))}
                        <div ref={emailEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Email compose */}
                  <div className="border-t border-border px-4 py-3 space-y-2 shrink-0">
                    <p className="text-[11px] text-muted-foreground">
                      Sending as <span className="font-medium text-foreground">{brandName}</span> &bull; via email
                    </p>
                    <Input
                      placeholder="Enter subject..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <div className="flex gap-2 items-end">
                      <Textarea
                        placeholder="Compose email..."
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={3}
                        className="flex-1 resize-none text-sm"
                      />
                      <Button
                        onClick={handleSendEmail}
                        disabled={!emailBody.trim()}
                        size="icon"
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 h-9 w-9 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Select a conversation</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Select a contact to view messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ MESSAGE DETAIL MODAL ============ */}
      <Dialog open={!!detailComm} onOpenChange={(open) => !open && setDetailComm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Message Details</DialogTitle>
          </DialogHeader>
          {detailComm && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Type</p>
                  <div className="flex items-center gap-1.5 font-medium capitalize">
                    {typeIcon(detailComm.type)}
                    {detailComm.type}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Status</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    {statusIcon(detailComm.status)}
                    {statusLabel(detailComm.status) || "—"}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    {detailComm.direction === "inbound" ? "From" : "To"}
                  </p>
                  <p className="font-medium">{getContactName(detailComm.contact_id)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    {detailComm.direction === "inbound" ? "To" : "From"}
                  </p>
                  <p className="font-medium">You</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Timestamp</p>
                  <p className="font-medium">
                    {formatFullDateTime(detailComm.sent_at || detailComm.created_date).date}{" "}
                    at {formatFullDateTime(detailComm.sent_at || detailComm.created_date).time}
                  </p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                {detailComm.subject && (
                  <p className="font-semibold text-foreground mb-2">{detailComm.subject}</p>
                )}
                <div className="text-sm whitespace-pre-wrap bg-muted rounded-lg p-4 text-foreground">
                  {detailComm.body || "No content"}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
