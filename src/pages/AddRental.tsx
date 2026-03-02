import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RentalForm } from "@/components/dashboard/RentalForm";

const AddRental = () => {
  return (
    <DashboardLayout activeTab="add">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Add New Rental</h1>
          <p className="text-muted-foreground mt-1">Create a new scaffolding rental record</p>
        </div>
        
        <RentalForm />
      </div>
    </DashboardLayout>
  );
};

export default AddRental;
