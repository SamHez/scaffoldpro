import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Package, Pencil, ArrowLeft, AlertCircle, Search, FileText, Trash2, Warehouse, Layers, CheckCircle2, Plus } from "lucide-react";
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
import { EditRentalDialog } from "@/components/dashboard/EditRentalDialog";


interface KPICardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  subtext: string;
  editable?: boolean;
  onUpdate?: (val: string) => void;
}

const KPICard = ({ title, value, icon: Icon, color, subtext, editable, onUpdate }: KPICardProps) => (
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
                        onUpdate?.((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                </div>
                <Button onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement);
                  onUpdate?.(input.value);
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
          <span className="text-2xl font-bold tracking-tight">
            {title.toLowerCase().includes('demand') ? formatCurrency(value) : value.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{subtext}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const getRentalStatus = (rental: any) => {
  if (rental.status === "RETURNED") return { isLate: false, hasBalance: false };

  const rentedDate = new Date(rental.rented_date);
  const expectedDays = rental.expected_days || 0;
  const today = new Date();
  const daysPassed = Math.floor((today.getTime() - rentedDate.getTime()) / (1000 * 60 * 60 * 24));

  const isLate = daysPassed > expectedDays;
  const hasBalance = (rental.balance_due || 0) > 0;

  return { isLate, hasBalance };
};

const calculateBillableDaysPassed = (startDate: string, endDate: string | null, billableDays: string[] | null) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0); // Start of day
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999); // End of day

  // If no billable days specified, default to all 7
  const activeDays = billableDays && billableDays.length > 0
    ? billableDays
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const billableIndices = activeDays.map(d => dayNames.indexOf(d));

  let count = 0;
  let current = new Date(start);
  while (current <= end) {
    if (billableIndices.includes(current.getDay())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const getDynamicBalance = (rental: any) => {
  const billableDaysPassed = calculateBillableDaysPassed(
    rental.rented_date,
    rental.returned_date,
    rental.billable_days
  );

  const dailyRate = (rental.num_scaffoldings || 0) * (rental.price_per_scaffolding || 0);
  const totalCostToDate = dailyRate * billableDaysPassed;
  const balance = totalCostToDate - (rental.total_paid || 0);

  return Math.max(0, balance);
};

interface RentalCardProps {
  rental: any;
  showReturnButton: boolean;
  isReturnDialogOpen: boolean;
  setIsReturnDialogOpen: (open: boolean) => void;
  selectedRental: any | null;
  setSelectedRental: (rental: any | null) => void;
  returnData: Record<string, any>;
  setReturnData: (data: Record<string, any>) => void;
  handleReturnRental: (id: string) => void;
  handlePartialReturn: () => void;
  setRentalToDelete: (id: string | null) => void;
  setIsDetailsDialogOpen: (open: boolean) => void;
  setSelectedRentalForDetails: (rental: any | null) => void;
  onEdit?: (rental: any) => void;
}

const RentalCard = ({
  rental,
  showReturnButton,
  isReturnDialogOpen,
  setIsReturnDialogOpen,
  selectedRental,
  setSelectedRental,
  returnData,
  setReturnData,
  handleReturnRental,
  handlePartialReturn,
  setRentalToDelete,
  setIsDetailsDialogOpen,
  setSelectedRentalForDetails,
  onEdit,
}: RentalCardProps) => {
  const status = getRentalStatus(rental);
  const currentBalance = getDynamicBalance(rental);
  const dailyRate = (rental.num_scaffoldings || 0) * (rental.price_per_scaffolding || 0);
  const isPartial = 
    (rental.returned_num_scaffoldings > 0) || 
    (rental.returned_num_chopsticks > 0) || 
    (rental.returned_plates > 0) || 
    (rental.returned_timbers > 0) || 
    (rental.returned_connectors > 0) || 
    (rental.returned_legs > 0) || 
    (rental.returned_ladders > 0) || 
    (rental.returned_joints > 0) || 
    (rental.returned_wheels > 0) || 
    (rental.returned_tubes_6m > 0) || 
    (rental.returned_tubes_4m > 0) || 
    (rental.returned_tubes_3m > 0) || 
    (rental.returned_tubes_1m > 0);

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 relative bg-white border-2",
      status.isLate 
        ? "border-red-500 bg-gradient-to-br from-red-50/40 to-white" 
        : "border-slate-100 hover:border-slate-300 shadow-sm hover:shadow-md"
    )}>
      <CardHeader className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex min-w-0 items-start gap-2">
              <Package className={cn("mt-1 h-4 w-4 shrink-0", status.isLate ? "text-red-500" : "text-[#0F172A]")} />
              <h3 className="min-w-0 flex-1 break-words text-lg font-black leading-tight text-slate-900 sm:text-xl">
                {rental.clients?.nickname || rental.clients?.name || "Client"}
              </h3>
              {status.isLate && <AlertCircle className="mt-1 h-4 w-4 shrink-0 animate-pulse text-red-500" />}
            </div>
            <div className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-[11px]">
              <span>{rental.clients?.phone || "No phone"}</span>
              <span className="opacity-60">{rental.clients?.id_tin_no || "No TIN"}</span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:max-w-[50%] sm:items-end">
            <div className="flex w-full items-center justify-between gap-1 rounded-2xl border border-slate-100 bg-slate-50/50 p-1 shadow-sm sm:w-auto sm:justify-end sm:rounded-full">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full text-slate-400 transition-all hover:bg-white hover:text-[#0F172A] hover:shadow-sm"
                onClick={() => {
                  setSelectedRentalForDetails(rental);
                  setIsDetailsDialogOpen(true);
                }}
                title="Details"
              >
                <Search className="h-4 w-4" />
              </Button>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full text-slate-400 transition-all hover:bg-white hover:text-emerald-600 hover:shadow-sm"
                  onClick={() => onEdit(rental)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full text-slate-400 transition-all hover:bg-white hover:text-red-600 hover:shadow-sm"
                onClick={() => setRentalToDelete(rental.id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Badge className={cn(
                "h-auto whitespace-nowrap border-none px-3 py-1 text-[10px] font-black tracking-widest shadow-sm",
                rental.status === "RETURNED" ? "bg-emerald-500 text-white" : "bg-slate-900 text-white"
              )}>
                {rental.status}
              </Badge>
              {status.isLate && (
                <Badge className="h-auto whitespace-nowrap border-none bg-red-500 px-3 py-1 text-[10px] font-black tracking-widest text-white shadow-md shadow-red-200 animate-pulse">
                  OVERDUE
                </Badge>
              )}
              {isPartial && (
                <Badge className="h-auto whitespace-nowrap border-none bg-blue-100 px-3 py-1 text-[10px] font-black tracking-widest text-blue-700">
                  PARTIAL
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-0 p-4 pt-0 sm:p-5 sm:pt-0">
        {/* Row 1: Equipment Breakdown */}
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 py-3 sm:grid-cols-2 sm:gap-8">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/70 px-3 py-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 sm:text-[10px]">Scaffoldings</span>
            <span className="shrink-0 text-xs font-bold text-slate-900 sm:text-sm">
              {rental.num_scaffoldings}
              {rental.returned_num_scaffoldings > 0 && (
                <span className="text-emerald-600 ml-1">(-{rental.returned_num_scaffoldings})</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/70 px-3 py-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 sm:text-[10px]">Chopsticks</span>
            <span className="shrink-0 text-xs font-bold text-slate-900 sm:text-sm">
              {rental.num_chopsticks}
              {rental.returned_num_chopsticks > 0 && (
                <span className="text-emerald-600 ml-1">(-{rental.returned_num_chopsticks})</span>
              )}
            </span>
          </div>
        </div>

        {/* Row 2: Financials Summary */}
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 py-3 sm:grid-cols-2 sm:gap-8">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/70 px-3 py-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 sm:text-[10px]">Daily Demand</span>
            <span className="shrink-0 text-xs font-bold text-slate-900 sm:text-sm">{formatCurrency(dailyRate)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/70 px-3 py-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 sm:text-[10px]">Paid</span>
            <span className="shrink-0 text-xs font-bold text-emerald-600 sm:text-sm">{formatCurrency(rental.total_paid || 0)}</span>
          </div>
        </div>

        {/* Row 3: Balance Highlight */}
        <div className="mx-0 flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-3 sm:-mx-2 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-[10px]">Current Balance</span>
          <span className={cn(
            "break-words text-xl font-black leading-tight sm:text-right",
            currentBalance > 0 ? "text-red-600" : "text-emerald-600"
          )}>
            {formatCurrency(currentBalance)}
          </span>
        </div>

        {/* Row 4: Logistics info */}
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 py-3 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-0.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 sm:text-[9px]">Logistics</p>
            <p className="break-words text-[10px] font-bold text-slate-700 sm:text-xs">
              {rental.vehicle_type || "N/A"} {rental.plate_number ? `• ${rental.plate_number}` : ""}
            </p>
          </div>
          <div className="space-y-0.5 sm:text-right">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 sm:text-[9px]">Rental Date</p>
            <p className="text-[10px] font-bold text-slate-700 sm:text-xs">
              {format(new Date(rental.rented_date), "MMM dd, yyyy")}
            </p>
          </div>
        </div>

        {showReturnButton && (
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4">
            <Dialog open={isReturnDialogOpen && selectedRental?.id === rental.id} onOpenChange={setIsReturnDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-12 w-full flex-1 rounded-2xl border-slate-200 font-bold text-[#0F172A] transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
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
                      returned_ladders: rental.returned_ladders || 0,
                      returned_joints: rental.returned_joints || 0,
                      returned_wheels: rental.returned_wheels || 0,
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
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-slate-900">Record Partial Return - {rental.clients?.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-8 py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Return Date</Label>
                      <Input
                        type="date"
                        className="h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-1"
                        value={returnData.returned_date || ""}
                        onChange={(e) => setReturnData({ ...returnData, returned_date: e.target.value })}
                      />
                    </div>
                    {[
                      { key: "returned_num_scaffoldings", label: "Scaffoldings", max: rental.num_scaffoldings },
                      { key: "returned_num_chopsticks", label: "Chopsticks", max: rental.num_chopsticks },
                      { key: "returned_plates", label: "Plates", max: rental.plates },
                      { key: "returned_timbers", label: "Timbers", max: rental.timbers },
                      { key: "returned_connectors", label: "Connectors", max: rental.connectors },
                      { key: "returned_legs", label: "Legs", max: rental.legs },
                      { key: "returned_ladders", label: "Ladders", max: rental.ladders },
                      { key: "returned_joints", label: "Joints", max: rental.joints },
                      { key: "returned_wheels", label: "Wheels", max: rental.wheels },
                      { key: "returned_tubes_6m", label: "Tubes 6m", max: rental.tubes_6m },
                      { key: "returned_tubes_4m", label: "Tubes 4m", max: rental.tubes_4m },
                      { key: "returned_tubes_3m", label: "Tubes 3m", max: rental.tubes_3m },
                      { key: "returned_tubes_1m", label: "Tubes 1m", max: rental.tubes_1m },
                    ].map((item) => (
                      <div key={item.key} className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label} (Max: {item.max})</Label>
                        <Input
                          type="number"
                          min="0"
                          max={item.max}
                          className="h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-1 font-bold"
                          value={returnData[item.key] || 0}
                          onChange={(e) => setReturnData({ ...returnData, [item.key]: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-8 border-t border-slate-100">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Paid (FRW)</Label>
                      <Input
                        type="number"
                        className="h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-1 font-bold text-emerald-600"
                        value={returnData.total_paid || 0}
                        onChange={(e) => setReturnData({ ...returnData, total_paid: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Balance Due (FRW)</Label>
                      <Input
                        type="number"
                        className="h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-1 font-bold text-red-600"
                        value={returnData.balance_due || 0}
                        onChange={(e) => setReturnData({ ...returnData, balance_due: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handlePartialReturn}
                    className="w-full bg-[#0F172A] hover:bg-slate-800 text-white rounded-2xl h-14 font-bold text-lg shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                  >
                    Update Partial Return
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              size="sm"
              className="h-12 w-full flex-1 rounded-2xl bg-[#0F172A] font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-[0.98]"
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

const Dashboard = () => {

  const { searchQuery, setSearchQuery, profile } = useOutletContext<{ searchQuery: string; setSearchQuery: React.Dispatch<React.SetStateAction<string>>; profile: any }>();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRental, setSelectedRental] = useState<any | null>(null);
  const [returnData, setReturnData] = useState<Record<string, any>>({});
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRentalForDetails, setSelectedRentalForDetails] = useState<any | null>(null);
  const [selectedRentalForEdit, setSelectedRentalForEdit] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInventory = React.useCallback(async () => {
    if (!profile?.organization_id) return;
    const { data, error } = await (supabase
      .from("inventory") as any)
      .select("*")
      .eq("organization_id", profile?.organization_id)
      .order("item_name");

    if (error) {
      console.error("Error fetching inventory:", error);
    } else {
      setInventory(data || []);
    }
  }, [profile?.organization_id]);

  const fetchRentals = React.useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data, error } = await (supabase
      .from("rentals") as any)
      .select(`
        *,
        clients (*),
        profiles (*)
      `)
      .eq("organization_id", profile?.organization_id)
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
  }, [toast, profile?.organization_id]);

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
      console.error("Delete Error:", error);
      toast({
        title: "Error",
        description: error.details || error.message || "Failed to delete rental",
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
        returned_ladders: rental.ladders || 0,
        returned_joints: rental.joints || 0,
        returned_wheels: rental.wheels || 0,
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
        (returnData.returned_timbers || 0) >= (selectedRental.timbers || 0) &&
        (returnData.returned_connectors || 0) >= (selectedRental.connectors || 0) &&
        (returnData.returned_legs || 0) >= (selectedRental.legs || 0) &&
        (returnData.returned_ladders || 0) >= (selectedRental.ladders || 0) &&
        (returnData.returned_joints || 0) >= (selectedRental.joints || 0) &&
        (returnData.returned_wheels || 0) >= (selectedRental.wheels || 0) &&
        (returnData.returned_tubes_6m || 0) >= (selectedRental.tubes_6m || 0) &&
        (returnData.returned_tubes_4m || 0) >= (selectedRental.tubes_4m || 0) &&
        (returnData.returned_tubes_3m || 0) >= (selectedRental.tubes_3m || 0) &&
        (returnData.returned_tubes_1m || 0) >= (selectedRental.tubes_1m || 0);

      const { error } = await (supabase
        .from("rentals") as any)
        .update({
          returned_num_scaffoldings: returnData.returned_num_scaffoldings || 0,
          returned_num_chopsticks: returnData.returned_num_chopsticks || 0,
          returned_plates: returnData.returned_plates || 0,
          returned_timbers: returnData.returned_timbers || 0,
          returned_connectors: returnData.returned_connectors || 0,
          returned_legs: returnData.returned_legs || 0,
          returned_ladders: returnData.returned_ladders || 0,
          returned_joints: returnData.returned_joints || 0,
          returned_wheels: returnData.returned_wheels || 0,
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



  const handleUpdateStock = async (newStock: string) => {
    const stock = parseInt(newStock);
    if (isNaN(stock)) return;

    // Use upsert to create the record if it doesn't exist
    const { error } = await (supabase
      .from("inventory") as any)
      .upsert({
        item_name: "Scaffoldings",
        total_stock: stock,
        available_stock: stock,
        organization_id: profile.organization_id
      }, { onConflict: ['organization_id', 'item_name'] });

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

  // Helper to calculate total items out across all rentals
  const getCurrentlyRented = (items: any[], field: string, returnedField: string) => {
    return items.reduce((acc, r) => {
      const rented = (r[field] || 0) - (r[returnedField] || 0);
      return acc + Math.max(0, rented);
    }, 0);
  };

  // Filter active rentals to match the 'Rented' tab
  const activeRentals = rentals.filter(r => r.status === "RENTED");

  // Calculate total, returned, and net for active rentals
  const totalScaffoldingInActive = activeRentals.reduce((acc, r) => acc + (r.num_scaffoldings || 0), 0);
  const returnedScaffoldingInActive = activeRentals.reduce((acc, r) => acc + (r.returned_num_scaffoldings || 0), 0);
  const netScaffoldingsOut = totalScaffoldingInActive - returnedScaffoldingInActive;

  // Other equipment (net) for active rentals only
  const rentedChopsticks = getCurrentlyRented(activeRentals, "num_chopsticks", "returned_num_chopsticks");
  const rentedPlates = getCurrentlyRented(activeRentals, "plates", "returned_plates");
  const rentedTimbers = getCurrentlyRented(activeRentals, "timbers", "returned_timbers");
  const rentedConnectors = getCurrentlyRented(activeRentals, "connectors", "returned_connectors");
  const rentedLegs = getCurrentlyRented(activeRentals, "legs", "returned_legs");
  const rentedLadders = getCurrentlyRented(activeRentals, "ladders", "returned_ladders");
  const rentedJoints = getCurrentlyRented(activeRentals, "joints", "returned_joints");
  const rentedWheels = getCurrentlyRented(activeRentals, "wheels", "returned_wheels");
  const rentedTubes6m = getCurrentlyRented(activeRentals, "tubes_6m", "returned_tubes_6m");
  const rentedTubes4m = getCurrentlyRented(activeRentals, "tubes_4m", "returned_tubes_4m");
  const rentedTubes3m = getCurrentlyRented(activeRentals, "tubes_3m", "returned_tubes_3m");
  const rentedTubes1m = getCurrentlyRented(activeRentals, "tubes_1m", "returned_tubes_1m");

  // Inventory available is based on what's physically out (net)
  const availableInStock = Math.max(0, (scaffoldStock.total_stock || 0) - netScaffoldingsOut);

  // Financial Demand Calculation (Sum of all dynamic balances for active rentals)
  const totalDemand = rentals
    .filter(r => r.status === "RENTED")
    .reduce((acc, r) => acc + getDynamicBalance(r), 0);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          value={netScaffoldingsOut}
          icon={Layers}
          color="bg-amber-500"
          subtext={`${totalScaffoldingInActive} total - ${returnedScaffoldingInActive} returned`}
        />
        <KPICard
          title="Available in Stock"
          value={availableInStock}
          icon={CheckCircle2}
          color="bg-emerald-500"
          subtext="Ready for new rentals"
        />
        <KPICard
          title="Total Demand Today"
          value={Math.round(totalDemand)}
          icon={FileText}
          color="bg-indigo-500"
          subtext=""
        />
      </div>

      <Card className="bg-white/40 backdrop-blur-sm border-none shadow-sm overflow-hidden hidden">
        <div className="h-1 w-full bg-amber-500/20" />
        <CardHeader className="py-3 px-6">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-500" />
            Active Equipment Breakdown
            <span className="text-[10px] font-normal text-muted-foreground ml-2">(Total items currently with clients)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-8 gap-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Chopsticks</p>
              <p className="text-xl font-bold text-foreground">{rentedChopsticks}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Plates</p>
              <p className="text-xl font-bold text-foreground">{rentedPlates}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Timbers</p>
              <p className="text-xl font-bold text-foreground">{rentedTimbers}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Connectors</p>
              <p className="text-xl font-bold text-foreground">{rentedConnectors}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Legs</p>
              <p className="text-xl font-bold text-foreground">{rentedLegs}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Wheels</p>
              <p className="text-xl font-bold text-foreground">{rentedWheels}</p>
            </div>
            <div className="sm:hidden md:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Ladders</p>
              <p className="text-xl font-bold text-foreground">{rentedLadders}</p>
            </div>
            <div className="sm:hidden md:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Joints</p>
              <p className="text-xl font-bold text-foreground">{rentedJoints}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Tubes 6m</p>
              <p className="text-xl font-bold text-foreground">{rentedTubes6m}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Tubes 4m</p>
              <p className="text-xl font-bold text-foreground">{rentedTubes4m}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Tubes 3m</p>
              <p className="text-xl font-bold text-foreground">{rentedTubes3m}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Tubes 1m</p>
              <p className="text-xl font-bold text-foreground">{rentedTubes1m}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="block md:hidden mt-4">
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rented or returned rentals"
          className="w-full"
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
            <div className="grid gap-6 md:grid-cols-2">
              {rentedItems.map((rental) => (
                <RentalCard
                  key={rental.id}
                  rental={rental}
                  showReturnButton={true}
                  isReturnDialogOpen={isReturnDialogOpen}
                  setIsReturnDialogOpen={setIsReturnDialogOpen}
                  selectedRental={selectedRental}
                  setSelectedRental={setSelectedRental}
                  returnData={returnData}
                  setReturnData={setReturnData}
                  handleReturnRental={handleReturnRental}
                  handlePartialReturn={handlePartialReturn}
                  setRentalToDelete={setRentalToDelete}
                  setIsDetailsDialogOpen={setIsDetailsDialogOpen}
                  setSelectedRentalForDetails={setSelectedRentalForDetails}
                  onEdit={(r) => {
                    setSelectedRentalForEdit(r);
                    setIsEditDialogOpen(true);
                  }}
                />
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
            <div className="grid gap-6 md:grid-cols-2">
              {returnedItems.map((rental) => (
                <RentalCard
                  key={rental.id}
                  rental={rental}
                  showReturnButton={false}
                  isReturnDialogOpen={isReturnDialogOpen}
                  setIsReturnDialogOpen={setIsReturnDialogOpen}
                  selectedRental={selectedRental}
                  setSelectedRental={setSelectedRental}
                  returnData={returnData}
                  setReturnData={setReturnData}
                  handleReturnRental={handleReturnRental}
                  handlePartialReturn={handlePartialReturn}
                  setRentalToDelete={setRentalToDelete}
                  setIsDetailsDialogOpen={setIsDetailsDialogOpen}
                  setSelectedRentalForDetails={setSelectedRentalForDetails}
                />
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
                    <p className="text-muted-foreground">Timbers:</p>
                    <p className="font-medium">{selectedRentalForDetails.timbers} (Returned: {selectedRentalForDetails.returned_timbers || 0})</p>
                    <p className="text-muted-foreground">Connectors:</p>
                    <p className="font-medium">{selectedRentalForDetails.connectors} (Returned: {selectedRentalForDetails.returned_connectors || 0})</p>
                    <p className="text-muted-foreground">Legs:</p>
                    <p className="font-medium">{selectedRentalForDetails.legs} (Returned: {selectedRentalForDetails.returned_legs || 0})</p>
                    <p className="text-muted-foreground">Tubes 6m:</p>
                    <p className="font-medium">{selectedRentalForDetails.tubes_6m || 0} (Returned: {selectedRentalForDetails.returned_tubes_6m || 0})</p>
                    <p className="text-muted-foreground">Tubes 4m:</p>
                    <p className="font-medium">{selectedRentalForDetails.tubes_4m || 0} (Returned: {selectedRentalForDetails.returned_tubes_4m || 0})</p>
                    <p className="text-muted-foreground">Tubes 3m:</p>
                    <p className="font-medium">{selectedRentalForDetails.tubes_3m || 0} (Returned: {selectedRentalForDetails.returned_tubes_3m || 0})</p>
                    <p className="text-muted-foreground">Tubes 1m:</p>
                    <p className="font-medium">{selectedRentalForDetails.tubes_1m || 0} (Returned: {selectedRentalForDetails.returned_tubes_1m || 0})</p>
                    <p className="text-muted-foreground">Ladders:</p>
                    <p className="font-medium">{selectedRentalForDetails.ladders || 0} (Returned: {selectedRentalForDetails.returned_ladders || 0})</p>
                    <p className="text-muted-foreground">Joints:</p>
                    <p className="font-medium">{selectedRentalForDetails.joints || 0} (Returned: {selectedRentalForDetails.returned_joints || 0})</p>
                    <p className="text-muted-foreground">Wheels:</p>
                    <p className="font-medium">{selectedRentalForDetails.wheels || 0} (Returned: {selectedRentalForDetails.returned_wheels || 0})</p>
                    <p className="text-muted-foreground">Station:</p>
                    <p className="font-medium">{selectedRentalForDetails.station || "N/A"}</p>
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

      <EditRentalDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        rental={selectedRentalForEdit}
        onSuccess={() => {
          fetchRentals();
          fetchInventory();
        }}
      />
    </div>
  );
};

export default Dashboard;
