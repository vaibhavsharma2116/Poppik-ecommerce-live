
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, GripVertical, Save } from "lucide-react";

interface Announcement {
  id: number;
  text: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newAnnouncementText, setNewAnnouncementText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['/api/admin/announcements'],
  });

  const createMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          isActive: true,
          sortOrder: announcements.length,
        }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to create announcement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setNewAnnouncementText("");
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Announcement> }) => {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update announcement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setEditingId(null);
      toast({
        title: "Success",
        description: "Announcement updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete announcement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newAnnouncementText.trim()) {
      toast({
        title: "Error",
        description: "Please enter announcement text",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newAnnouncementText);
  };

  const handleToggleActive = (announcement: Announcement) => {
    updateMutation.mutate({
      id: announcement.id,
      data: { ...announcement, isActive: !announcement.isActive },
    });
  };

  const handleSaveEdit = (id: number) => {
    const announcement = announcements.find(a => a.id === id);
    if (!announcement || !editText.trim()) {
      toast({
        title: "Error",
        description: "Please enter announcement text",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({
      id,
      data: { 
        text: editText,
        isActive: announcement.isActive,
        sortOrder: announcement.sortOrder
      },
    });
  };

  const startEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setEditText(announcement.text);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Announcements</h1>
        <p className="text-gray-600 mt-2">
          Manage announcements that appear at the top of your website
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create New Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter announcement text..."
              value={newAnnouncementText}
              onChange={(e) => setNewAnnouncementText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Add Announcement
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No announcements yet. Create your first announcement above.
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                  
                  <div className="flex-1">
                    {editingId === announcement.id ? (
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      <p className="text-sm font-medium">{announcement.text}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={announcement.isActive}
                        onCheckedChange={() => handleToggleActive(announcement)}
                      />
                      <Label className="text-sm">
                        {announcement.isActive ? "Active" : "Inactive"}
                      </Label>
                    </div>

                    {editingId === announcement.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(announcement.id)}
                          disabled={updateMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                          disabled={updateMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(announcement)}
                      >
                        Edit
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(announcement.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
