import { useEffect, useState, useRef } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Plus, Users, FileText, Menu, Search, User as UserIcon, Bell, ShieldCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useSidebar,
} from "@/components/ui/sidebar";

const DashboardLayoutContent = () => {
  const { state } = useSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToTop = () => {
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    };

    scrollToTop();
    const timeoutId = setTimeout(scrollToTop, 10);
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);

      if (!session) {
        navigate("/");
      } else {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoadingAuth(false);

        if (session?.user) {
          fetchProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Real‑time profile sync – updates UI when role changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel('public:profiles')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        setProfile(payload.new);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
      // Redirect Super Admin to Admin page if they are at the dashboard root
      if (data.role === 'ADMIN' && location.pathname === '/dashboard') {
        navigate('/dashboard/admin');
      }
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

  const activeTab = (() => {
    const path = location.pathname;
    if (path === "/dashboard") return "rentals";
    if (path === "/dashboard/add") return "add";
    if (path === "/dashboard/audit") return "audit";
    if (path === "/dashboard/admin") return "admin";
    return "";
  })();

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/dashboard/add") return "Add Rental";
    if (path === "/dashboard/audit") return "Audit Log";
    if (path === "/dashboard/admin") return "System Admin";
    return "ScaffoldPro";
  })();

  if (isLoadingAuth || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-background/30 backdrop-blur-sm">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }



  const isCEOorCOO =
    profile?.role === "CEO" ||
    profile?.role === "COO" ||
    profile?.user_roles?.some((ur: any) => ur.role === "CEO" || ur.role === "COO");

  return (
    <div className="flex min-h-screen w-full bg-background overflow-hidden">
      <Sidebar collapsible="icon" className="glass-grey border-none shadow-2xl transition-all duration-300">
        <SidebarHeader className="h-[72px] flex items-center justify-center p-0 transition-all duration-300 border-b border-white/5 bg-black/20">
          <div className={cn(
            "flex items-center justify-center w-full h-full transition-all duration-300",
            state === "collapsed" ? "px-2" : "px-6"
          )}>
            <img
              src={state === "collapsed" ? "/icon-w.png" : "/logo-w.png"}
              alt="ScaffoldPro"
              className={cn(
                "transition-all duration-500 ease-in-out object-contain",
                state === "collapsed" ? "h-8 w-8 scale-110" : "h-9 w-auto"
              )}
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="p-3">
          <SidebarMenu className="gap-2">
            {profile?.role !== "ADMIN" && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "rentals"}
                  onClick={() => navigate("/dashboard")}
                  tooltip="Rentals"
                  className={cn(
                    "h-14 rounded-xl transition-all duration-200",
                    activeTab === "rentals"
                      ? "bg-emerald-600/90 text-white shadow-lg shadow-emerald-900/20 font-semibold"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                  )}
                >
                  <Building2 className={cn(
                    state === "collapsed" ? "h-7 w-7" : "h-5 w-5",
                    activeTab === "rentals" ? "text-white" : "text-zinc-400"
                  )} />
                  <span className="font-medium">Rentals</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {profile?.role !== "ADMIN" && isCEOorCOO && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "add"}
                  onClick={() => navigate("/dashboard/add")}
                  tooltip="Add Rental"
                  className={cn(
                    "h-14 rounded-xl transition-all duration-200",
                    activeTab === "add"
                      ? "bg-emerald-600/90 text-white shadow-lg shadow-emerald-900/20 font-semibold"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                  )}
                >
                  <Plus className={cn(
                    state === "collapsed" ? "h-7 w-7" : "h-5 w-5",
                    activeTab === "add" ? "text-white" : "text-zinc-400"
                  )} />
                  <span className="font-medium">Add Rental</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {profile?.role !== "ADMIN" && isCEOorCOO && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "audit"}
                  onClick={() => navigate("/dashboard/audit")}
                  tooltip="Audit Log"
                  className={cn(
                    "h-14 rounded-xl transition-all duration-200",
                    activeTab === "audit"
                      ? "bg-emerald-600/90 text-white shadow-lg shadow-emerald-900/20 font-semibold"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                  )}
                >
                  <FileText className={cn(
                    state === "collapsed" ? "h-7 w-7" : "h-5 w-5",
                    activeTab === "audit" ? "text-white" : "text-zinc-400"
                  )} />
                  <span className="font-medium">Audit Log</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {profile?.role === "ADMIN" && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "admin"}
                  onClick={() => navigate("/dashboard/admin")}
                  tooltip="System Admin"
                  className={cn(
                    "h-14 rounded-xl transition-all duration-200",
                    activeTab === "admin"
                      ? "bg-purple-600/90 text-white shadow-lg shadow-purple-900/20 font-semibold"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                  )}
                >
                  <ShieldCheck className={cn(
                    state === "collapsed" ? "h-7 w-7" : "h-5 w-5",
                    activeTab === "admin" ? "text-white" : "text-zinc-400"
                  )} />
                  <span className="font-medium">System Admin</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-white/5 mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                className="h-14 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                tooltip="Logout"
              >
                <LogOut className={state === "collapsed" ? "h-7 w-7" : "h-5 w-5"} />
                <span className="font-medium">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-30 relative">
          <div className="flex items-center gap-4 flex-1">
            <SidebarTrigger />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
            </div>

            {/* Centered Mobile Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
              <img src="/logo-v.png" alt="ScaffoldPro" className="h-10 w-auto" />
            </div>

            <div className="flex-1 max-w-md relative hidden sm:block mx-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search everything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCEOorCOO && (
              <Button
                size="sm"
                className="hidden md:flex gap-2"
                onClick={() => navigate("/dashboard/add")}
              >
                <Plus className="h-4 w-4" />
                Add Rental
              </Button>
            )}

            <Button variant="ghost" size="icon" className="text-muted-foreground hidden">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden ml-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="" alt={profile?.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {(() => {
                        const r = profile?.role || profile?.user_roles?.[0]?.role || "Employee";
                        if (r.toUpperCase() === "EMPLOYEE") return "Employee";
                        if (r.toUpperCase() === "CEO") return "CEO";
                        if (r.toUpperCase() === "COO") return "COO";
                        if (r.toUpperCase() === "ADMIN") return "System Admin";
                        return r;
                      })()}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>My Dashboard</span>
                </DropdownMenuItem>
                {isCEOorCOO && (
                  <DropdownMenuItem onClick={() => navigate("/dashboard/add")}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>New Rental</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-auto bg-muted/20">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <Outlet context={{ searchQuery, setSearchQuery, profile }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <DashboardLayoutContent />
    </SidebarProvider>
  );
};
