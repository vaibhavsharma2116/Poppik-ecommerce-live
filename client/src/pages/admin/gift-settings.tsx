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
  isActive: boolean;
  sortOrder: number;
}

export default function GiftSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<GiftMilestone | null>(null);
  const [formData, setFormData] = useState({
    minAmount: "",
    maxAmount: "",
    giftCount: 1,
    giftDescription: "",
    isActive: true,
    sortOrder: 0,
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gift-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gift-milestones"] });
      toast({
        title: editingMilestone ? "Milestone Updated" : "Milestone Created",
        description: "Gift milestone has been saved successfully",
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
    setFormData({
      minAmount: "",
      maxAmount: "",
      giftCount: 1,
      giftDescription: "",
      isActive: true,
      sortOrder: 0,
    });
    setEditingMilestone(null);
  };

  const handleEdit = (milestone: GiftMilestone) => {
    setEditingMilestone(milestone);
    setFormData({
      minAmount: milestone.minAmount,
      maxAmount: milestone.maxAmount || "",
      giftCount: milestone.giftCount,
      giftDescription: milestone.giftDescription || "",
      isActive: milestone.isActive,
      sortOrder: milestone.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMilestone ? "Edit" : "Create"} Gift Milestone
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="minAmount">Minimum Amount (₹) *</Label>
                <Input
                  id="minAmount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.minAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minAmount: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="maxAmount">Maximum Amount (₹)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  step="0.01"
                  placeholder="Leave empty for unlimited"
                  value={formData.maxAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAmount: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="giftCount">Number of Gifts *</Label>
                <Input
                  id="giftCount"
                  type="number"
                  min="1"
                  required
                  value={formData.giftCount}
                  onChange={(e) =>
                    setFormData({ ...formData, giftCount: parseInt(e.target.value) })
                  }
                />
              </div>

              <div>
                <Label htmlFor="giftDescription">Description</Label>
                <Textarea
                  id="giftDescription"
                  placeholder="E.g., 1 FREE Gift on orders ₹1000+"
                  value={formData.giftDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, giftDescription: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

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
                    <strong>Range:</strong> ₹{parseFloat(milestone.minAmount).toFixed(2)}
                    {milestone.maxAmount && ` - ₹${parseFloat(milestone.maxAmount).toFixed(2)}`}
                    {!milestone.maxAmount && " and above"}
                  </p>
                  {milestone.giftDescription && (
                    <p className="text-sm text-gray-600">{milestone.giftDescription}</p>
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