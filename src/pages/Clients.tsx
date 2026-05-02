import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone, 
  CreditCard, 
  User as UserIcon,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Clients = () => {
  const { searchQuery, setSearchQuery, profile } = useOutletContext<{ 
    searchQuery: string; 
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>; 
    profile: any 
  }>();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    phone: "",
    id_tin_no: "",
  });
  const { toast } = useToast();

  const fetchClients = React.useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  }, [profile?.organization_id, toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleOpenDialog = (client: any = null) => {
    if (client) {
      setSelectedClient(client);
      setFormData({
        name: client.name,
        nickname: client.nickname || "",
        phone: client.phone,
        id_tin_no: client.id_tin_no,
      });
      setIsEditing(true);
    } else {
      setSelectedClient(null);
      setFormData({
        name: "",
        nickname: "",
        phone: "",
        id_tin_no: "",
      });
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;

    setLoading(true);
    try {
      if (isEditing && selectedClient) {
        const { error } = await supabase
          .from("clients")
          .update(formData)
          .eq("id", selectedClient.id);
        if (error) throw error;
        toast({ title: "Success", description: "Client updated successfully" });
      } else {
        const { error } = await supabase
          .from("clients")
          .insert({
            ...formData,
            organization_id: profile.organization_id,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });
        if (error) throw error;
        toast({ title: "Success", description: "Client created successfully" });
      }
      setIsDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save client",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", selectedClient.id);
      if (error) throw error;
      toast({ title: "Success", description: "Client deleted successfully" });
      setIsDeleteDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const query = searchQuery?.toLowerCase() || "";
    return (
      client.name?.toLowerCase().includes(query) ||
      client.nickname?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query) ||
      client.id_tin_no?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients Database</h2>
          <p className="text-muted-foreground">Manage your client information and records.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 shadow-lg shadow-emerald-900/20">
          <Plus className="h-4 w-4" />
          Add New Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted/50 border-none" />
          ))
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">No clients found matching your search.</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="group overflow-hidden border-none shadow-md bg-white/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <div className="h-1 w-full bg-emerald-500" />
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-none">{client.name}</h3>
                      {client.nickname && <p className="text-xs text-muted-foreground mt-1">"{client.nickname}"</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(client)} className="h-8 w-8 text-muted-foreground hover:text-emerald-600">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedClient(client); setIsDeleteDialogOpen(true); }} className="h-8 w-8 text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="text-foreground font-medium">{client.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-foreground font-medium">{client.id_tin_no}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Client Information" : "Register New Client"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname / Company ID</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (10 digits) *</Label>
              <Input
                id="phone"
                required
                maxLength={10}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="07XXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_tin_no">ID or TIN Number *</Label>
              <Input
                id="id_tin_no"
                required
                value={formData.id_tin_no}
                onChange={(e) => setFormData({ ...formData, id_tin_no: e.target.value })}
                placeholder="National ID or TIN"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditing ? "Update Client" : "Register Client")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedClient?.name}</strong> and all their associated rental history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
