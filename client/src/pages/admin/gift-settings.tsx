import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GiftMilestone {
  id: number;
  minAmount: string;
  maxAmount: string | null;
  giftCount: number;
  giftDescription: string | null;
  discountType?: string;
  discountValue?: string | null;
  cashbackPercentage?: string | null;
  isActive: boolean;
  sortOrder: number;
}

type GiftMilestoneFormRow = {
  minAmount: string;
  giftCount: number;
  discountType: string;
  discountValue: string;
  cashbackPercentage: string;
  isActive: boolean;
  sortOrder: number;
};

export default function GiftSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<GiftMilestone | null>(null);

  const createEmptyRow = (): GiftMilestoneFormRow => ({
    minAmount: "",
    giftCount: 1,
    discountType: "none",
    discountValue: "",
    cashbackPercentage: "",
    isActive: true,
    sortOrder: 0,
  });

  const [milestoneRows, setMilestoneRows] = useState<GiftMilestoneFormRow[]>([
    createEmptyRow(),
  ]);

  // Fetch gift milestones
  const { data: milestonesData, isLoading } = useQuery({
    queryKey: ["/api/admin/gift-milestones"],
    queryFn: async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/gift-milestones', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch gift milestones');
      }

      return response.json();
    }
  });

  const milestones = Array.isArray(milestonesData) ? milestonesData : [];

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = data.id
        ? `/api/admin/gift-milestones/${data.id}`
        : '/api/admin/gift-milestones';

      const method = data.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to save milestone');
      }

      return response.json();
    },
    onSuccess: (_result: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gift-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gift-milestones"] });

      const createdCount = Array.isArray(_result) ? _result.length : null;
      const isBatchCreate = !!variables?.milestones && !variables?.id;

      toast({
        title: editingMilestone
          ? "Milestone Updated"
          : isBatchCreate
            ? "Milestones Created"
            : "Milestone Created",
        description: editingMilestone
          ? "Gift milestone has been saved successfully"
          : isBatchCreate && createdCount !== null
            ? `${createdCount} gift milestone(s) have been created successfully`
            : "Gift milestone has been saved successfully",
      });
      setDialogOpen(false);
      resetForm();
    },

    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/admin/gift-milestones/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete milestone');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gift-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gift-milestones"] });
      toast({
        title: "Milestone Deleted",
        description: "Gift milestone has been deleted successfully",
      });
    },
  });

  const resetForm = () => {
    setMilestoneRows([createEmptyRow()]);
    setEditingMilestone(null);
  };

  const handleEdit = (milestone: GiftMilestone) => {
    setEditingMilestone(milestone);
    setMilestoneRows([
      {
        minAmount: milestone.minAmount,
        giftCount: milestone.giftCount,
        discountType: milestone.discountType || "none",
        discountValue: milestone.discountValue || "",
        cashbackPercentage: milestone.cashbackPercentage || "",
        isActive: milestone.isActive,
        sortOrder: milestone.sortOrder,
      },
    ]);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingMilestone) {
      saveMutation.mutate({
        id: editingMilestone.id,
        ...milestoneRows[0],
      });
      return;
    }

    saveMutation.mutate({
      milestones: milestoneRows,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gift Milestone Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure cart value milestones for free gifts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingMilestone ? "Edit" : "Create"} Gift Milestone
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto flex-1 px-1">

              {!editingMilestone && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMilestoneRows((prev) => [...prev, createEmptyRow()])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Milestone
                </Button>
              )}

              {milestoneRows.map((row, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Milestone {index + 1}</div>
                    {!editingMilestone && milestoneRows.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setMilestoneRows((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`minAmount-${index}`}>Minimum Amount (₹) *</Label>
                    <Input
                      id={`minAmount-${index}`}
                      type="number"
                      step="0.01"
                      required
                      value={row.minAmount}
                      onChange={(e) =>
                        setMilestoneRows((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, minAmount: e.target.value } : r))
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor={`giftCount-${index}`}>Number of Gifts *</Label>
                    <Input
                      id={`giftCount-${index}`}
                      type="number"
                      min="1"
                      required
                      value={row.giftCount}
                      onChange={(e) =>
                        setMilestoneRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, giftCount: parseInt(e.target.value) } : r
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor={`discountType-${index}`}>Discount Type</Label>
                    <select
                      id={`discountType-${index}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={row.discountType}
                      onChange={(e) =>
                        setMilestoneRows((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  discountType: e.target.value,
                                  discountValue: e.target.value === "none" ? "" : r.discountValue,
                                }
                              : r
                          )
                        )
                      }
                    >
                      <option value="none">None</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>

                  {row.discountType !== "none" && (
                    <div>
                      <Label htmlFor={`discountValue-${index}`}>
                        Discount Value {row.discountType === "percentage" ? "(%)" : "(₹)"}
                      </Label>
                      <Input
                        id={`discountValue-${index}`}
                        type="number"
                        step="0.01"
                        placeholder="E.g., 10 or 100"
                        value={row.discountValue}
                        onChange={(e) =>
                          setMilestoneRows((prev) =>
                            prev.map((r, i) =>
                              i === index ? { ...r, discountValue: e.target.value } : r
                            )
                          )
                        }
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor={`cashbackPercentage-${index}`}>Cashback Percentage (%)</Label>
                    <Input
                      id={`cashbackPercentage-${index}`}
                      type="number"
                      step="0.01"
                      placeholder="E.g., 5.5"
                      value={row.cashbackPercentage}
                      onChange={(e) =>
                        setMilestoneRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, cashbackPercentage: e.target.value } : r
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor={`sortOrder-${index}`}>Sort Order</Label>
                    <Input
                      id={`sortOrder-${index}`}
                      type="number"
                      value={row.sortOrder}
                      onChange={(e) =>
                        setMilestoneRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, sortOrder: parseInt(e.target.value) } : r
                          )
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`isActive-${index}`}
                      checked={row.isActive}
                      onCheckedChange={(checked) =>
                        setMilestoneRows((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, isActive: checked } : r))
                        )
                      }
                    />
                    <Label htmlFor={`isActive-${index}`}>Active</Label>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Milestone"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-4">
          {milestones.map((milestone: GiftMilestone) => (
            <Card key={milestone.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-pink-500" />
                    <span>
                      {milestone.giftCount} Gift{milestone.giftCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(milestone)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(milestone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Range:</strong> ₹{parseFloat(milestone.minAmount).toFixed(2)} and above
                  </p>
                  {milestone.discountType && milestone.discountType !== "none" && (
                    <p className="text-sm text-blue-600">
                      <strong>Discount:</strong>{" "}
                      {milestone.discountType === "percentage"
                        ? `${milestone.discountValue}%`
                        : `₹${milestone.discountValue}`}
                    </p>
                  )}
                  {milestone.cashbackPercentage && (
                    <p className="text-sm text-green-600">
                      <strong>Cashback:</strong> {milestone.cashbackPercentage}%
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        milestone.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {milestone.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-gray-500">
                      Sort Order: {milestone.sortOrder}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}