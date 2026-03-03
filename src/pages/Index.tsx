import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="h-screen w-full bg-[#fafafa] relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Construction Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
          backgroundSize: '40px 40px, 120px 120px, 120px 120px',
        }}
      />

      {/* Intensified Ambient Gradient Patches */}
      <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-emerald-500/30 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[70%] bg-emerald-600/40 blur-[180px] rounded-full" />
      <div className="absolute top-[10%] right-[5%] w-[45%] h-[45%] bg-emerald-400/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] bg-emerald-500/15 blur-[100px] rounded-full" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-6xl flex flex-col items-center gap-12 lg:gap-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-bold tracking-wider mb-4 uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Enterprise Scaffolding SaaS
          </div>

          <img
            src="/logo-h.png"
            alt="ScaffoldPro"
            className="h-20 md:h-28 mx-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
          />

          <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tight leading-[1.1]">
            Scaffolding <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400 font-extrabold italic">Elevated.</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto font-medium leading-relaxed">
            The professional choice for elite scaffolding rental systems. Secure, audit-ready, and industrial-grade.
          </p>

          <div className="pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="h-14 px-10 text-lg font-bold rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_-5px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all group"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>

        {/* Features Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-in fade-in zoom-in-95 delay-300 duration-1000 fill-mode-both">
          <Card className="bg-white/40 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] rounded-3xl group hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
            <CardHeader className="pb-2">
              <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit mb-2 group-hover:scale-110 transition-transform duration-500">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle className="text-xl font-bold text-zinc-800">Elite Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                CEO, COO, and custom permissions for industrial security standards.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] rounded-3xl group hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
            <CardHeader className="pb-2">
              <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit mb-2 group-hover:scale-110 transition-transform duration-500">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle className="text-xl font-bold text-zinc-800">Advanced CRM</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                Smart client tracking and intelligent equipment rental flows.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/40 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] rounded-3xl group hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
            <CardHeader className="pb-2">
              <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit mb-2 group-hover:scale-110 transition-transform duration-500">
                <FileText className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle className="text-xl font-bold text-zinc-800">Full Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                Comprehensive data trail with precision value-change tracking.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>


    </div>
  );
};

export default Index;
