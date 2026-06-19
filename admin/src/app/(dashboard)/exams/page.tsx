"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Plus, Search, Trash2, Edit, ExternalLink } from "lucide-react";

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

const CATEGORY_STYLES: Record<string, string> = {
  "Civil Services": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/25",
  "Banking": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/25",
  "Engineering": "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/25",
  "Defence": "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/25",
  "Railways": "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/25",
  "Teaching": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/25",
  "SSC": "bg-teal-500/10 text-teal-500 border-teal-500/20 hover:bg-teal-500/25",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  "Easy": "bg-green-500/10 text-green-500 border-green-500/20",
  "Medium": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "High": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Very High": "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const pageSize = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>({
    exam_name: "",
    category: "",
    eligibility: "",
    age_limit: "",
    attempts_allowed: "",
    selectionProcessStr: "",
    exam_pattern: "",
    syllabus: "",
    salary: "",
    career_opportunities: "",
    official_website: "",
    difficulty_level: "Medium",
  });

  const fetchExams = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
      });
      if (search) queryParams.append("search", search);
      if (categoryFilter && categoryFilter !== "all") queryParams.append("category", categoryFilter);

      const data = await apiRequest(`/admin/exams?${queryParams.toString()}`);
      setExams(data.items);
      setTotal(data.total);
    } catch (e: any) {
      alert("Failed to load exams: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [page, search, categoryFilter]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      try {
        await apiRequest(`/admin/exams/${id}`, { method: "DELETE" });
        fetchExams();
      } catch (e: any) {
        alert("Failed to delete exam: " + e.message);
      }
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      exam_name: "",
      category: "",
      eligibility: "",
      age_limit: "",
      attempts_allowed: "",
      selectionProcessStr: "",
      exam_pattern: "",
      syllabus: "",
      salary: "",
      career_opportunities: "",
      official_website: "",
      difficulty_level: "Medium",
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (id: string) => {
    try {
      const data = await apiRequest(`/admin/exams/${id}`);
      setFormData({
        id: data.id,
        exam_name: data.exam_name || "",
        category: data.category || "",
        eligibility: data.eligibility || "",
        age_limit: data.age_limit || "",
        attempts_allowed: data.attempts_allowed || "",
        selectionProcessStr: data.selection_process ? data.selection_process.join(", ") : "",
        exam_pattern: data.exam_pattern || "",
        syllabus: data.syllabus || "",
        salary: data.salary || "",
        career_opportunities: data.career_opportunities || "",
        official_website: data.official_website || "",
        difficulty_level: data.difficulty_level || "Medium",
      });
      setModalMode("edit");
      setIsModalOpen(true);
    } catch (e: any) {
      alert("Failed to fetch exam details: " + e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        exam_name: formData.exam_name,
        category: formData.category,
        eligibility: formData.eligibility,
        age_limit: formData.age_limit,
        attempts_allowed: formData.attempts_allowed || null,
        selection_process: formData.selectionProcessStr
          ? formData.selectionProcessStr.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
        exam_pattern: formData.exam_pattern || null,
        syllabus: formData.syllabus,
        salary: formData.salary || null,
        career_opportunities: formData.career_opportunities || null,
        official_website: formData.official_website || null,
        difficulty_level: formData.difficulty_level || "Medium",
      };

      if (modalMode === "add") {
        await apiRequest(`/admin/exams`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/admin/exams/${formData.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchExams();
    } catch (e: any) {
      alert("Save failed: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const customStyle = CATEGORY_STYLES[category] || "bg-muted text-muted-foreground border-muted-foreground/20";
    return <Badge className={`border font-semibold transition-all ${customStyle}`}>{category}</Badge>;
  };

  const getDifficultyBadge = (level: string) => {
    const customStyle = DIFFICULTY_STYLES[level] || "bg-muted text-muted-foreground border-muted-foreground/20";
    return <Badge className={`border font-semibold ${customStyle}`}>{level}</Badge>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Government Exams</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage competitive exam details, syllabus, patterns, and eligibility criteria.</p>
        </div>
        <Button onClick={openAddModal} className="shadow-md hover:scale-102 transition-transform">
          <Plus className="mr-2 h-4 w-4" /> Add Exam
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card text-card-foreground p-4 rounded-lg border shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exams by name..."
            className="pl-9 bg-background focus-visible:ring-1"
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
              <SelectItem value="Civil Services">Civil Services</SelectItem>
              <SelectItem value="Banking">Banking</SelectItem>
              <SelectItem value="SSC">SSC</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Defence">Defence</SelectItem>
              <SelectItem value="Railways">Railways</SelectItem>
              <SelectItem value="Teaching">Teaching</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Exam Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Age Limit</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Website</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">Loading exams...</TableCell>
              </TableRow>
            ) : exams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">No government exams found.</TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => (
                <TableRow key={exam.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{exam.exam_name}</TableCell>
                  <TableCell>{getCategoryBadge(exam.category)}</TableCell>
                  <TableCell className="text-sm">{exam.age_limit}</TableCell>
                  <TableCell className="text-sm">{exam.salary || exam.salary_range || "-"}</TableCell>
                  <TableCell>{getDifficultyBadge(exam.difficulty_level)}</TableCell>
                  <TableCell>
                    {exam.official_website ? (
                      <a 
                        href={exam.official_website} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:bg-muted ml-auto transition-colors cursor-pointer border border-transparent hover:border-border">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options</div>
                        <DropdownMenuItem onClick={() => openEditModal(exam.id)} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4 text-blue-500" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(exam.id)} className="text-destructive cursor-pointer focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Exam
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
          Showing {exams.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total} results
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{modalMode === "add" ? "Create Government Exam" : "Edit Government Exam"}</DialogTitle>
            <DialogDescription>
              Modify competitive exam profiles, key metadata, syllabus, and official resources.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column (Metadata) */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Exam Name <span className="text-destructive">*</span></label>
                  <Input 
                    required 
                    value={formData.exam_name} 
                    onChange={e => setFormData({...formData, exam_name: e.target.value})} 
                    placeholder="e.g. UPSC CSE, IBPS PO"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Category <span className="text-destructive">*</span></label>
                    <Select 
                      value={formData.category} 
                      onValueChange={val => setFormData({...formData, category: val || ""})}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Civil Services">Civil Services</SelectItem>
                        <SelectItem value="Banking">Banking</SelectItem>
                        <SelectItem value="SSC">SSC</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Defence">Defence</SelectItem>
                        <SelectItem value="Railways">Railways</SelectItem>
                        <SelectItem value="Teaching">Teaching</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Difficulty Level</label>
                    <Select 
                      value={formData.difficulty_level} 
                      onValueChange={val => setFormData({...formData, difficulty_level: val || "Medium"})}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Very High">Very High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Age Limit</label>
                    <Input 
                      value={formData.age_limit} 
                      onChange={e => setFormData({...formData, age_limit: e.target.value})} 
                      placeholder="e.g. 21-32 Years"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Attempts Allowed</label>
                    <Input 
                      value={formData.attempts_allowed} 
                      onChange={e => setFormData({...formData, attempts_allowed: e.target.value})} 
                      placeholder="e.g. 6 Attempts (General)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Salary Info</label>
                  <Input 
                    value={formData.salary} 
                    onChange={e => setFormData({...formData, salary: e.target.value})} 
                    placeholder="e.g. ₹56,100 - ₹2,50,000 / month"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Official Website</label>
                  <Input 
                    value={formData.official_website} 
                    onChange={e => setFormData({...formData, official_website: e.target.value})} 
                    placeholder="e.g. https://upsc.gov.in"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Eligibility Criteria <span className="text-destructive">*</span></label>
                  <Textarea 
                    required
                    value={formData.eligibility} 
                    onChange={e => setFormData({...formData, eligibility: e.target.value})} 
                    placeholder="Describe degree/educational requirements..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              {/* Right Column (Long Text Areas) */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Selection Process <span className="text-muted-foreground text-xs">(comma-separated stages)</span></label>
                  <Input 
                    value={formData.selectionProcessStr} 
                    onChange={e => setFormData({...formData, selectionProcessStr: e.target.value})} 
                    placeholder="e.g. Prelims, Mains, Interview"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Exam Pattern</label>
                  <Textarea 
                    value={formData.exam_pattern} 
                    onChange={e => setFormData({...formData, exam_pattern: e.target.value})} 
                    placeholder="Describe markings, tiers, paper duration details..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Syllabus <span className="text-destructive">*</span> <span className="text-muted-foreground text-xs">(comma-separated topics)</span></label>
                  <Textarea 
                    required
                    value={formData.syllabus} 
                    onChange={e => setFormData({...formData, syllabus: e.target.value})} 
                    placeholder="e.g. History, Geography, Polity, Quantitative Aptitude"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Career Opportunities <span className="text-muted-foreground text-xs">(e.g., job designations, roles)</span></label>
                  <Textarea 
                    value={formData.career_opportunities} 
                    onChange={e => setFormData({...formData, career_opportunities: e.target.value})} 
                    placeholder="e.g. IAS officer, IPS officer, Sub-divisional Magistrate"
                    className="min-h-[100px]"
                  />
                </div>
              </div>

            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Exam"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
