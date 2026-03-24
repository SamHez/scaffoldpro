import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface EditRentalDialogProps {
    rental: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const EditRentalDialog = ({
    rental,
    open,
    onOpenChange,
    onSuccess,
}: EditRentalDialogProps) => {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const [formData, setFormData] = useState<any>(null);

    useEffect(() => {
        if (rental) {
            setFormData({
                name: rental.clients?.name || "",
                nickname: rental.clients?.nickname || "",
                phone: rental.clients?.phone || "",
                id_tin_no: rental.clients?.id_tin_no || "",
                num_scaffoldings: rental.num_scaffoldings || 0,
                num_chopsticks: rental.num_chopsticks || 0,
                plates: rental.plates || 0,
                timbers: rental.timbers || 0,
                connectors: rental.connectors || 0,
                legs: rental.legs || 0,
                tubes_6m: rental.tubes_6m || 0,
                tubes_4m: rental.tubes_4m || 0,
                tubes_3m: rental.tubes_3m || 0,
                tubes_1m: rental.tubes_1m || 0,
                price_per_scaffolding: rental.price_per_scaffolding || 0,
                expected_days: rental.expected_days || 0,
                paid_days: rental.paid_days || 0,
                pickup_person_name: rental.pickup_person_name || "",
                vehicle_type: rental.vehicle_type || "",
                plate_number: rental.plate_number || "",
                rented_date: rental.rented_date ? new Date(rental.rented_date).toISOString().split('T')[0] : "",
            });
        }
    }, [rental]);

    const handleUpdate = async () => {
        if (!rental || !formData) return;
        setLoading(true);

        try {
            // Calculate totals
            const numScaffoldings = formData.num_scaffoldings || 0;
            const pricePerScaffolding = formData.price_per_scaffolding || 0;
            const expectedDays = formData.expected_days || 0;
            const paidDays = formData.paid_days || 0;

            const totalPaid = numScaffoldings * pricePerScaffolding * paidDays;
            const totalCost = numScaffoldings * pricePerScaffolding * expectedDays;
            const balanceDue = totalCost - totalPaid;

            // Update client
            const { error: clientError } = await supabase
                .from("clients")
                .update({
                    name: formData.name,
                    nickname: formData.nickname || null,
                    phone: formData.phone || null,
                    id_tin_no: formData.id_tin_no || null,
                })
                .eq("id", rental.client_id);

            if (clientError) throw clientError;

            // Update rental
            const { error: rentalError } = await supabase
                .from("rentals")
                .update({
                    num_scaffoldings: formData.num_scaffoldings,
                    num_chopsticks: formData.num_chopsticks,
                    plates: formData.plates,
                    timbers: formData.timbers,
                    connectors: formData.connectors,
                    legs: formData.legs,
                    tubes_6m: formData.tubes_6m,
                    tubes_4m: formData.tubes_4m,
                    tubes_3m: formData.tubes_3m,
                    tubes_1m: formData.tubes_1m,
                    price_per_scaffolding: formData.price_per_scaffolding,
                    expected_days: formData.expected_days,
                    paid_days: formData.paid_days,
                    total_paid: totalPaid,
                    balance_due: balanceDue,
                    pickup_person_name: formData.pickup_person_name,
                    vehicle_type: formData.vehicle_type,
                    plate_number: formData.plate_number,
                    rented_date: formData.rented_date,
                })
                .eq("id", rental.id);

            if (rentalError) throw rentalError;

            toast({
                title: "Success",
                description: "Rental updated successfully",
            });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Rental Update Error:", error);
            toast({
                title: "Error",
                description: error.details || error.message || "Failed to update rental",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!formData) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Rental - {formData.name}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-1">Client Data</h3>
                        <div>
                            <Label>Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Nickname</Label>
                            <Input
                                value={formData.nickname}
                                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Phone</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>ID/TIN No</Label>
                            <Input
                                value={formData.id_tin_no}
                                onChange={(e) => setFormData({ ...formData, id_tin_no: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-1">Logistics & Date</h3>
                        <div>
                            <Label>Rented Date</Label>
                            <Input
                                type="date"
                                value={formData.rented_date}
                                onChange={(e) => setFormData({ ...formData, rented_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Pickup Person</Label>
                            <Input
                                value={formData.pickup_person_name}
                                onChange={(e) => setFormData({ ...formData, pickup_person_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Vehicle Type</Label>
                            <Input
                                value={formData.vehicle_type}
                                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Plate Number</Label>
                            <Input
                                value={formData.plate_number}
                                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 md:col-span-2">
                        <h3 className="font-semibold border-b pb-1">Equipment</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {["scaffoldings", "chopsticks", "plates", "timbers", "connectors", "legs"].map((field) => (
                                <div key={field}>
                                    <Label className="capitalize">{field}</Label>
                                    <Input
                                        type="number"
                                        value={formData[`num_${field}`] ?? formData[field] ?? 0}
                                        onChange={(e) => {
                                            const key = field === "scaffoldings" || field === "chopsticks" ? `num_${field}` : field;
                                            setFormData({ ...formData, [key]: parseInt(e.target.value) || 0 });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 md:col-span-2">
                        <h3 className="font-semibold border-b pb-1">Price & Deal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label>Price per Scaffold</Label>
                                <Input
                                    type="number"
                                    value={formData.price_per_scaffolding}
                                    onChange={(e) => setFormData({ ...formData, price_per_scaffolding: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <Label>Expected Days</Label>
                                <Input
                                    type="number"
                                    value={formData.expected_days}
                                    onChange={(e) => setFormData({ ...formData, expected_days: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <Label>Paid Days</Label>
                                <Input
                                    type="number"
                                    value={formData.paid_days}
                                    onChange={(e) => setFormData({ ...formData, paid_days: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleUpdate} disabled={loading}>
                        {loading ? "Updating..." : "Update Rental"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
