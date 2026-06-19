"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Plus, Search, Trash2, Edit, Link as LinkIcon, Unlink } from "lucide-react";

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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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

export default function SkillsPage() {
  const [skills, setSkills] = useState<any[]>([]);
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
  });

  // Linking Careers State
  const [allCareers, setAllCareers] = useState<any[]>([]);
  const [linkedCareers, setLinkedCareers] = useState<any[]>([]);
  const [careerSearch, setCareerSearch] = useState("");

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
      });
      if (search) queryParams.append("search", search);
      if (categoryFilter && categoryFilter !== "all") queryParams.append("category", categoryFilter);

      const data = await apiRequest(`/admin/skills?${queryParams.toString()}`);
      setSkills(data.items);
      setTotal(data.total);
    } catch (e: any) {
      alert("Failed to load skills: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCareers = async () => {
    try {
      // Fetch up to 100 to have them available for mapping
      const data = await apiRequest(`/admin/careers?page=1&size=100`);
      setAllCareers(data.items || []);
    } catch (e: any) {
      console.error("Failed to fetch careers for mapping", e);
    }
  };

  useEffect(() => {
    fetchSkills();
    fetchAllCareers();
  }, [page, search, categoryFilter]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this skill?")) {
      try {
        await apiRequest(`/admin/skills/${id}`, { method: "DELETE" });
        fetchSkills();
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
    });
    setLinkedCareers([]);
    setIsModalOpen(true);
  };

  const openEditModal = async (id: string) => {
    try {
      const data = await apiRequest(`/admin/skills/${id}`);
      setFormData({
        id: data.id,
        name: data.name || "",
        category: data.category || "",
        description: data.description || "",
      });
      setLinkedCareers(data.linked_careers || []);
      setModalMode("edit");
      setIsModalOpen(true);
    } catch (e: any) {
      alert("Failed to fetch skill details: " + e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === "add") {
        await apiRequest(`/admin/skills`, {
          method: "POST",
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest(`/admin/skills/${formData.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: formData.name,
            category: formData.category,
            description: formData.description
          }),
        });
      }
      setIsModalOpen(false);
      fetchSkills();
    } catch (e: any) {
      alert("Save failed: " + e.message);
    }
  };

  const linkCareer = async (careerId: string) => {
    try {
      await apiRequest(`/admin/skills/${formData.id}/careers/${careerId}`, { method: "POST" });
      const c = allCareers.find(x => x.id === careerId);
      if (c) {
        setLinkedCareers([...linkedCareers, { career_id: c.id, career_name: c.name }]);
      }
      fetchSkills();
    } catch (e: any) {
      alert("Failed to link career: " + e.message);
    }
  };

  const unlinkCareer = async (careerId: string) => {
    try {
      await apiRequest(`/admin/skills/${formData.id}/careers/${careerId}`, { method: "DELETE" });
      setLinkedCareers(linkedCareers.filter(c => c.career_id !== careerId));
      fetchSkills();
    } catch (e: any) {
      alert("Failed to unlink career: " + e.message);
    }
  };

  const availableCareersToLink = allCareers.filter(
    c => !linkedCareers.some(lc => lc.career_id === c.id) && c.name.toLowerCase().includes(careerSearch.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Skills Management</h1>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" /> Add Skill
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card text-card-foreground p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
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
              <SelectItem value="Hard Skill">Hard Skill</SelectItem>
              <SelectItem value="Soft Skill">Soft Skill</SelectItem>
              <SelectItem value="Tool">Tool</SelectItem>
              <SelectItem value="Language">Language</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Linked Careers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">Loading skills...</TableCell>
              </TableRow>
            ) : skills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">No skills found.</TableCell>
              </TableRow>
            ) : (
              skills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell className="font-medium">{skill.name}</TableCell>
                  <TableCell>
                    {skill.category ? (
                      <Badge variant="secondary">{skill.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {skill.linked_careers && skill.linked_careers.length > 0 ? (
                        skill.linked_careers.slice(0, 3).map((lc: any) => (
                          <Badge variant="outline" key={lc.career_id}>{lc.career_name}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                      {skill.linked_careers && skill.linked_careers.length > 3 && (
                        <Badge variant="outline">+{skill.linked_careers.length - 3} more</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:bg-muted ml-auto">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Actions</div>
                        <DropdownMenuItem onClick={() => openEditModal(skill.id)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(skill.id)} className="text-destructive">
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
          Showing {skills.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total} results
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalMode === "add" ? "Add New Skill" : "Edit Skill"}</DialogTitle>
            <DialogDescription>
              {modalMode === "add" 
                ? "Provide basic information for the new skill."
                : "Manage skill details and link it to careers."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Skill Name <span className="text-destructive">*</span></label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Python"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  placeholder="e.g. Hard Skill, Soft Skill"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="A brief explanation of the skill..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Skill</Button>
            </DialogFooter>
          </form>

          {/* Linked Careers Section - Only visible in edit mode */}
          {modalMode === "edit" && (
            <div className="mt-8 pt-8 border-t space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Linked Careers</h3>
                  <p className="text-sm text-muted-foreground">Map this skill to specific career paths.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Currently Linked</h4>
                  {linkedCareers.length === 0 ? (
                    <div className="p-4 border rounded-md border-dashed text-center text-sm text-muted-foreground">
                      No careers linked yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {linkedCareers.map(lc => (
                        <div key={lc.career_id} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                          <span className="text-sm font-medium truncate pr-2">{lc.career_name}</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => unlinkCareer(lc.career_id)}>
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Available Careers</h4>
                  <Input 
                    placeholder="Search careers..." 
                    className="h-9"
                    value={careerSearch}
                    onChange={(e) => setCareerSearch(e.target.value)}
                  />
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {availableCareersToLink.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No more careers found.
                      </div>
                    ) : (
                      availableCareersToLink.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                          <span className="text-sm truncate pr-2">{c.name}</span>
                          <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => linkCareer(c.id)}>
                            <LinkIcon className="h-3 w-3 mr-1" /> Link
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
