import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Package, ArrowLeft, AlertCircle, Search } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Dashboard = () => {
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [returnData, setReturnData] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        clients (
          id,
          name,
          nickname,
          phone,
          id_tin_no
        ),
        profiles!rentals_created_by_fkey (
          full_name
        )
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
  };

  const handleReturnRental = async (rentalId: string) => {
    const { error } = await supabase
      .from("rentals")
      .update({
        status: "RETURNED",
        returned_date: new Date().toISOString()
      })
      .eq("id", rentalId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update rental status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Rental marked as returned",
      });
      fetchRentals();
    }
  };

  const isOverdue = (rental: any) => {
    if (rental.status !== "RENTED") return false;
    const daysSinceRented = differenceInDays(new Date(), new Date(rental.rented_date));
    return daysSinceRented > rental.expected_days || daysSinceRented > rental.paid_days;
  };

  const filteredRentals = rentals.filter(rental => {
    const searchLower = searchQuery.toLowerCase();
    return (
      rental.clients.name.toLowerCase().includes(searchLower) ||
      (rental.clients.nickname && rental.clients.nickname.toLowerCase().includes(searchLower)) ||
      rental.clients.phone.includes(searchQuery) ||
      rental.clients.id_tin_no.toLowerCase().includes(searchLower)
    );
  });

  const rentedItems = filteredRentals.filter(r => r.status === "RENTED");
  const returnedItems = filteredRentals.filter(r => r.status === "RETURNED");

  const handlePartialReturn = async () => {
    if (!selectedRental) return;

    try {
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
        })
        .eq("id", selectedRental.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Partial return recorded successfully",
      });

      setSelectedRental(null);
      setReturnData({});
      fetchRentals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const RentalCard = ({ rental, showReturnButton }: { rental: any; showReturnButton: boolean }) => {
    const overdue = isOverdue(rental);
    const hasPartialReturn = rental.returned_num_scaffoldings > 0 ||
      rental.returned_num_chopsticks > 0 ||
      rental.returned_plates > 0;

    return (
      <Card className={overdue ? "border-destructive" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {rental.clients.nickname || rental.clients.name}
                {overdue && <AlertCircle className="h-5 w-5 text-destructive" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {rental.clients.phone} • {rental.clients.id_tin_no}
              </p>
              {overdue && (
                <Badge variant="destructive" className="mt-2">
                  OVERDUE
                </Badge>
              )}
              {hasPartialReturn && (
                <Badge variant="outline" className="mt-2 ml-2">
                  Partial Return
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant={rental.status === "RENTED" ? "default" : "secondary"}>
                {rental.status}
              </Badge>
              {showReturnButton && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRental(rental);
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
                      <Package className="h-4 w-4 mr-1" />
                      Partial Return
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Record Partial Return - {rental.clients.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Return Date</Label>
                        <Input
                          type="date"
                          value={returnData.returned_date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setReturnData({ ...returnData, returned_date: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Returned Scaffoldings (of {rental.num_scaffoldings})</Label>
                          <Input
                            type="number"
                            min="0"
                            max={rental.num_scaffoldings}
                            value={returnData.returned_num_scaffoldings || 0}
                            onChange={(e) => setReturnData({ ...returnData, returned_num_scaffoldings: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Returned Chopsticks (of {rental.num_chopsticks})</Label>
                          <Input
                            type="number"
                            min="0"
                            max={rental.num_chopsticks}
                            value={returnData.returned_num_chopsticks || 0}
                            onChange={(e) => setReturnData({ ...returnData, returned_num_chopsticks: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Returned Plates (of {rental.plates})</Label>
                          <Input
                            type="number"
                            min="0"
                            max={rental.plates}
                            value={returnData.returned_plates || 0}
                            onChange={(e) => setReturnData({ ...returnData, returned_plates: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Returned Timbers (of {rental.timbers})</Label>
                          <Input
                            type="number"
                            min="0"
                            max={rental.timbers}
                            value={returnData.returned_timbers || 0}
                            onChange={(e) => setReturnData({ ...returnData, returned_timbers: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Returned Connectors (of {rental.connectors})</Label>
                          <Input
                            type="number"
                            min="0"
                            max={rental.connectors}
                            value={returnData.returned_connectors || 0}
                            onChange={(e) => setReturnData({ ...returnData, returned_connectors: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Returned Legs (of {rental.legs})</Label>
                          <Input
                            type="number"
                            min="0"
                            max={rental.legs}
                            value={returnData.returned_legs || 0}
                            onChange={(e) => setReturnData({ ...returnData, returned_legs: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        {rental.tubes_6m > 0 && (
                          <div>
                            <Label>Returned 6m Tubes (of {rental.tubes_6m})</Label>
                            <Input
                              type="number"
                              min="0"
                              max={rental.tubes_6m}
                              value={returnData.returned_tubes_6m || 0}
                              onChange={(e) => setReturnData({ ...returnData, returned_tubes_6m: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        )}
                        {rental.tubes_4m > 0 && (
                          <div>
                            <Label>Returned 4m Tubes (of {rental.tubes_4m})</Label>
                            <Input
                              type="number"
                              min="0"
                              max={rental.tubes_4m}
                              value={returnData.returned_tubes_4m || 0}
                              onChange={(e) => setReturnData({ ...returnData, returned_tubes_4m: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        )}
                        {rental.tubes_3m > 0 && (
                          <div>
                            <Label>Returned 3m Tubes (of {rental.tubes_3m})</Label>
                            <Input
                              type="number"
                              min="0"
                              max={rental.tubes_3m}
                              value={returnData.returned_tubes_3m || 0}
                              onChange={(e) => setReturnData({ ...returnData, returned_tubes_3m: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        )}
                        {rental.tubes_1m > 0 && (
                          <div>
                            <Label>Returned 1m Tubes (of {rental.tubes_1m})</Label>
                            <Input
                              type="number"
                              min="0"
                              max={rental.tubes_1m}
                              value={returnData.returned_tubes_1m || 0}
                              onChange={(e) => setReturnData({ ...returnData, returned_tubes_1m: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                        <div>
                          <Label>Total Paid (FRW)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={returnData.total_paid || 0}
                            onChange={(e) => setReturnData({ ...returnData, total_paid: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Balance Due (FRW)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={returnData.balance_due || 0}
                            onChange={(e) => setReturnData({ ...returnData, balance_due: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <Button onClick={handlePartialReturn} className="w-full">
                        Save Partial Return
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Scaffoldings</p>
              <p className="font-semibold">
                {rental.num_scaffoldings}
                {rental.returned_num_scaffoldings > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({rental.returned_num_scaffoldings} returned)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Chopsticks</p>
              <p className="font-semibold">
                {rental.num_chopsticks}
                {rental.returned_num_chopsticks > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({rental.returned_num_chopsticks} returned)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Plates</p>
              <p className="font-semibold">
                {rental.plates}
                {rental.returned_plates > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({rental.returned_plates} returned)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Timbers</p>
              <p className="font-semibold">
                {rental.timbers}
                {rental.returned_timbers > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({rental.returned_timbers} returned)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Connectors</p>
              <p className="font-semibold">
                {rental.connectors}
                {rental.returned_connectors > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({rental.returned_connectors} returned)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Legs</p>
              <p className="font-semibold">
                {rental.legs}
                {rental.returned_legs > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({rental.returned_legs} returned)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Price per Scaffolding</p>
              <p className="font-semibold">{rental.price_per_scaffolding} FRW</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expected Days</p>
              <p className="font-semibold">{rental.expected_days}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid Days</p>
              <p className="font-semibold">{rental.paid_days}</p>
            </div>
            {rental.total_paid > 0 && (
              <div>
                <p className="text-muted-foreground">Total Paid</p>
                <p className="font-semibold">{rental.total_paid} FRW</p>
              </div>
            )}
            {rental.balance_due > 0 && (
              <div>
                <p className="text-muted-foreground">Balance Due</p>
                <p className="font-semibold text-destructive">{rental.balance_due} FRW</p>
              </div>
            )}
          </div>

          {rental.country || rental.province || rental.district ? (
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="text-sm font-medium">
                {[rental.country, rental.province, rental.district].filter(Boolean).join(", ")}
              </p>
            </div>
          ) : null}

          <div className="border-t pt-3 text-sm space-y-1">
            <p className="text-muted-foreground">
              Picked up by: <span className="font-medium text-foreground">{rental.pickup_person_name}</span>
            </p>
            <p className="text-muted-foreground">
              Vehicle: <span className="font-medium text-foreground">{rental.vehicle_type}</span>
              {rental.plate_number && ` • ${rental.plate_number}`}
            </p>
            <p className="text-muted-foreground">
              Rented: <span className="font-medium text-foreground">
                {format(new Date(rental.rented_date), "PPP")}
              </span>
            </p>
            {rental.returned_date && (
              <p className="text-muted-foreground">
                Returned: <span className="font-medium text-foreground">
                  {format(new Date(rental.returned_date), "PPP")}
                </span>
              </p>
            )}
            <p className="text-muted-foreground">
              Created by: <span className="font-medium text-foreground">
                {rental.profiles?.full_name || "Unknown"}
              </span>
            </p>
          </div>

          {showReturnButton && (
            <Button
              onClick={() => handleReturnRental(rental.id)}
              className="w-full mt-4"
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Mark as Returned
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout activeTab="rentals">
      <div className="p-0 sm:p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">View and manage all scaffolding rentals</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, nickname, phone, or ID/TIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="rented" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="rented">
              Rented ({rentedItems.length})
            </TabsTrigger>
            <TabsTrigger value="returned">
              Returned ({returnedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rented" className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : rentedItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No rented items</p>
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

          <TabsContent value="returned" className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : returnedItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No returned items</p>
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
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
