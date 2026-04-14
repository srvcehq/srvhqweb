"use client";

import React, { useState } from "react";
import { db } from "@/data/api";
import { Employee, Team } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Palette, Plus, Pencil, Trash2 } from "lucide-react";

interface TeamManagementTabProps {
  teams: Team[];
  employees: Employee[];
  companyId: string;
  onTeamsChange: (teams: Team[]) => void;
}

const DEFAULT_FORM = {
  name: "",
  color: "#22c55e",
};

export function TeamManagementTab({
  teams,
  employees,
  companyId,
  onTeamsChange,
}: TeamManagementTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [pendingDelete, setPendingDelete] = useState<Team | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowDialog(true);
  };

  const handleEdit = (team: Team) => {
    setEditing(team);
    setForm({
      name: team.name,
      color: team.color || "#22c55e",
    });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, company_id: companyId };

    if (editing) {
      const updated = await db.Team.update(editing.id, data);
      if (updated) {
        onTeamsChange(
          teams.map((t) => (t.id === editing.id ? updated : t))
        );
      }
    } else {
      const created = await db.Team.create(data);
      onTeamsChange([...teams, created]);
    }
    setShowDialog(false);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await db.Team.delete(pendingDelete.id);
    onTeamsChange(teams.filter((t) => t.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            onClick={handleAdd}
            className="bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Team
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-green-600" />
              Teams
              <Badge variant="outline" className="ml-2">
                {teams.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {teams.length === 0 ? (
              <div className="p-12 text-center">
                <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No teams yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {teams.map((team) => {
                  const memberCount = employees.filter(
                    (e) => e.team_id === team.id
                  ).length;
                  const lead = team.lead_id
                    ? employees.find((e) => e.id === team.lead_id)
                    : null;

                  return (
                    <div
                      key={team.id}
                      className="p-4 flex items-center justify-between hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{
                            backgroundColor: team.color || "#22c55e",
                          }}
                        >
                          {team.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {team.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {memberCount} member
                            {memberCount !== 1 ? "s" : ""}
                            {lead && (
                              <span className="ml-2">
                                Lead: {lead.first_name} {lead.last_name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-50"
                          onClick={() => handleEdit(team)}
                        >
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50"
                          onClick={() => setPendingDelete(team)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editing ? "Edit Team" : "Add Team"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Team Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="e.g., Alpha Crew"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Team Color</Label>
              <Input
                type="color"
                value={form.color}
                onChange={(e) =>
                  setForm({ ...form, color: e.target.value })
                }
                className="h-10 p-1 cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {editing ? "Update" : "Add"} Team
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{pendingDelete?.name}&quot;?
              Team members will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
