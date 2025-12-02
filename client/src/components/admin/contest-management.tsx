import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Edit, Trash2, Plus } from "lucide-react";
import RichTextEditor from "@/components/admin/rich-text-editor";
import { useToast } from "@/hooks/use-toast";

interface Contest {
  id: number;
  title: string;
  slug: string;
  content: string;
  imageUrl: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  title: string;
  slug: string;
  content: string;
  imageUrl: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  featured: boolean;
}

export default function AdminContests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [filteredContests, setFilteredContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    slug: "",
    content: "",
    imageUrl: "",
    validFrom: "",
    validUntil: "",
    isActive: true,
    featured: false,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    const filtered = contests.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredContests(filtered);
  }, [searchQuery, contests]);

  const fetchContests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/contests", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setContests(data);
      } else {
        toast({ title: "Error", description: "Failed to fetch contests", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching contests:", error);
      toast({ title: "Error", description: "Failed to fetch contests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      const formDataToSend = new FormData();
      formDataToSend.append("file", file);
      formDataToSend.append("type", "image");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          imageUrl: data.url,
        }));
        toast({ title: "Success", description: "Image uploaded successfully" });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      imageUrl: "",
      validFrom: "",
      validUntil: "",
      isActive: true,
      featured: false,
    });
    setEditingId(null);
    setImagePreview(null);
  };

  const handleSaveContest = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    if (!formData.imageUrl.trim()) {
      toast({ title: "Error", description: "Image URL is required", variant: "destructive" });
      return;
    }
    if (!formData.validFrom || !formData.validUntil) {
      toast({ title: "Error", description: "Valid from and until dates are required", variant: "destructive" });
      return;
    }
    if (!formData.content.trim()) {
      toast({ title: "Error", description: "Content is required", variant: "destructive" });
      return;
    }

    console.log('💾 Saving contest, formData.content length:', formData.content.length, 'preview:', formData.content.substring(0, 50));

    setLoading(true);
    try {
      const url = editingId ? `/api/admin/contests/${editingId}` : "/api/admin/contests";
      const method = editingId ? "PUT" : "POST";
      const token = localStorage.getItem("token");

      // Ensure validFrom/validUntil are full ISO datetimes to avoid timezone/day-boundary issues
      const payload = {
        ...formData,
        validFrom: formData.validFrom ? new Date(formData.validFrom + 'T00:00:00').toISOString() : null,
        validUntil: formData.validUntil ? new Date(formData.validUntil + 'T23:59:59').toISOString() : null,
      };

      console.log('📤 Sending payload to', url, 'with content length:', payload.content.length);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({ title: "Success", description: editingId ? "Contest updated" : "Contest created" });
        resetForm();
        setIsFormOpen(false);
        fetchContests();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.details || "Failed to save contest", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error saving contest:", error);
      toast({ title: "Error", description: "Failed to save contest", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditContest = async (contestIdOrObj: number | Contest) => {
    try {
      let contest: Contest | null = null as any;
      if (typeof contestIdOrObj === 'number') {
        const token = localStorage.getItem('token');
        const resp = await fetch(`/api/admin/contests/${contestIdOrObj}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!resp.ok) {
          console.error('Failed to fetch contest details for edit');
          return;
        }
        contest = await resp.json();
      } else {
        contest = contestIdOrObj as Contest;
      }

      setFormData({
        title: contest.title,
        slug: contest.slug,
        content: contest.content || '',
        imageUrl: contest.imageUrl,
        validFrom: contest.validFrom.split("T")[0],
        validUntil: contest.validUntil.split("T")[0],
        isActive: contest.isActive,
        featured: contest.featured,
      });
      setImagePreview(contest.imageUrl);
      setEditingId(contest.id);
      setIsFormOpen(true);
    } catch (error) {
      console.error('Error while preparing contest edit:', error);
      toast({ title: 'Error', description: 'Failed to load contest for editing', variant: 'destructive' });
    }
  };

  const handleDeleteContest = async (id: number) => {
    if (!confirm("Are you sure you want to delete this contest?")) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/contests/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        toast({ title: "Success", description: "Contest deleted" });
        fetchContests();
      } else {
        toast({ title: "Error", description: "Failed to delete contest", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting contest:", error);
      toast({ title: "Error", description: "Failed to delete contest", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Contest Management</h1>
          <p className="text-gray-600 mt-2">Manage your contests and campaigns</p>
        </div>

        {/* Search and Add Button */}
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 w-full">
                <Input
                  placeholder="Search contests by title or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setIsFormOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-10 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Contest
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl bg-white shadow-2xl border-0 my-8">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Upload className="h-5 w-5 text-purple-600" />
                  </div>
                  {editingId ? "✏️ Edit Contest" : "➕ Add Contest"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Title *</label>
                    <Input
                      name="title"
                      placeholder="Enter contest title"
                      value={formData.title}
                      onChange={handleTitleChange}
                      className="border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Slug (Auto-generated)</label>
                    <Input
                      name="slug"
                      placeholder="contest-slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      className="border-gray-300 bg-gray-50"
                      disabled
                    />
                  </div>

                  {/* Short Description removed per request */}

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Image URL *</label>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          name="imageUrl"
                          placeholder="https://example.com/image.jpg"
                          value={formData.imageUrl}
                          onChange={handleInputChange}
                          className="border-gray-300"
                        />
                      </div>
                      <div>
                        <input
                          id="image-upload-input"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                        <label htmlFor="image-upload-input">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading}
                            className="gap-2 cursor-pointer"
                            onClick={() => document.getElementById('image-upload-input')?.click()}
                          >
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Upload'}
                          </Button>
                        </label>
                      </div>
                    </div>
                    {imagePreview && (
                      <div className="mt-3">
                        <img src={imagePreview} alt="Preview" className="w-full h-24 object-cover rounded-lg border-2 border-purple-300" />
                      </div>
                    )}
                  </div>

                  {/* Banner image field removed per request */}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Valid From *</label>
                      <Input
                        type="date"
                        name="validFrom"
                        value={formData.validFrom}
                        onChange={handleInputChange}
                        className="border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Valid Until *</label>
                      <Input
                        type="date"
                        name="validUntil"
                        value={formData.validUntil}
                        onChange={handleInputChange}
                        className="border-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Detailed Content *</label>
                    <RichTextEditor
                      content={formData.content}
                      onChange={(content) => {
                        console.log('🔔 RichTextEditor onChange fired, new content length:', content.length, 'preview:', content.substring(0, 50));
                        setFormData(prev => ({ ...prev, content }));
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <label className="text-sm font-semibold text-gray-700 cursor-pointer">Active</label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={formData.featured}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <label className="text-sm font-semibold text-gray-700 cursor-pointer">Featured</label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={handleSaveContest}
                      disabled={loading}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    >
                      {editingId ? '💾 Update' : '➕ Create'}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsFormOpen(false);
                        resetForm();
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      ❌ Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contests Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-white border-b">
            <CardTitle>Contests List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : filteredContests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No contests found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Title</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Valid From</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Valid Until</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">Featured</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContests.map((contest) => (
                      <tr key={contest.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{contest.title}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(contest.validFrom).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(contest.validUntil).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={contest.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {contest.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={contest.featured ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}>
                            {contest.featured ? "Yes" : "No"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-center">
                            <Button
                              onClick={() => handleEditContest(contest)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600"
                            >
                              ✏️
                            </Button>
                            <Button
                              onClick={() => handleDeleteContest(contest.id)}
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                            >
                              🗑️
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
