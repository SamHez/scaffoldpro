import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Plus, Users, FileText, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-sidebar-primary" />
              <h1 className="text-xl font-bold truncate">ScaffoldPro</h1>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "rentals"}
                  onClick={() => navigate("/dashboard")}
                  tooltip="Rentals"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Rentals</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isCEOorCOO && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === "add"}
                    onClick={() => navigate("/dashboard/add")}
                    tooltip="Add Rental"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Rental</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {profile?.user_roles?.some((ur: any) => ur.role === "CEO") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === "audit"}
                    onClick={() => navigate("/dashboard/audit")}
                    tooltip="Audit Log"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Audit Log</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border space-y-4">
            <div className="p-3 bg-sidebar-accent rounded-lg overflow-hidden">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-sidebar-accent-foreground/70 truncate">
                {profile?.user_roles?.[0]?.role || "Employee"}
              </p>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="text-sidebar-foreground hover:bg-sidebar-accent"
                  tooltip="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border flex items-center px-4 bg-background sticky top-0 z-30">
            <SidebarTrigger className="mr-4" />
            <div className="lg:hidden flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-bold">ScaffoldPro</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
