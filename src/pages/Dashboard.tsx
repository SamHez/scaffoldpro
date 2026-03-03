import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Package, ArrowLeft, AlertCircle, Search, FileText, Trash2, Warehouse, Layers, CheckCircle2, Plus } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency, cn } from "@/lib/utils";
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

const Dashboard = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRental, setSelectedRental] = useState<any | null>(null);
  const [returnData, setReturnData] = useState<Record<string, any>>({});
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRentalForDetails, setSelectedRentalForDetails] = useState<any | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInventory = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("item_name");

    if (error) {
      console.error("Error fetching inventory:", error);
    } else {
      setInventory(data || []);
    }
  }, []);

  const fetchRentals = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        clients (*),
        profiles (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch rentals",
        variant: "destructive",
      });
    } else {
      setRentals(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchRentals();
    fetchInventory();
  }, [fetchRentals, fetchInventory]);

  const handleDeleteRental = async (rentalId: string) => {
    setIsDeleting(true);
    const { error } = await supabase
      .from("rentals")
      .delete()
      .eq("id", rentalId);

    setIsDeleting(false);
    setRentalToDelete(null);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete rental",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Rental deleted successfully",
      });
      fetchRentals();
      fetchInventory();
    }
  };

  const handleReturnRental = async (rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    const { error } = await supabase
      .from("rentals")
      .update({
        status: "RETURNED",
        returned_date: new Date().toISOString(),
        returned_num_scaffoldings: rental.num_scaffoldings,
        returned_num_chopsticks: rental.num_chopsticks,
        returned_plates: rental.plates,
        returned_timbers: rental.timbers,
        returned_connectors: rental.connectors,
        returned_legs: rental.legs,
        returned_tubes_6m: rental.tubes_6m,
        returned_tubes_4m: rental.tubes_4m,
        returned_tubes_3m: rental.tubes_3m,
        returned_tubes_1m: rental.tubes_1m,
      })
      .eq("id", rentalId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update rental",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Rental marked as returned",
      });
      fetchRentals();
      fetchInventory();
    }
  };

  const handlePartialReturn = async () => {
    if (!selectedRental) return;

    try {
      const isComplete =
        (returnData.returned_num_scaffoldings || 0) >= selectedRental.num_scaffoldings &&
        (returnData.returned_num_chopsticks || 0) >= selectedRental.num_chopsticks &&
        (returnData.returned_plates || 0) >= selectedRental.plates &&
        (returnData.returned_timbers || 0) >= selectedRental.timbers &&
        (returnData.returned_connectors || 0) >= selectedRental.connectors &&
        (returnData.returned_legs || 0) >= selectedRental.legs;

      const { error } = await supabase
        .from("rentals")
        .update({
          returned_num_scaffoldings: returnData.returned_num_scaffoldings || 0,
          returned_num_chopsticks: returnData.returned_num_chopsticks || 0,
          returned_plates: returnData.returned_plates || 0,
          returned_timbers: returnData.returned_timbers || 0,
          returned_connectors: returnData.returned_connectors || 0,
          returned_legs: returnData.returned_legs || 0,
          returned_tubes_6m: returnData.returned_tubes_6m || 0,
          returned_tubes_4m: returnData.returned_tubes_4m || 0,
          returned_tubes_3m: returnData.returned_tubes_3m || 0,
          returned_tubes_1m: returnData.returned_tubes_1m || 0,
          total_paid: returnData.total_paid || 0,
          balance_due: returnData.balance_due || 0,
          returned_date: returnData.returned_date || new Date().toISOString(),
          status: isComplete ? "RETURNED" : "RENTED",
        })
        .eq("id", selectedRental.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: isComplete ? "Rental completed and returned" : "Partial return recorded successfully",
      });

      setIsReturnDialogOpen(false);
      setSelectedRental(null);
      setReturnData({});
      fetchRentals();
      fetchInventory();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const isOverdue = (rental: {
    status: string;
    balance_due?: number;
    rented_date: string;
    expected_days?: number;
  }) => {
    if (rental.status === "RETURNED") return false;
    const balanceDue = rental.balance_due || 0;
    if (balanceDue > 0) return true;

    const rentedDate = new Date(rental.rented_date);
    const expectedDays = rental.expected_days || 0;
    const today = new Date();
    const daysPassed = differenceInDays(today, rentedDate);

    return daysPassed > expectedDays;
  };

  const RentalCard = ({ rental, showReturnButton }: { rental: any; showReturnButton: boolean }) => {
    const overdue = isOverdue(rental);
    const hasPartialReturn = (rental.returned_num_scaffoldings || 0) > 0 ||
      (rental.returned_num_chopsticks || 0) > 0 ||
      (rental.returned_plates || 0) > 0;

    return (
      <Card className={cn("transition-all duration-200", overdue ? "border-destructive border-2 bg-destructive/5" : "border-sidebar-border shadow-sm")}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className={cn("h-5 w-5", overdue ? "text-destructive" : "text-primary")} />
                <span className={overdue ? "text-destructive font-bold" : ""}>
                  {rental.clients?.nickname || rental.clients?.name || "Client"}
                </span>
                {overdue && <AlertCircle className="h-4 w-4 text-destructive fill-destructive/10" />}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {rental.clients?.phone} • {rental.clients?.id_tin_no}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant={rental.status === "RENTED" ? "default" : "secondary"} className="text-[10px]">
                  {rental.status}
                </Badge>
                {overdue && (
                  <Badge variant="destructive" className="animate-pulse text-[10px]">
                    OVERDUE / UNPAID
                  </Badge>
                )}
                {hasPartialReturn && (
                  <Badge variant="outline" className="text-[10px]">
                    Partial Return
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setSelectedRentalForDetails(rental);
                  setIsDetailsDialogOpen(true);
                }}
              >
                <Search className="h-3.5 w-3.5 mr-1" />
                Details
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setRentalToDelete(rental.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs border-t pt-3">
            <div>
              <p className="text-muted-foreground">Scaffoldings</p>
              <p className="font-semibold">
                {rental.num_scaffoldings}
                {rental.returned_num_scaffoldings > 0 && (
                  <span className="text-muted-foreground text-[10px] ml-1">
                    ({rental.returned_num_scaffoldings} ret)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Chopsticks</p>
              <p className="font-semibold">
                {rental.num_chopsticks}
                {rental.returned_num_chopsticks > 0 && (
                  <span className="text-muted-foreground text-[10px] ml-1">
                    ({rental.returned_num_chopsticks} ret)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Plates</p>
              <p className="font-semibold">
                {rental.plates}
                {rental.returned_plates > 0 && (
                  <span className="text-muted-foreground text-[10px] ml-1">
                    ({rental.returned_plates} ret)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Price/Scaffold</p>
              <p className="font-semibold">{formatCurrency(rental.price_per_scaffolding || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Paid</p>
              <p className="font-semibold text-emerald-600">{formatCurrency(rental.total_paid || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Balance</p>
              <p className={cn("font-semibold", (rental.balance_due || 0) > 0 ? "text-destructive" : "text-emerald-600")}>
                {formatCurrency(rental.balance_due || 0)}
              </p>
            </div>
          </div>

          <div className="border-t pt-3 text-[10px] space-y-1 text-muted-foreground">
            <p>
              Vehicle: <span className="font-medium text-foreground">{rental.vehicle_type}</span>
              {rental.plate_number && ` • ${rental.plate_number}`}
            </p>
            <p>
              Rented: <span className="font-medium text-foreground">
                {format(new Date(rental.rented_date), "PP")}
              </span>
            </p>
          </div>

          {showReturnButton && (
            <div className="flex gap-2 pt-2 border-t">
              <Dialog open={isReturnDialogOpen && selectedRental?.id === rental.id} onOpenChange={setIsReturnDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-xs"
                    onClick={() => {
                      setSelectedRental(rental);
                      setIsReturnDialogOpen(true);
                      setReturnData({
                        returned_num_scaffoldings: rental.returned_num_scaffoldings || 0,
                        returned_num_chopsticks: rental.returned_num_chopsticks || 0,
                        returned_plates: rental.returned_plates || 0,
                        returned_timbers: rental.returned_timbers || 0,
                        returned_connectors: rental.returned_connectors || 0,
                        returned_legs: rental.returned_legs || 0,
                        returned_tubes_6m: rental.returned_tubes_6m || 0,
                        returned_tubes_4m: rental.returned_tubes_4m || 0,
                        returned_tubes_3m: rental.returned_tubes_3m || 0,
                        returned_tubes_1m: rental.returned_tubes_1m || 0,
                        total_paid: rental.total_paid || 0,
                        balance_due: rental.balance_due || 0,
                        returned_date: rental.returned_date || new Date().toISOString().split('T')[0],
                      });
                    }}
                  >
                    Partial Return
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Record Partial Return - {rental.clients?.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Return Date</Label>
                        <Input
                          type="date"
                          value={returnData.returned_date || ""}
                          onChange={(e) => setReturnData({ ...returnData, returned_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Returned Scaffoldings (of {rental.num_scaffoldings})</Label>
                        <Input
                          type="number"
                          value={returnData.returned_num_scaffoldings || 0}
                          onChange={(e) => setReturnData({ ...returnData, returned_num_scaffoldings: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Returned Chopsticks (of {rental.num_chopsticks})</Label>
                        <Input
                          type="number"
                          value={returnData.returned_num_chopsticks || 0}
                          onChange={(e) => setReturnData({ ...returnData, returned_num_chopsticks: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Returned Plates (of {rental.plates})</Label>
                        <Input
                          type="number"
                          value={returnData.returned_plates || 0}
                          onChange={(e) => setReturnData({ ...returnData, returned_plates: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                      <div>
                        <Label>Total Paid (FRW)</Label>
                        <Input
                          type="number"
                          value={returnData.total_paid || 0}
                          onChange={(e) => setReturnData({ ...returnData, total_paid: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Balance Due (FRW)</Label>
                        <Input
                          type="number"
                          value={returnData.balance_due || 0}
                          onChange={(e) => setReturnData({ ...returnData, balance_due: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <Button onClick={handlePartialReturn} className="w-full">
                      Update Partial Return
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                size="sm"
                className="flex-1 h-9 text-xs"
                onClick={() => handleReturnRental(rental.id)}
              >
                Mark Full Return
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const KPICard = ({ title, value, icon: Icon, color, subtext, editable, onUpdate }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    subtext: string;
    editable?: boolean;
    onUpdate?: (val: string) => void
  }) => (
    <Card className="overflow-hidden border-none shadow-md bg-white/50 backdrop-blur-sm group hover:shadow-lg transition-all duration-300">
      <div className={cn("h-1 w-full", color)} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className={cn("p-2 rounded-lg bg-opacity-10", color.replace('bg-', 'bg-opacity-10 text-'))}>
            <Icon className={cn("h-5 w-5", color.replace('bg-', 'text-'))} />
          </div>
          {editable && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Update {title}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">New Total Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      defaultValue={value}
                      className="col-span-3"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onUpdate((e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                  </div>
                  <Button onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement);
                    onUpdate(input.value);
                  }}>
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{subtext}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const handleUpdateStock = async (newStock: string) => {
    const stock = parseInt(newStock);
    if (isNaN(stock)) return;

    // Use upsert to create the record if it doesn't exist
    const { error } = await supabase
      .from("inventory")
      .upsert({
        item_name: "Scaffoldings",
        total_stock: stock,
        available_stock: stock
      }, { onConflict: 'item_name' });

    if (error) {
      console.error("Upsert error:", error);
      toast({
        title: "Error",
        description: "Failed to update stock: " + error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Stock updated successfully",
      });
      fetchInventory();
    }
  };

  const filteredRentals = rentals.filter((rental) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const client = rental.clients || {};
    return (
      client.name?.toLowerCase().includes(query) ||
      client.nickname?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query) ||
      rental.vehicle_type?.toLowerCase().includes(query) ||
      rental.plate_number?.toLowerCase().includes(query)
    );
  });

  const rentedItems = filteredRentals.filter((r) => r.status === "RENTED");
  const returnedItems = filteredRentals.filter((r) => r.status === "RETURNED");
  const scaffoldStock = inventory.find(i => i.item_name === "Scaffoldings") || { total_stock: 0, available_stock: 0 };

  // Calculate currently rented: sum of (total - returned) for all NON-returned rentals
  const rentedScaffoldings = rentals
    .filter(r => r.status !== "RETURNED")
    .reduce((acc, r) => acc + (r.num_scaffoldings - (r.returned_num_scaffoldings || 0)), 0);

  const availableInStock = Math.max(0, scaffoldStock.total_stock - rentedScaffoldings);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Total Stock"
          value={scaffoldStock.total_stock}
          icon={Warehouse}
          color="bg-blue-500"
          subtext="Total quantity owned"
          editable={true}
          onUpdate={handleUpdateStock}
        />
        <KPICard
          title="Currently Rented"
          value={rentedScaffoldings}
          icon={Layers}
          color="bg-amber-500"
          subtext="Total scaffolding units out"
        />
        <KPICard
          title="Available in Stock"
          value={availableInStock}
          icon={CheckCircle2}
          color="bg-emerald-500"
          subtext="Ready for new rentals"
        />
      </div>

      <Tabs defaultValue="rented" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="rented" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Rented ({rentedItems.length})
          </TabsTrigger>
          <TabsTrigger value="returned" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Returned ({returnedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rented" className="space-y-4 pt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="h-48 animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : rentedItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No active rentals found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rentedItems.map((rental) => (
                <RentalCard key={rental.id} rental={rental} showReturnButton={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="returned" className="space-y-4 pt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="h-48 animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : returnedItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No returned rentals found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {returnedItems.map((rental) => (
                <RentalCard key={rental.id} rental={rental} showReturnButton={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Rental Details - {selectedRentalForDetails?.clients?.nickname || selectedRentalForDetails?.clients?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedRentalForDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-1">Client Information</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Full Name:</p>
                    <p className="font-medium">{selectedRentalForDetails.clients?.name}</p>
                    <p className="text-muted-foreground">Nickname/ID:</p>
                    <p className="font-medium">{selectedRentalForDetails.clients?.nickname || "N/A"}</p>
                    <p className="text-muted-foreground">Phone:</p>
                    <p className="font-medium">{selectedRentalForDetails.clients?.phone}</p>
                    <p className="text-muted-foreground">ID/TIN No:</p>
                    <p className="font-medium">{selectedRentalForDetails.clients?.id_tin_no}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-1">Scaffolding Details</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Scaffoldings:</p>
                    <p className="font-medium">{selectedRentalForDetails.num_scaffoldings} (Returned: {selectedRentalForDetails.returned_num_scaffoldings || 0})</p>
                    <p className="text-muted-foreground">Chopsticks:</p>
                    <p className="font-medium">{selectedRentalForDetails.num_chopsticks} (Returned: {selectedRentalForDetails.returned_num_chopsticks || 0})</p>
                    <p className="text-muted-foreground">Plates:</p>
                    <p className="font-medium">{selectedRentalForDetails.plates} (Returned: {selectedRentalForDetails.returned_plates || 0})</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-1">Financial Summary</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Price/Scaffold:</p>
                    <p className="font-medium">{formatCurrency(selectedRentalForDetails.price_per_scaffolding || 0)}</p>
                    <p className="text-muted-foreground">Total Paid:</p>
                    <p className="font-medium text-emerald-600">{formatCurrency(selectedRentalForDetails.total_paid || 0)}</p>
                    <p className="text-muted-foreground">Balance Due:</p>
                    <p className={cn("font-medium", selectedRentalForDetails.balance_due > 0 ? "text-destructive" : "text-emerald-600")}>
                      {formatCurrency(selectedRentalForDetails.balance_due || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-1">Logistics</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Pickup Person:</p>
                    <p className="font-medium">{selectedRentalForDetails.pickup_person_name}</p>
                    <p className="text-muted-foreground">Vehicle:</p>
                    <p className="font-medium">{selectedRentalForDetails.vehicle_type} {selectedRentalForDetails.plate_number && `(${selectedRentalForDetails.plate_number})`}</p>
                    <p className="text-muted-foreground">Rented Date:</p>
                    <p className="font-medium">{format(new Date(selectedRentalForDetails.rented_date), "PPP")}</p>
                    {selectedRentalForDetails.returned_date && (
                      <>
                        <p className="text-muted-foreground">Returned Date:</p>
                        <p className="font-medium">{format(new Date(selectedRentalForDetails.returned_date), "PPP")}</p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-1">Document</h3>
                  {selectedRentalForDetails.document_image_url ? (
                    <div className="rounded-lg border overflow-hidden mt-2">
                      <img
                        src={selectedRentalForDetails.document_image_url}
                        alt="Rental ID"
                        className="w-full h-auto object-contain max-h-[300px]"
                      />
                      <div className="p-2 bg-muted/50 flex justify-end">
                        <Button size="sm" variant="outline" asChild>
                          <a href={selectedRentalForDetails.document_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            View Full File
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20 mt-2">
                      <FileText className="h-8 w-8 mb-2 opacity-20" />
                      <span className="text-xs">No file uploaded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!rentalToDelete} onOpenChange={(open) => !open && setRentalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the rental record
              and any associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => rentalToDelete && handleDeleteRental(rentalToDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
