import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";
import { format } from "date-fns";

const AuditLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_logs")
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT":
        return "bg-success";
      case "UPDATE":
        return "bg-warning";
      case "DELETE":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No audit logs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      <span className="font-normal text-muted-foreground">
                        {log.table_name}
                      </span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      by {log.profiles?.full_name || "Unknown"} •{" "}
                      {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              {(log.old_values || log.new_values) && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {log.old_values && (
                      <div>
                        <p className="font-semibold text-muted-foreground mb-2">Before</p>
                        <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(log.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.new_values && (
                      <div>
                        <p className="font-semibold text-muted-foreground mb-2">After</p>
                        <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLog;
