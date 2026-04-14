"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2 } from "lucide-react";
import type { Contact } from "@/data/types";

interface WizardStepClientProps {
  contactId: string;
  title: string;
  description: string;
  contacts: Contact[];
  isLoading?: boolean;
  onContactChange: (id: string) => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}

export default function WizardStepClient({
  contactId,
  title,
  description,
  contacts,
  isLoading,
  onContactChange,
  onTitleChange,
  onDescriptionChange,
}: WizardStepClientProps) {
  const selectedContact = contacts.find((c) => c.id === contactId);

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          Client & Bid Info
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="wz-client">Client *</Label>
          {isLoading ? (
            <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted">
              <Loader2 className="w-4 h-4 animate-spin text-green-600" />
              <span className="text-sm text-muted-foreground">Loading clients...</span>
            </div>
          ) : (
            <Select value={contactId} onValueChange={onContactChange}>
              <SelectTrigger id="wz-client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span>{c.first_name} {c.last_name}</span>
                      {c.contact_type === "commercial" && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/40">
                          Commercial
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedContact && (
            <p className="text-xs text-muted-foreground">
              {[selectedContact.email, selectedContact.phone].filter(Boolean).join(" \u00B7 ") || "No contact info on file"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="wz-title">Bid Title *</Label>
          <Input
            id="wz-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. Backyard Patio Installation"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wz-desc">Description</Label>
          <Textarea
            id="wz-desc"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            placeholder="Optional project description..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
