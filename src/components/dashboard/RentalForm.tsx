import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Upload, Users, UserPlus, Check, ChevronsUpDown, Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const rentalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nickname: z.string().optional(),
  id_tin_no: z.string().min(1, "ID/TIN No is required"),
  phone: z.string().length(10, "Phone must be exactly 10 digits").regex(/^\d+$/, "Phone must contain only digits"),
  num_scaffoldings: z.number().min(0).default(0),
  num_chopsticks: z.number().min(0).default(0),
  plates: z.number().min(0).default(0),
  timbers: z.number().min(0).default(0),
  connectors: z.number().min(0).default(0),
  legs: z.number().min(0).default(0),
  ladders: z.number().min(0).default(0),
  joints: z.number().min(0).default(0),
  wheels: z.number().min(0).default(0),
  station: z.string().optional(),
  price_per_scaffolding: z.number().min(0, "Must be 0 or greater"),
  expected_days: z.number().min(1, "Must be at least 1 day"),
  paid_days: z.number().min(0, "Must be 0 or greater"),
  pickup_person_name: z.string().min(1, "Pickup person name is required"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
});

export const RentalForm = () => {
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isNewClient, setIsNewClient] = useState(true);
  const [openClientSelect, setOpenClientSelect] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
          
        if (profileData) {
          setUserRole(profileData.role);
          setProfile(profileData);
          
          // Fetch clients for this organization
          const { data: clientsData } = await supabase
            .from("clients")
            .select("*")
            .eq("organization_id", profileData.organization_id)
            .order("name");
          setClients(clientsData || []);
        }
      }
    };
    fetchData();
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    id_tin_no: "",
    phone: "",
    num_scaffoldings: 0,
    num_chopsticks: 0,
    plates: 0,
    timbers: 0,
    connectors: 0,
    legs: 0,
    ladders: 0,
    joints: 0,
    wheels: 0,
    station: "",
    tubes_6m: 0,
    tubes_4m: 0,
    tubes_3m: 0,
    tubes_1m: 0,
    price_per_scaffolding: 0,
    expected_days: 0,
    paid_days: 0,
    country: "",
    province: "",
    district: "",
    pickup_person_name: "",
    vehicle_type: "",
    plate_number: "",
    rented_date: new Date().toISOString().split('T')[0],
    billable_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  });

  const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const toggleBillableDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      billable_days: prev.billable_days.includes(day)
        ? prev.billable_days.filter(d => d !== day)
        : [...prev.billable_days, day]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
    }
  };

  const handleSelectClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClientId(client.id);
      setIsNewClient(false);
      setFormData({
        ...formData,
        name: client.name,
        nickname: client.nickname || "",
        phone: client.phone || "",
        id_tin_no: client.id_tin_no || "",
      });
    }
    setOpenClientSelect(false);
  };

  const handleToggleNewClient = () => {
    setIsNewClient(true);
    setSelectedClientId(null);
    setFormData({
      ...formData,
      name: "",
      nickname: "",
      phone: "",
      id_tin_no: "",
    });
    toast({
      title: "New Client Mode",
      description: "You can now enter new client information below.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate location - at least one must be filled (database constraint)
      if (!formData.country && !formData.province && !formData.district) {
        toast({
          title: "Validation Error",
          description: "Please fill in at least one location field (country, province, or district)",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Equipment is now optional

      if (!formData.price_per_scaffolding || formData.price_per_scaffolding <= 0) {
        toast({
          title: "Validation Error",
          description: "Price per scaffolding must be greater than 0",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (formData.expected_days <= 0) {
        toast({
          title: "Validation Error",
          description: "Expected days must be greater than 0",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Apply Zod validation if no image is uploaded, or if an image is uploaded,
      // ensure at least the name is present (as other fields might be on the image)
      if (!uploadedImage) {
        const validation = rentalSchema.safeParse(formData);
        if (!validation.success) {
          toast({
            title: "Validation Error",
            description: validation.error.errors[0].message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else {
        // Only validate name when image is uploaded
        if (!formData.name) {
          toast({
            title: "Validation Error",
            description: "Name is required",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile?.organization_id) {
        toast({
          title: "Error",
          description: !user ? "You must be logged in" : "Organization profile not loaded",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Upload image if present
      let documentImageUrl = null;
      if (uploadedImage) {
        const fileExt = uploadedImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('rental-documents')
          .upload(fileName, uploadedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('rental-documents')
          .getPublicUrl(uploadData.path);

        documentImageUrl = publicUrl;
      }

      // Get or Create client
      let clientId = selectedClientId;
      
      if (isNewClient) {
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: formData.name,
            nickname: formData.nickname || null,
            id_tin_no: formData.id_tin_no || null,
            phone: formData.phone || null,
            created_by: user.id,
            organization_id: profile.organization_id // Explicitly set it
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = client.id;
      }

      // Calculate totals
      const numScaffoldings = formData.num_scaffoldings;
      const pricePerScaffolding = formData.price_per_scaffolding;
      const expectedDays = formData.expected_days;
      const paidDays = formData.paid_days;

      const totalPaid = numScaffoldings * pricePerScaffolding * paidDays;
      const totalCost = numScaffoldings * pricePerScaffolding * expectedDays;
      const balanceDue = totalCost - totalPaid;

      // Create rental
      const { error: rentalError } = await supabase
        .from("rentals")
        .insert({
          client_id: clientId,
          num_scaffoldings: numScaffoldings,
          num_chopsticks: formData.num_chopsticks,
          plates: formData.plates,
          timbers: formData.timbers,
          connectors: formData.connectors,
          legs: formData.legs,
          ladders: formData.ladders || 0,
          joints: formData.joints || 0,
          wheels: formData.wheels || 0,
          station: formData.station || null,
          tubes_6m: formData.tubes_6m || 0,
          tubes_4m: formData.tubes_4m || 0,
          tubes_3m: formData.tubes_3m || 0,
          tubes_1m: formData.tubes_1m || 0,
          price_per_scaffolding: pricePerScaffolding,
          expected_days: expectedDays,
          paid_days: paidDays,
          total_paid: totalPaid,
          balance_due: balanceDue,
          country: formData.country || null,
          province: formData.province || null,
          district: formData.district || null,
          pickup_person_name: formData.pickup_person_name,
          vehicle_type: formData.vehicle_type,
          plate_number: formData.plate_number || null,
          document_image_url: documentImageUrl,
          rented_date: formData.rented_date || new Date().toISOString(),
          billable_days: formData.billable_days,
          created_by: user.id,
        });

      if (rentalError) throw rentalError;

      // Deduct from inventory
      const { data: currentInventory } = await supabase
        .from("inventory")
        .select("available_stock")
        .eq("item_name", "Scaffoldings")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      if (currentInventory) {
        await supabase
          .from("inventory")
          .update({ 
            available_stock: Math.max(0, currentInventory.available_stock - numScaffoldings) 
          })
          .eq("item_name", "Scaffoldings")
          .eq("organization_id", profile.organization_id);
      }

      toast({
        title: "Success",
        description: "Rental created successfully",
      });
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Rental Creation Error:", error);
      toast({
        title: "Error",
        description: error.details || error.message || "Failed to create rental",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Paperwork (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="document">
              Upload filled paperwork - Only name will be required if you upload an image
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="document"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="flex-1"
              />
              {uploadedImage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  {uploadedImage.name}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {userRole === "CEO" && (
        <Card>
          <CardHeader>
            <CardTitle>Rental Date (CEO Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="rented_date">Date of Rental</Label>
              <Input
                id="rented_date"
                type="date"
                value={formData.rented_date}
                onChange={(e) => setFormData({ ...formData, rented_date: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Client Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
            <Button
              type="button"
              variant={isNewClient ? "ghost" : "secondary"}
              size="sm"
              onClick={() => setIsNewClient(false)}
              className={cn(
                "rounded-lg px-4 transition-all",
                !isNewClient ? "bg-white shadow-sm text-emerald-600 font-bold" : "text-slate-500"
              )}
            >
              Existing Client
            </Button>
            <Button
              type="button"
              variant={isNewClient ? "secondary" : "ghost"}
              size="sm"
              onClick={handleToggleNewClient}
              className={cn(
                "rounded-lg px-4 transition-all",
                isNewClient ? "bg-white shadow-sm text-emerald-600 font-bold" : "text-slate-500"
              )}
            >
              New Client
            </Button>
          </div>

          {!isNewClient && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Search Clients</Label>
              <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openClientSelect}
                    className="w-full justify-between bg-white border-slate-200 h-12 rounded-xl shadow-sm hover:border-emerald-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      {selectedClientId
                        ? clients.find((c) => c.id === selectedClientId)?.name
                        : "Search by name, phone or TIN..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 shadow-2xl border-emerald-50 rounded-2xl overflow-hidden" align="start">
                  <Command className="rounded-none">
                    <CommandInput placeholder="Type to search..." className="h-12 border-none focus:ring-0" />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty className="py-6 text-sm text-slate-500 text-center">No clients found.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.name} ${client.phone} ${client.nickname || ""}`}
                            onSelect={() => handleSelectClient(client.id)}
                            className="py-3 px-4 aria-selected:bg-emerald-50 cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{client.name}</span>
                                <span className="text-[10px] text-slate-500 font-medium">{client.phone} • {client.id_tin_no}</span>
                              </div>
                              {selectedClientId === client.id && <Check className="h-4 w-4 text-emerald-600" />}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {isNewClient && (
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50 animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Creating a new client profile. Fill in the details below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              required
              readOnly={!isNewClient}
              className={!isNewClient ? "bg-muted" : ""}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              readOnly={!isNewClient}
              className={!isNewClient ? "bg-muted" : ""}
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="id_tin_no">ID/TIN No {!uploadedImage && "*"}</Label>
            <Input
              id="id_tin_no"
              required={!uploadedImage}
              readOnly={!isNewClient}
              className={!isNewClient ? "bg-muted" : ""}
              value={formData.id_tin_no}
              onChange={(e) => setFormData({ ...formData, id_tin_no: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone (10 digits) {!uploadedImage && "*"}</Label>
            <Input
              id="phone"
              required={!uploadedImage}
              maxLength={10}
              readOnly={!isNewClient}
              className={!isNewClient ? "bg-muted" : ""}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            "num_scaffoldings",
            "num_chopsticks",
            "plates",
            "timbers",
            "connectors",
            "legs",
            "ladders",
            "joints",
            "wheels",
            "tubes_6m",
            "tubes_4m",
            "tubes_3m",
            "tubes_1m"
          ].map((field) => (
            <div key={field}>
              <Label htmlFor={field}>
                {field.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
              </Label>
              <Input
                id={field}
                type="number"
                min="0"
                value={(formData as any)[field]}
                onChange={(e) => setFormData({ ...formData, [field]: parseInt(e.target.value) || 0 })}
              />
            </div>
          ))}
          <div>
            <Label htmlFor="station">Station</Label>
            <Input
              id="station"
              value={formData.station}
              onChange={(e) => setFormData({ ...formData, station: e.target.value })}
              placeholder="Enter station"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="price_per_scaffolding">Price per Scaffolding (FRW) {!uploadedImage && "*"}</Label>
            <Input
              id="price_per_scaffolding"
              type="number"
              required={!uploadedImage}
              min="0"
              step="0.01"
              value={formData.price_per_scaffolding}
              onChange={(e) => setFormData({ ...formData, price_per_scaffolding: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="expected_days">Expected Days {!uploadedImage && "*"}</Label>
            <Input
              id="expected_days"
              type="number"
              required={!uploadedImage}
              min="1"
              value={formData.expected_days}
              onChange={(e) => setFormData({ ...formData, expected_days: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="paid_days">Paid Days {!uploadedImage && "*"}</Label>
            <Input
              id="paid_days"
              type="number"
              required={!uploadedImage}
              min="0"
              value={formData.paid_days}
              onChange={(e) => setFormData({ ...formData, paid_days: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="md:col-span-3 space-y-3">
            <Label>Billable Days (Select days the client pays for)</Label>
            <div className="flex flex-wrap gap-4 p-4 bg-muted/20 rounded-xl">
              {DAYS_OF_WEEK.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    className={cn(
                      "h-5 w-5 rounded border-2 transition-all flex items-center justify-center",
                      formData.billable_days.includes(day) 
                        ? "bg-[#0F172A] border-[#0F172A] text-white" 
                        : "border-slate-300 group-hover:border-slate-400 bg-white"
                    )}
                    onClick={() => toggleBillableDay(day)}
                  >
                    {formData.billable_days.includes(day) && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    formData.billable_days.includes(day) ? "text-slate-900" : "text-slate-500"
                  )}>
                    {day.slice(0, 3)}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              * The daily rate will only increment on the days selected above.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location (At least one required)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="province">Province</Label>
            <Input
              id="province"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="district">District</Label>
            <Input
              id="district"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pickup Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="pickup_person_name">Who Took It {!uploadedImage && "*"}</Label>
            <Input
              id="pickup_person_name"
              required={!uploadedImage}
              value={formData.pickup_person_name}
              onChange={(e) => setFormData({ ...formData, pickup_person_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="vehicle_type">Vehicle Type {!uploadedImage && "*"}</Label>
            <Input
              id="vehicle_type"
              required={!uploadedImage}
              value={formData.vehicle_type}
              onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="plate_number">Plate Number</Label>
            <Input
              id="plate_number"
              value={formData.plate_number}
              onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Creating..." : "Create Rental"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
