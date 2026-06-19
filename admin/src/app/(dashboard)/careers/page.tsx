"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Briefcase, MoreHorizontal, Plus, Search, Trash2, Edit, ChevronRight, ChevronDown } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function CareersPage() {
  const [careers, setCareers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const pageSize = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<any>({
    name: "",
    category: "",
    description: "",
    overview: "",
    eligibility: "",
    education_required: "",
    salary_range: "",
    future_demand_score: 0,
    typical_skills: [],
    responsibilities: [],
    industries: [],
    certifications: [],
    learning_roadmap: [],
  });

  const fetchCareers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
      });
      if (search) queryParams.append("search", search);
      if (categoryFilter && categoryFilter !== "all") queryParams.append("category", categoryFilter);

      const data = await apiRequest(`/admin/careers?${queryParams.toString()}`);
      setCareers(data.items);
      setTotal(data.total);
    } catch (e: any) {
      alert("Failed to load careers: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCareers();
  }, [page, search, categoryFilter]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this career?")) {
      try {
        await apiRequest(`/admin/careers/${id}`, { method: "DELETE" });
        fetchCareers();
      } catch (e: any) {
        alert("Failed to delete: " + e.message);
      }
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      name: "",
      category: "",
      description: "",
      overview: "",
      eligibility: "",
      education_required: "",
      salary_range: "",
      future_demand_score: 0,
      typical_skills: [],
      responsibilities: [],
      industries: [],
      certifications: [],
      learning_roadmap: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (id: string) => {
    try {
      const data = await apiRequest(`/admin/careers/${id}`);
      setFormData({
        id: data.id,
        name: data.name || "",
        category: data.category || "",
        description: data.description || "",
        overview: data.overview || "",
        eligibility: data.eligibility || "",
        education_required: data.education_required || "",
        salary_range: data.salary_range || "",
        future_demand_score: data.future_demand_score || 0,
        typical_skills: data.typical_skills || [],
        responsibilities: data.responsibilities || [],
        industries: data.industries || [],
        certifications: data.certifications || [],
        learning_roadmap: data.learning_roadmap || [],
      });
      setModalMode("edit");
      setIsModalOpen(true);
    } catch (e: any) {
      alert("Failed to fetch career details: " + e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === "add") {
        await apiRequest(`/admin/careers`, {
          method: "POST",
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest(`/admin/careers/${formData.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      fetchCareers();
    } catch (e: any) {
      alert("Save failed: " + e.message);
    }
  };

  // Helper for comma separated lists to arrays
  const handleArrayChange = (field: string, value: string) => {
    const arr = value.split(",").map(s => s.trim()).filter(Boolean);
    setFormData({ ...formData, [field]: arr });
  };

  // Helper for roadmap JSON
  const handleRoadmapChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      setFormData({ ...formData, learning_roadmap: parsed });
    } catch (e) {
      // Just store as string until valid JSON, or handle differently.
      // For a premium UI, this should be dynamic inputs, but raw text works for now.
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Career Management</h1>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" /> Add Career
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card text-card-foreground p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search careers..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val || "all"); setPage(1); }}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Business">Business</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Arts">Arts & Design</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Career Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Demand Score</TableHead>
              <TableHead>Salary Range</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Loading careers...</TableCell>
              </TableRow>
            ) : careers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">No careers found.</TableCell>
              </TableRow>
            ) : (
              careers.map((career) => (
                <TableRow key={career.id}>
                  <TableCell className="font-medium">{career.name}</TableCell>
                  <TableCell>
                    {career.category ? (
                      <Badge variant="secondary">{career.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {career.future_demand_score ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${career.future_demand_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{career.future_demand_score}/100</span>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-sm">{career.salary_range || "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:bg-muted">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Actions</div>
                        <DropdownMenuItem onClick={() => openEditModal(career.id)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(career.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {careers.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total} results
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * pageSize >= total || loading}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalMode === "add" ? "Add New Career" : "Edit Career"}</DialogTitle>
            <DialogDescription>
              Provide detailed information about the career path.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Career Name <span className="text-destructive">*</span></label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  placeholder="e.g. Technology"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Salary Range</label>
                <Input 
                  value={formData.salary_range} 
                  onChange={e => setFormData({...formData, salary_range: e.target.value})} 
                  placeholder="e.g. $80,000 - $150,000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Future Demand Score (1-100)</label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  value={formData.future_demand_score} 
                  onChange={e => setFormData({...formData, future_demand_score: parseInt(e.target.value) || 0})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Short Description</label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="A brief 1-2 sentence summary..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Detailed Overview</label>
              <Textarea 
                className="min-h-[100px]"
                value={formData.overview} 
                onChange={e => setFormData({...formData, overview: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Eligibility</label>
                <Textarea 
                  value={formData.eligibility} 
                  onChange={e => setFormData({...formData, eligibility: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Education Required</label>
                <Textarea 
                  value={formData.education_required} 
                  onChange={e => setFormData({...formData, education_required: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-2">
                <label className="text-sm font-medium">Typical Skills (Comma separated)</label>
                <Input 
                  value={formData.typical_skills.join(", ")} 
                  onChange={e => handleArrayChange("typical_skills", e.target.value)} 
                  placeholder="Python, React, SQL..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Industries (Comma separated)</label>
                <Input 
                  value={formData.industries.join(", ")} 
                  onChange={e => handleArrayChange("industries", e.target.value)} 
                  placeholder="Tech, Finance, Healthcare..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Certifications (Comma separated)</label>
                <Input 
                  value={formData.certifications.join(", ")} 
                  onChange={e => handleArrayChange("certifications", e.target.value)} 
                  placeholder="AWS Cloud Practitioner, PMP..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Career Roadmap (Raw JSON)</label>
              <Textarea 
                className="font-mono text-xs min-h-[150px]"
                defaultValue={JSON.stringify(formData.learning_roadmap, null, 2)} 
                onChange={e => handleRoadmapChange(e.target.value)} 
                placeholder='[{"step": "Learn Python", "duration": "3 months"}]'
              />
              <p className="text-xs text-muted-foreground">Provide a valid JSON array of roadmap steps.</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Career</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
