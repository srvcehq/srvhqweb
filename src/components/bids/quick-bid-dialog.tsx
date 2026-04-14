"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

interface QuickBidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickBidDialog({ open, onOpenChange }: QuickBidDialogProps) {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useCompany();

  const [contactId, setContactId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [depositType, setDepositType] = useState<"percent" | "dollar">("percent");
  const [depositValue, setDepositValue] = useState("");
  const [achEnabled, setAchEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts-quick-bid", currentCompanyId],
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
  });

  useEffect(() => {
    if (open) {
      setContactId("");
      setTitle("");
      setDescription("");
      setTotalPrice("");
      setDepositType("percent");
      setDepositValue("");
      setAchEnabled(true);
      setCardEnabled(true);
    }
  }, [open]);

  const computedDeposit = useMemo(() => {
    const total = parseFloat(totalPrice) || 0;
    const val = parseFloat(depositValue) || 0;
    if (depositType === "percent") return total * (val / 100);
    return val;
  }, [totalPrice, depositType, depositValue]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const total = parseFloat(totalPrice) || 0;
      return db.Bid.create({
        company_id: currentCompanyId,
        contact_id: contactId,
        title,
        description: description || undefined,
        status: "draft",
        bid_mode: "quick",
        bid_total: total,
        deposit_type: depositType,
        deposit_value: parseFloat(depositValue) || 0,
        deposit_amount: computedDeposit,
        payment_method_ach_enabled: achEnabled,
        payment_method_card_enabled: cardEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids"] });
      toast.success("Quick bid created as draft.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to create bid. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) {
      toast.error("Please select a client.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a bid title.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Quick Bid</DialogTitle>
          <DialogDescription>
            Create a simple bid with a total price. Best for small jobs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="qb-client">Client *</Label>
            {contactsLoading ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted">
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                <span className="text-sm text-muted-foreground">Loading clients...</span>
              </div>
            ) : (
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger id="qb-client">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="qb-title">Bid Title *</Label>
            <Input
              id="qb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Front Yard Cleanup"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qb-desc">Description</Label>
            <Textarea
              id="qb-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="qb-total">Total Price *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="qb-total"
                type="number"
                min="0"
                step="0.01"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deposit</Label>
            <div className="flex gap-2">
              <Select value={depositType} onValueChange={(v) => setDepositType(v as "percent" | "dollar")}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="dollar">$</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={depositValue}
                onChange={(e) => setDepositValue(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
            </div>
            {computedDeposit > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2">
                <span className="text-xs text-amber-700 dark:text-amber-400">Deposit</span>
                <span className="text-sm font-semibold text-amber-600">
                  ${computedDeposit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Payment Methods</Label>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="qb-ach"
                  checked={achEnabled}
                  onCheckedChange={(checked) => setAchEnabled(checked === true)}
                />
                <Label htmlFor="qb-ach" className="text-sm font-normal cursor-pointer">
                  ACH / Bank
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="qb-card"
                  checked={cardEnabled}
                  onCheckedChange={(checked) => setCardEnabled(checked === true)}
                />
                <Label htmlFor="qb-card" className="text-sm font-normal cursor-pointer">
                  Card
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Quick Bid"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
