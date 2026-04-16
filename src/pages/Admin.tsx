import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, UserPlus, Users, Trash2, ShieldCheck, Landmark, Plus, Search, Activity, MoreVertical, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const Admin = () => {
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [isManageUsersDialogOpen, setIsManageUsersDialogOpen] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [selectedOrgUsers, setSelectedOrgUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    // New Org Form
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgLimit, setNewOrgLimit] = useState(5);

    // New User Form
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserFullName, setNewUserFullName] = useState("");
    const [newUserRole, setNewUserRole] = useState("EMPLOYEE");

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("organizations")
            .select(`
                *,
                profiles (id, full_name, role, email)
            `)
            .order('name');

        if (error) {
            toast({
                title: "Error",
                description: "Failed to fetch organizations",
                variant: "destructive",
            });
        } else {
            setOrganizations(data || []);
        }
        setLoading(false);
    };

    const handleCreateOrg = async () => {
        if (!newOrgName) return;

        const { error } = await supabase
            .from("organizations")
            .insert({ name: newOrgName, max_accounts: newOrgLimit });

        if (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Success",
                description: "Organization created successfully",
            });
            setIsOrgDialogOpen(false);
            setNewOrgName("");
            fetchOrganizations();
        }
    };

    const handleDeleteOrg = async (id: string) => {
        const { error } = await supabase
            .from("organizations")
            .delete()
            .eq("id", id);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to delete organization: " + error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Success",
                description: "Organization and all its data deleted successfully",
            });
            fetchOrganizations();
        }
    };

    const handleCreateUser = async () => {
        if (!selectedOrgId || !newUserEmail || !newUserPassword) return;

        const { error } = await supabase.auth.signUp({
            email: newUserEmail,
            password: newUserPassword,
            options: {
                data: {
                    full_name: newUserFullName,
                    role: newUserRole,
                    organization_id: selectedOrgId
                }
            }
        });

        if (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Success",
                description: `User created. Verification email sent to ${newUserEmail}`,
            });
            setIsUserDialogOpen(false);
            setNewUserEmail("");
            setNewUserPassword("");
            setNewUserFullName("");
            fetchOrganizations();
        }
    };

    const handleUpdateUserRole = async (userId: string, newRole: string) => {
        const { error } = await supabase
            .from("profiles")
            .update({ role: newRole })
            .eq("id", userId);
            
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "User role updated" });
            fetchOrganizations();
            setSelectedOrgUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        }
    };

    const handleRemoveUser = async (userId: string) => {
        const { error } = await supabase
            .from("profiles")
            .update({ organization_id: null })
            .eq("id", userId);
            
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "User removed from organization" });
            fetchOrganizations();
            setSelectedOrgUsers(prev => prev.filter(u => u.id !== userId));
        }
    };

    const filteredOrgs = organizations.filter(org => 
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-xl shadow-zinc-200/50">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 bg-gradient-to-br from-zinc-900 to-zinc-500 bg-clip-text text-transparent">
                        <ShieldCheck className="h-8 w-8 text-emerald-600" />
                        System Admin
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Manage your multi-tenant scaffolding ecosystem.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input 
                            placeholder="Search organizations..." 
                            className="pl-9 h-11 w-full md:w-[260px] bg-white/50 border-white/40 rounded-xl focus-visible:ring-emerald-500 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all duration-300 gap-2 font-semibold">
                                <Plus className="h-5 w-5" />
                                <span className="hidden sm:inline">New Organization</span>
                                <span className="sm:hidden">New</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] rounded-3xl !rounded-3xl border-none p-0 overflow-hidden">
                            <div className="bg-emerald-600 p-6 text-white overflow-hidden relative">
                                <Building2 className="absolute -bottom-4 -right-4 h-24 w-24 opacity-10" />
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold">New Organization</DialogTitle>
                                </DialogHeader>
                                <p className="text-emerald-100 text-sm mt-2">Initialize a new secure tenant for the platform.</p>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Name</Label>
                                        <Input 
                                            placeholder="e.g. Acme Construction" 
                                            value={newOrgName} 
                                            onChange={(e) => setNewOrgName(e.target.value)}
                                            className="h-12 bg-zinc-50/50 border-zinc-200 rounded-xl focus-visible:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Account Limit</Label>
                                        <Input 
                                            type="number" 
                                            value={newOrgLimit} 
                                            onChange={(e) => setNewOrgLimit(parseInt(e.target.value))}
                                            className="h-12 bg-zinc-50/50 border-zinc-200 rounded-xl focus-visible:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-lg" onClick={handleCreateOrg}>Create Tenant</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Organizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-64 rounded-3xl bg-zinc-200/50 animate-pulse border border-white/20" />
                    ))
                ) : filteredOrgs.length === 0 ? (
                    <div className="col-span-full py-20 text-center space-y-4 bg-white/30 backdrop-blur-sm rounded-3xl border border-dashed border-zinc-300">
                        <div className="mx-auto w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-xl text-zinc-700">No organizations found</p>
                            <p className="text-muted-foreground">Try adjusting your search terms or create a new one.</p>
                        </div>
                    </div>
                ) : (
                    filteredOrgs.map((org) => {
                        const usageRatio = (org.profiles?.length || 0) / org.max_accounts;
                        const isAtLimit = usageRatio >= 1;
                        
                        return (
                            <Card key={org.id} className={cn(
                                "group relative overflow-hidden border-none shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-3xl bg-white/60 backdrop-blur-md",
                                isAtLimit ? "ring-2 ring-red-500/10" : "ring-1 ring-emerald-500/5"
                            )}>
                                {/* Gradient Background Accent */}
                                <div className={cn(
                                    "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-2xl opacity-10 transition-colors",
                                    isAtLimit ? "bg-red-500" : "bg-emerald-500"
                                )} />
                                
                                <CardHeader className="p-6 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Active Tenant</span>
                                            </div>
                                            <CardTitle className="text-2xl font-black text-zinc-800 line-clamp-1">{org.name}</CardTitle>
                                        </div>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl ml-2">
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-2xl font-bold">Delete Organization?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-base">
                                                        This will permanently delete <span className="font-bold text-zinc-900 underline">{org.name}</span> and <span className="font-bold text-red-600">ALL</span> associated data including clients, rentals, and inventory. This action is irreversible.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="mt-4">
                                                    <AlertDialogCancel className="rounded-xl h-11">Keep It</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        onClick={() => handleDeleteOrg(org.id)} 
                                                        className="bg-red-600 hover:bg-red-700 rounded-xl h-11 font-bold shadow-lg shadow-red-500/20"
                                                    >
                                                        Delete Everything
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardHeader>
                                
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end mb-1">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Storage Capacity</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black text-zinc-900">{org.profiles?.length || 0}</span>
                                                    <span className="text-zinc-400 font-medium">/ {org.max_accounts} Users</span>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "p-2 rounded-xl",
                                                isAtLimit ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                            )}>
                                                <Activity className="h-5 w-5" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Progress 
                                                value={usageRatio * 100} 
                                                className={cn(
                                                    "h-2 rounded-full",
                                                    isAtLimit ? "[&>div]:bg-red-500 bg-red-100" : "[&>div]:bg-emerald-500 bg-emerald-100"
                                                )} 
                                            />
                                            {isAtLimit && (
                                                <p className="text-[10px] font-bold text-red-500 italic">Limit reached. Upgrade required for more users.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <Button 
                                            variant="secondary"
                                            className="h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold gap-2 transition-all group"
                                            onClick={() => {
                                                setSelectedOrgId(org.id);
                                                setSelectedOrgUsers(org.profiles || []);
                                                setIsManageUsersDialogOpen(true);
                                            }}
                                        >
                                            <Users className="h-4 w-4 transition-transform group-hover:scale-110" />
                                            Manage
                                        </Button>
                                        <Button 
                                            className={cn(
                                                "h-12 rounded-2xl font-bold gap-2 transition-all active:scale-95",
                                                isAtLimit ? "bg-zinc-200 text-zinc-400 cursor-not-allowed" : "bg-zinc-900 text-white hover:bg-black shadow-lg shadow-black/10"
                                            )}
                                            disabled={isAtLimit}
                                            onClick={() => {
                                                setSelectedOrgId(org.id);
                                                setIsUserDialogOpen(true);
                                            }}
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            Add
                                        </Button>
                                    </div>
                                </CardContent>
                                
                                <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                                    <span className="text-[10px] font-medium text-zinc-400 font-mono">{org.id.split('-')[0]}...{org.id.split('-').pop()}</span>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* User Addition Dialog */}
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl !rounded-3xl border-none p-0 overflow-hidden shadow-2xl">
                    <div className="bg-zinc-900 p-8 text-white relative overflow-hidden">
                        <UserPlus className="absolute -bottom-6 -right-6 h-32 w-32 opacity-10" />
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-extrabold tracking-tight">Add Team Member</DialogTitle>
                        </DialogHeader>
                        <p className="text-zinc-400 text-sm mt-2">Provision a new account for this organization. They will be limited to their own data scope.</p>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 gap-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 pl-1">Full Name</Label>
                                <Input 
                                    placeholder="John Doe" 
                                    className="h-12 rounded-xl bg-zinc-50 border-zinc-200 focus:ring-emerald-500"
                                    value={newUserFullName} 
                                    onChange={(e) => setNewUserFullName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 pl-1">Email Address</Label>
                                <Input 
                                    type="email" 
                                    placeholder="john@example.com" 
                                    className="h-12 rounded-xl bg-zinc-50 border-zinc-200 focus:ring-emerald-500"
                                    value={newUserEmail} 
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 pl-1">Temporary Password</Label>
                                    <Input 
                                        type="password" 
                                        className="h-12 rounded-xl bg-zinc-50 border-zinc-200 focus:ring-emerald-500"
                                        value={newUserPassword} 
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 pl-1">Initial Role</Label>
                                    <Select value={newUserRole} onValueChange={setNewUserRole}>
                                        <SelectTrigger className="h-12 rounded-xl bg-zinc-50 border-zinc-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-zinc-200">
                                            <SelectItem value="CEO">CEO (Owner)</SelectItem>
                                            <SelectItem value="COO">COO (Manager)</SelectItem>
                                            <SelectItem value="EMPLOYEE">Employee (Staff)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <Button className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95" onClick={handleCreateUser}>Create Secure Account</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Users Dialog */}
            <Dialog open={isManageUsersDialogOpen} onOpenChange={setIsManageUsersDialogOpen}>
                <DialogContent className="sm:max-w-[700px] rounded-[2rem] !rounded-[2rem] border-none p-0 overflow-hidden shadow-3xl">
                    <div className="bg-zinc-100 p-8 border-b border-zinc-200">
                        <DialogHeader>
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <DialogTitle className="text-3xl font-black tracking-tighter text-zinc-900">Account Registry</DialogTitle>
                                    <p className="text-zinc-500 font-medium">Managing users for <span className="text-zinc-900 font-bold">{organizations.find(o => o.id === selectedOrgId)?.name}</span></p>
                                </div>
                                <div className="h-12 w-12 rounded-2xl bg-white shadow-md flex items-center justify-center">
                                    <Users className="h-6 w-6 text-emerald-600" />
                                </div>
                            </div>
                        </DialogHeader>
                    </div>
                    
                    <div className="p-8">
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-3 no-scrollbar">
                            {selectedOrgUsers.length === 0 ? (
                                <div className="text-center py-12 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
                                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">No active accounts</p>
                                    <p className="text-zinc-400 text-sm mt-1">This organization is currently empty.</p>
                                </div>
                            ) : (
                                selectedOrgUsers.map(user => (
                                    <div key={user.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-[1.5rem] bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-emerald-200/50 transition-all duration-300 gap-4">
                                        <div className="flex gap-4 items-center">
                                            <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                                                <span className="text-zinc-400 font-black group-hover:text-emerald-500 transition-colors">
                                                    {user.full_name?.charAt(0) || "U"}
                                                </span>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="font-extrabold text-zinc-900">{user.full_name || "Unknown Identity"}</p>
                                                <p className="text-xs text-zinc-400 font-medium">{user.email || "No email provided"}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Select 
                                                    value={user.role} 
                                                    onValueChange={(val) => handleUpdateUserRole(user.id, val)}
                                                >
                                                    <SelectTrigger className="w-[110px] h-10 rounded-xl bg-zinc-50 border-none font-bold text-xs ring-offset-emerald-500 focus:ring-emerald-500">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-zinc-200">
                                                        <SelectItem value="CEO">CEO</SelectItem>
                                                        <SelectItem value="COO">COO</SelectItem>
                                                        <SelectItem value="EMPLOYEE">STAFF</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-10 w-10 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-3xl border-none">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Remove Access?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will remove <span className="font-bold text-zinc-900">{user.full_name}</span> from the organization. They will no longer be able to access any company data.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={() => handleRemoveUser(user.id)}
                                                            className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
                                                        >
                                                            Remove Access
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Admin;
