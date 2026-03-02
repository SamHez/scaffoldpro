import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Plus, Users, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab?: string;
}

export const DashboardLayout = ({ children, activeTab }: DashboardLayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/");
      } else {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/");
    }
  };

  if (!user) {
    return null;
  }

  const isCEOorCOO = profile?.user_roles?.some((ur: any) => 
    ur.role === "CEO" || ur.role === "COO"
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-sidebar-primary" />
            <h1 className="text-xl font-bold">ScaffoldPro</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant={activeTab === "rentals" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => navigate("/dashboard")}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Rentals
          </Button>

          {isCEOorCOO && (
            <Button
              variant={activeTab === "add" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate("/dashboard/add")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Rental
            </Button>
          )}

          {profile?.user_roles?.some((ur: any) => ur.role === "CEO") && (
            <Button
              variant={activeTab === "audit" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate("/dashboard/audit")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Audit Log
            </Button>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="mb-4 p-3 bg-sidebar-accent rounded-lg">
            <p className="text-sm font-medium">{profile?.full_name}</p>
            <p className="text-xs text-sidebar-accent-foreground/70">
              {profile?.user_roles?.[0]?.role || "Employee"}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};
