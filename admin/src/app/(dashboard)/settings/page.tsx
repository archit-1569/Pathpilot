"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Settings, 
  Globe, 
  Sliders, 
  Cpu, 
  Key, 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  Eye, 
  EyeOff 
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface SystemSettings {
  id: string;
  platform_name: string;
  contact_email: string;
  maintenance_mode: boolean;
  allow_registration: boolean;
  min_match_threshold: number;
  skills_weight: number;
  interests_weight: number;
  education_weight: number;
  ai_provider: string;
  ai_model: string;
  ai_temperature: number;
  ai_system_prompt: string;
  openai_api_key: string | null;
  gemini_api_key: string | null;
  other_api_key: string | null;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"platform" | "engine" | "ai" | "keys" | "admins">("platform");
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [currentAdminUser, setCurrentAdminUser] = useState<{ id: string } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);

  // Eye toggle state for API keys
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOtherKey, setShowOtherKey] = useState(false);

  // Admin Account Dialogs
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  
  // Admin form state
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin"
  });
  const [adminSaving, setAdminSaving] = useState(false);

  // Load configuration
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/admin/settings");
      setSettings(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load admins
  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const data = await apiRequest("/admin/users?role=admin");
      setAdmins(data.users);
    } catch (error) {
      console.error("Failed to load admin users:", error);
    } finally {
      setAdminsLoading(false);
    }
  };

  // Get current user id to prevent self-deletion
  const fetchCurrentUser = async () => {
    try {
      const user = await apiRequest("/auth/me");
      setCurrentAdminUser(user);
    } catch (error) {
      console.error("Failed to get current user details:", error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchAdmins();
    fetchCurrentUser();
  }, []);

  const handleSettingsChange = (field: keyof SystemSettings, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: value
    });
  };

  // Handle settings save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    // Recommendation Engine weights validation (sum must be 1.0)
    if (activeTab === "engine") {
      const sum = Number(settings.skills_weight) + Number(settings.interests_weight) + Number(settings.education_weight);
      if (Math.abs(sum - 1.0) > 0.001) {
        alert("Weights must sum up to exactly 1.0 (100%)");
        return;
      }
    }

    setSaving(true);
    try {
      const data = await apiRequest("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...settings,
          skills_weight: Number(settings.skills_weight),
          interests_weight: Number(settings.interests_weight),
          education_weight: Number(settings.education_weight),
          min_match_threshold: Number(settings.min_match_threshold),
          ai_temperature: Number(settings.ai_temperature),
        })
      });
      setSettings(data);
      alert("Settings saved successfully!");
    } catch (error: any) {
      alert("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Manage Admins CRUD
  const openAddAdminDialog = () => {
    setEditingAdmin(null);
    setAdminForm({
      name: "",
      email: "",
      password: "",
      role: "admin"
    });
    setIsAdminDialogOpen(true);
  };

  const openEditAdminDialog = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setAdminForm({
      name: admin.name || "",
      email: admin.email,
      password: "", // password optional on update
      role: admin.role
    });
    setIsAdminDialogOpen(true);
  };

  const handleAdminFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSaving(true);

    try {
      if (editingAdmin) {
        // Update admin
        await apiRequest(`/admin/users/${editingAdmin.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: adminForm.name,
            email: adminForm.email,
            role: adminForm.role,
            password: adminForm.password || undefined // send only if not empty
          })
        });
        alert("Administrator updated successfully!");
      } else {
        // Create admin
        if (!adminForm.password || adminForm.password.length < 8) {
          alert("Password must be at least 8 characters long");
          setAdminSaving(false);
          return;
        }
        await apiRequest("/admin/users", {
          method: "POST",
          body: JSON.stringify(adminForm)
        });
        alert("Administrator created successfully!");
      }
      setIsAdminDialogOpen(false);
      fetchAdmins();
    } catch (error: any) {
      alert("Failed to save administrator: " + error.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (currentAdminUser && admin.id === currentAdminUser.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (confirm(`Are you sure you want to delete administrator ${admin.email}?`)) {
      try {
        await apiRequest(`/admin/users/${admin.id}`, {
          method: "DELETE"
        });
        alert("Administrator deleted successfully!");
        fetchAdmins();
      } catch (error: any) {
        alert("Failed to delete administrator: " + error.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  const engineWeightsSum = settings 
    ? Number(settings.skills_weight) + Number(settings.interests_weight) + Number(settings.education_weight)
    : 0;
  const isWeightsSumValid = Math.abs(engineWeightsSum - 1.0) < 0.001;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab("platform")}
            className={`flex items-center px-4 py-3 text-sm font-semibold rounded-lg text-left transition-all ${
              activeTab === "platform"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Globe className="mr-3 h-4 w-4" />
            Platform Settings
          </button>
          <button
            onClick={() => setActiveTab("engine")}
            className={`flex items-center px-4 py-3 text-sm font-semibold rounded-lg text-left transition-all ${
              activeTab === "engine"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Sliders className="mr-3 h-4 w-4" />
            Recommendation Engine
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center px-4 py-3 text-sm font-semibold rounded-lg text-left transition-all ${
              activeTab === "ai"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Cpu className="mr-3 h-4 w-4" />
            AI Model Settings
          </button>
          <button
            onClick={() => setActiveTab("keys")}
            className={`flex items-center px-4 py-3 text-sm font-semibold rounded-lg text-left transition-all ${
              activeTab === "keys"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Key className="mr-3 h-4 w-4" />
            API Key Management
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`flex items-center px-4 py-3 text-sm font-semibold rounded-lg text-left transition-all ${
              activeTab === "admins"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Shield className="mr-3 h-4 w-4" />
            Admin Accounts
          </button>
        </aside>

        {/* Configurations Form Panel */}
        <div className="flex-1 bg-card text-card-foreground p-6 rounded-lg border shadow-sm">
          {activeTab !== "admins" && settings && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* PLATFORM SETTINGS */}
              {activeTab === "platform" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold">Platform Configuration</h2>
                    <p className="text-sm text-muted-foreground">General platform brand properties and registrations.</p>
                  </div>
                  <hr className="my-2" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Platform Name</label>
                      <Input
                        required
                        value={settings.platform_name}
                        onChange={(e) => handleSettingsChange("platform_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Support Contact Email</label>
                      <Input
                        required
                        type="email"
                        value={settings.contact_email}
                        onChange={(e) => handleSettingsChange("contact_email", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 bg-muted/40 p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="text-sm font-semibold block">Maintenance Mode</strong>
                        <span className="text-xs text-muted-foreground">Force-redirect student users to a maintenance screen.</span>
                      </div>
                      <input 
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        checked={settings.maintenance_mode}
                        onChange={(e) => handleSettingsChange("maintenance_mode", e.target.checked)}
                      />
                    </div>
                    <hr />
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="text-sm font-semibold block">Allow User Registrations</strong>
                        <span className="text-xs text-muted-foreground">Enable student signups. If off, only existing accounts can sign in.</span>
                      </div>
                      <input 
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        checked={settings.allow_registration}
                        onChange={(e) => handleSettingsChange("allow_registration", e.target.checked)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* RECOMMENDATION ENGINE SETTINGS */}
              {activeTab === "engine" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold">Recommendation Parameters</h2>
                    <p className="text-sm text-muted-foreground">Adjust matching engine filters and attribute weight profiles.</p>
                  </div>
                  <hr className="my-2" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Min Match Threshold</label>
                        <span className="text-xs font-bold text-primary">{settings.min_match_threshold}%</span>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        required
                        value={settings.min_match_threshold}
                        onChange={(e) => handleSettingsChange("min_match_threshold", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 bg-muted/40 p-5 rounded-lg border">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Attribute Weights (Must sum up to exactly 100% / 1.0)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold">Skills Weight (0.0 to 1.0)</label>
                        <Input
                          type="number"
                          min="0"
                          max="1.0"
                          step="0.05"
                          required
                          value={settings.skills_weight}
                          onChange={(e) => handleSettingsChange("skills_weight", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold">Interests Weight (0.0 to 1.0)</label>
                        <Input
                          type="number"
                          min="0"
                          max="1.0"
                          step="0.05"
                          required
                          value={settings.interests_weight}
                          onChange={(e) => handleSettingsChange("interests_weight", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold">Education Weight (0.0 to 1.0)</label>
                        <Input
                          type="number"
                          min="0"
                          max="1.0"
                          step="0.05"
                          required
                          value={settings.education_weight}
                          onChange={(e) => handleSettingsChange("education_weight", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm font-semibold">
                      <span>Total Weights Aggregation:</span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        isWeightsSumValid 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800 animate-pulse"
                      }`}>
                        {(engineWeightsSum * 100).toFixed(0)}% {isWeightsSumValid ? "(Valid)" : "(Invalid sum - must be 100%)"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI MODEL SETTINGS */}
              {activeTab === "ai" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold">AI Mentor Models</h2>
                    <p className="text-sm text-muted-foreground">Configure OpenAI model configurations and core instructions.</p>
                  </div>
                  <hr className="my-2" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Provider</label>
                      <Input
                        required
                        value={settings.ai_provider}
                        onChange={(e) => handleSettingsChange("ai_provider", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Model Identifier</label>
                      <Input
                        required
                        value={settings.ai_model}
                        onChange={(e) => handleSettingsChange("ai_model", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Model Temperature</label>
                        <span className="text-xs font-bold text-primary">{settings.ai_temperature}</span>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max="2.0"
                        step="0.05"
                        required
                        value={settings.ai_temperature}
                        onChange={(e) => handleSettingsChange("ai_temperature", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Core AI System Prompt</label>
                    <Textarea
                      rows={6}
                      required
                      className="font-mono text-xs leading-relaxed"
                      value={settings.ai_system_prompt}
                      onChange={(e) => handleSettingsChange("ai_system_prompt", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* API KEY SETTINGS */}
              {activeTab === "keys" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold">API Security Credentials</h2>
                    <p className="text-sm text-muted-foreground">Safely configuration integrations. Values are masked on display.</p>
                  </div>
                  <hr className="my-2" />
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">OpenAI API Key</label>
                      <div className="relative">
                        <Input
                          type={showOpenAIKey ? "text" : "password"}
                          className="pr-10"
                          value={settings.openai_api_key || ""}
                          placeholder="e.g. sk-proj-..."
                          onChange={(e) => handleSettingsChange("openai_api_key", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                          className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                        >
                          {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gemini API Key</label>
                      <div className="relative">
                        <Input
                          type={showGeminiKey ? "text" : "password"}
                          className="pr-10"
                          value={settings.gemini_api_key || ""}
                          placeholder="e.g. AIzaSy..."
                          onChange={(e) => handleSettingsChange("gemini_api_key", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                        >
                          {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Other External Service Key</label>
                      <div className="relative">
                        <Input
                          type={showOtherKey ? "text" : "password"}
                          className="pr-10"
                          value={settings.other_api_key || ""}
                          placeholder="API token or credentials"
                          onChange={(e) => handleSettingsChange("other_api_key", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOtherKey(!showOtherKey)}
                          className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                        >
                          {showOtherKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Controls */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="submit"
                  disabled={saving || (activeTab === "engine" && !isWeightsSumValid)}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Configurations"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ADMIN MANAGEMENT TAB */}
          {activeTab === "admins" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Admin Account Management</h2>
                  <p className="text-sm text-muted-foreground">Add, edit, or terminate administrator portal accounts.</p>
                </div>
                <Button onClick={openAddAdminDialog} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Administrator
                </Button>
              </div>
              <hr className="my-2" />

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">Loading administrators...</TableCell>
                      </TableRow>
                    ) : admins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">No administrators found.</TableCell>
                      </TableRow>
                    ) : (
                      admins.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">{admin.name || "N/A"}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>{format(new Date(admin.created_at), "PPp")}</TableCell>
                          <TableCell>
                            {admin.last_login ? format(new Date(admin.last_login), "PPp") : "Never"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={admin.is_active ? "outline" : "destructive"}>
                              {admin.is_active ? "Active" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon-sm"
                              onClick={() => openEditAdminDialog(admin)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              disabled={!!(currentAdminUser && admin.id === currentAdminUser.id)}
                              onClick={() => handleDeleteAdmin(admin)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN ADD/EDIT DIALOG */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdmin ? "Edit Administrator" : "Add Administrator"}</DialogTitle>
            <DialogDescription>
              {editingAdmin 
                ? `Change credentials for admin account: ${editingAdmin.email}` 
                : "Register a new administrator with secure credentials."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdminFormSubmit} className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
              <Input
                required
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
              <Input
                required
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
                {editingAdmin && <span className="text-[10px] text-muted-foreground italic">(Leave blank to keep current)</span>}
              </div>
              <Input
                type="password"
                required={!editingAdmin}
                placeholder={editingAdmin ? "••••••••" : "At least 8 characters"}
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAdminDialogOpen(false)}
                disabled={adminSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adminSaving}>
                {adminSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingAdmin ? "Save Changes" : "Create Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
