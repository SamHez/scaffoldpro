import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/auth/AuthForm";
import { Building2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <img
            src="/logo-v.png"
            alt="ScaffoldPro"
            className="h-20 mb-2 drop-shadow-lg"
          />
          <p className="text-muted-foreground font-medium">Scaffolding Rental Management</p>
        </div>

        <div className="bg-card p-8 rounded-xl shadow-lg border border-border">
          <AuthForm />
        </div>
      </div>
    </div>
  );
};

export default Auth;
