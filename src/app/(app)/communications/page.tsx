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
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (messageDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }
  const diffDays = Math.floor(
    (today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageLabel(type: string, dateStr: string): string {
  const typeLabel =
    type === "sms"
      ? "SMS"
      : type === "email"
        ? "Email"
        : type === "call"
          ? "Call"
          : "Note";
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  let timeStr: string;
  if (messageDate.getTime() === today.getTime()) {
    timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } else if (messageDate.getTime() === yesterday.getTime()) {
    timeStr = "Yesterday";
  } else {
    timeStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return `${typeLabel} \u2022 ${timeStr}`;
}

function typeIcon(type: string) {
  switch (type) {
    case "email":
      return <Mail className="w-4 h-4" />;
    case "sms":
      return <MessageCircle className="w-4 h-4" />;
    case "call":
      return <Phone className="w-4 h-4" />;
    case "note":
      return <StickyNote className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
}

function statusIcon(status?: string) {
  switch (status) {
    case "delivered":
      return <CheckCheck className="w-3.5 h-3.5 text-green-500" />;
    case "read":
      return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
    case "sent":
      return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
    case "failed":
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    default:
      return null;
  }
}

function statusLabel(status?: string) {
  switch (status) {
    case "delivered":
      return "Delivered";
    case "read":
      return "Read";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    default:
      return null;
  }
}

function formatFullDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CommunicationsPage() {
  const { currentCompanyId } = useCompany();

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [replyChannel, setReplyChannel] = useState<"sms" | "email">("sms");
  const [replyBody, setReplyBody] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [detailComm, setDetailComm] = useState<Communication | null>(null);
  const [showMobileConversation, setShowMobileConversation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load data
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

  const getContactName = (contactId: string) =>
    findContactName(contacts, contactId);

  // Contacts with last message preview, sorted by most recent activity
  const contactsWithPreview = useMemo(() => {
    const contactMap = new Map<
      string,
      {
        contact: Contact;
        lastMessage: string;
        lastMessageTime: string;
        lastMessageType: Communication["type"];
      }
    >();

    for (const comm of communications) {
      const commTime = new Date(
        comm.sent_at || comm.created_date
      ).getTime();
      const existing = contactMap.get(comm.contact_id);

      if (
        !existing ||
        commTime > new Date(existing.lastMessageTime).getTime()
      ) {
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
      (a, b) =>
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
    );
  }, [communications, contacts]);

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contactsWithPreview;
    const q = searchQuery.toLowerCase();
    return contactsWithPreview.filter(
      ({ contact }) =>
        `${contact.first_name} ${contact.last_name}`
          .toLowerCase()
          .includes(q) ||
        contact.phone?.toLowerCase().includes(q) ||
        contact.email?.toLowerCase().includes(q)
    );
  }, [contactsWithPreview, searchQuery]);

  // Selected contact's communications, sorted oldest→newest (chat style)
  const selectedComms = useMemo(() => {
    if (!selectedContactId) return [];
    return communications
      .filter((c) => c.contact_id === selectedContactId)
      .sort(
        (a, b) =>
          new Date(a.sent_at || a.created_date).getTime() -
          new Date(b.sent_at || b.created_date).getTime()
      );
  }, [communications, selectedContactId]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId),
    [contacts, selectedContactId]
  );

  // Auto-set reply channel based on last message type when selecting a contact
  useEffect(() => {
    if (selectedComms.length > 0) {
      const lastComm = selectedComms[selectedComms.length - 1];
      if (lastComm.type === "sms" || lastComm.type === "email") {
        setReplyChannel(lastComm.type);
      }
    }
    setReplyBody("");
    setReplySubject("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContactId]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [selectedComms.length, selectedContactId]);

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowMobileConversation(true);
  };

  const handleSend = async () => {
    if (!replyBody.trim() || !selectedContactId) return;

    const newComm = await db.Communication.create({
      contact_id: selectedContactId,
      company_id: currentCompanyId,
      type: replyChannel,
      direction: "outbound",
      channel: "manual",
      subject: replyChannel === "email" ? replySubject : undefined,
      body: replyBody,
      sent_at: new Date().toISOString(),
      status: "sent",
    });

    setCommunications((prev) => [...prev, newComm]);
    setReplyBody("");
    setReplySubject("");
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
        <div
          className={`w-full md:w-80 md:min-w-[320px] border-r border-border bg-background flex flex-col ${
            showMobileConversation ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Sidebar header */}
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

          {/* Contacts list */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No conversations found
              </div>
            ) : (
              filteredContacts.map(
                ({ contact, lastMessage, lastMessageTime }) => (
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
                    <p className="text-xs text-muted-foreground truncate mt-1 leading-relaxed">
                      {lastMessage}
                    </p>
                  </button>
                )
              )
            )}
          </div>
        </div>

        {/* ============ CONVERSATION PANEL ============ */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-background ${
            showMobileConversation ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedContactId && selectedContact ? (
            <>
              {/* Conversation header */}
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
                    {[selectedContact.phone, selectedContact.email]
                      .filter(Boolean)
                      .join(" \u2022 ")}
                  </p>
                </div>
              </div>

              {/* Messages timeline */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {selectedComms.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No messages yet
                  </div>
                ) : (
                  <div className="space-y-4 max-w-2xl mx-auto">
                    {selectedComms.map((comm) => {
                      const isOutbound =
                        comm.direction === "outbound" || !comm.direction;
                      const isInbound = comm.direction === "inbound";
                      const isSmsOrEmail =
                        comm.type === "sms" || comm.type === "email";
                      const label = formatMessageLabel(
                        comm.type,
                        comm.sent_at || comm.created_date
                      );
                      const stIcon = statusIcon(comm.status);

                      return (
                        <div
                          key={comm.id}
                          className={`flex flex-col cursor-pointer group ${
                            isInbound ? "items-start" : "items-end"
                          }`}
                          onClick={() => setDetailComm(comm)}
                        >
                          {/* Type + timestamp label */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[11px] text-muted-foreground">
                              {label}
                            </span>
                            {stIcon && (
                              <span className="flex items-center">
                                {stIcon}
                              </span>
                            )}
                          </div>

                          {/* Message content */}
                          {isSmsOrEmail ? (
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm transition-shadow duration-150 group-hover:shadow-md ${
                                isOutbound
                                  ? "bg-green-600 text-white rounded-br-sm"
                                  : "bg-muted text-foreground rounded-bl-sm"
                              }`}
                            >
                              {comm.subject && (
                                <p
                                  className={`font-medium text-xs mb-1 ${
                                    isOutbound
                                      ? "text-green-100"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {comm.subject}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap">
                                {comm.body || "No content"}
                              </p>
                            </div>
                          ) : (
                            /* Call / Note — neutral card style */
                            <div className="max-w-[85%] rounded-lg border border-border bg-card px-4 py-3 text-sm transition-shadow duration-150 group-hover:shadow-md">
                              <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                                {typeIcon(comm.type)}
                                <span className="text-xs font-medium capitalize">
                                  {comm.type} Log
                                </span>
                              </div>
                              {comm.subject && (
                                <p className="font-medium text-foreground text-sm mb-1">
                                  {comm.subject}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap text-muted-foreground">
                                {comm.body || "No content"}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* ============ REPLY COMPOSER ============ */}
              <div className="border-t border-border px-4 py-3 space-y-2.5 shrink-0">
                {/* Channel toggle + sending indicator */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setReplyChannel("sms")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                        replyChannel === "sms"
                          ? "bg-green-600 text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      SMS
                    </button>
                    <button
                      onClick={() => setReplyChannel("email")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                        replyChannel === "email"
                          ? "bg-green-600 text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate">
                    {replyChannel === "sms" ? (
                      <>
                        Sending as{" "}
                        <span className="font-medium text-foreground">
                          Text Message
                        </span>
                        {" \u2022 From: (385) 555-1234"}
                      </>
                    ) : (
                      <>
                        Sending as{" "}
                        <span className="font-medium text-foreground">
                          Email
                        </span>
                        {" \u2022 From: contractor@greenvalley.com"}
                      </>
                    )}
                  </p>
                </div>

                {/* Email subject line */}
                {replyChannel === "email" && (
                  <Input
                    placeholder="Enter subject..."
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="h-9 text-sm"
                  />
                )}

                {/* Message input + send button */}
                <div className="flex gap-2 items-end">
                  <Textarea
                    placeholder={
                      replyChannel === "sms"
                        ? "Type a message..."
                        : "Compose email..."
                    }
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={replyChannel === "sms" ? 1 : 3}
                    className="flex-1 resize-none text-sm min-h-[38px]"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        replyChannel === "sms"
                      ) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!replyBody.trim()}
                    size="icon"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 h-[38px] w-[38px] shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state — no contact selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Select a conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Choose a contact from the left to view their full
                  communication history
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ MESSAGE DETAIL MODAL ============ */}
      <Dialog
        open={!!detailComm}
        onOpenChange={(open) => !open && setDetailComm(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Message Details
            </DialogTitle>
          </DialogHeader>
          {detailComm && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Type
                  </p>
                  <div className="flex items-center gap-1.5 font-medium capitalize">
                    {typeIcon(detailComm.type)}
                    {detailComm.type}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Status
                  </p>
                  <div className="flex items-center gap-1.5 font-medium">
                    {statusIcon(detailComm.status)}
                    {statusLabel(detailComm.status) || "\u2014"}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    {detailComm.direction === "inbound" ? "From" : "To"}
                  </p>
                  <p className="font-medium">
                    {getContactName(detailComm.contact_id)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    {detailComm.direction === "inbound" ? "To" : "From"}
                  </p>
                  <p className="font-medium">You</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Timestamp
                  </p>
                  <p className="font-medium">
                    {
                      formatFullDateTime(
                        detailComm.sent_at || detailComm.created_date
                      ).date
                    }{" "}
                    at{" "}
                    {
                      formatFullDateTime(
                        detailComm.sent_at || detailComm.created_date
                      ).time
                    }
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                {detailComm.subject && (
                  <p className="font-semibold text-foreground mb-2">
                    {detailComm.subject}
                  </p>
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
