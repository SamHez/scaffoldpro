import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Upload } from "lucide-react";

const rentalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nickname: z.string().optional(),
  id_tin_no: z.string().min(1, "ID/TIN No is required"),
  phone: z.string().length(10, "Phone must be exactly 10 digits").regex(/^\d+$/, "Phone must contain only digits"),
  num_scaffoldings: z.number().min(0, "Must be 0 or greater"),
  num_chopsticks: z.number().min(0, "Must be 0 or greater"),
  plates: z.number().min(0, "Must be 0 or greater"),
  timbers: z.number().min(0, "Must be 0 or greater"),
  connectors: z.number().min(0, "Must be 0 or greater"),
  legs: z.number().min(0, "Must be 0 or greater"),
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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (roles) {
          setUserRole(roles.role);
        }
      }
    };
    fetchUserRole();
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
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If image is uploaded, only name is required
      if (!uploadedImage) {
        // Validate location - at least one must be filled
        if (!formData.country && !formData.province && !formData.district) {
          toast({
            title: "Validation Error",
            description: "Please fill in at least one location field (country, province, or district)",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

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
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
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

      // Create client
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: formData.name,
          nickname: formData.nickname || null,
          id_tin_no: uploadedImage ? null : formData.id_tin_no,
          phone: uploadedImage ? null : formData.phone,
          created_by: user.id,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Calculate totals
      const numScaffoldings = uploadedImage ? 0 : formData.num_scaffoldings;
      const pricePerScaffolding = uploadedImage ? 0 : formData.price_per_scaffolding;
      const expectedDays = uploadedImage ? 1 : formData.expected_days;
      const paidDays = uploadedImage ? 0 : formData.paid_days;

      const totalPaid = numScaffoldings * pricePerScaffolding * paidDays;
      const totalCost = numScaffoldings * pricePerScaffolding * expectedDays;
      const balanceDue = totalCost - totalPaid;

      // Create rental
      const { error: rentalError } = await supabase
        .from("rentals")
        .insert({
          client_id: client.id,
          num_scaffoldings: numScaffoldings,
          num_chopsticks: uploadedImage ? 0 : formData.num_chopsticks,
          plates: uploadedImage ? 0 : formData.plates,
          timbers: uploadedImage ? 0 : formData.timbers,
          connectors: uploadedImage ? 0 : formData.connectors,
          legs: uploadedImage ? 0 : formData.legs,
          tubes_6m: formData.tubes_6m || null,
          tubes_4m: formData.tubes_4m || null,
          tubes_3m: formData.tubes_3m || null,
          tubes_1m: formData.tubes_1m || null,
          price_per_scaffolding: pricePerScaffolding,
          expected_days: expectedDays,
          paid_days: paidDays,
          total_paid: totalPaid,
          balance_due: balanceDue,
          country: formData.country || null,
          province: formData.province || null,
          district: formData.district || null,
          pickup_person_name: uploadedImage ? "" : formData.pickup_person_name,
          vehicle_type: uploadedImage ? "" : formData.vehicle_type,
          plate_number: formData.plate_number || null,
          document_image_url: documentImageUrl,
          rented_date: formData.rented_date || new Date().toISOString(),
          created_by: user.id,
        });

      if (rentalError) throw rentalError;

      toast({
        title: "Success",
        description: "Rental created successfully",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create rental",
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="id_tin_no">ID/TIN No {!uploadedImage && "*"}</Label>
            <Input
              id="id_tin_no"
              required={!uploadedImage}
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
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipment (Mandatory)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {["num_scaffoldings", "num_chopsticks", "plates", "timbers", "connectors", "legs"].map((field) => (
            <div key={field}>
              <Label htmlFor={field}>
                {field.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} {!uploadedImage && "*"}
              </Label>
              <Input
                id={field}
                type="number"
                required={!uploadedImage}
                min="0"
                value={(formData as any)[field]}
                onChange={(e) => setFormData({ ...formData, [field]: parseInt(e.target.value) || 0 })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extra Equipment (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["tubes_6m", "tubes_4m", "tubes_3m", "tubes_1m"].map((field) => (
            <div key={field}>
              <Label htmlFor={field}>
                {field.replace("_", " ").toUpperCase()}
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
