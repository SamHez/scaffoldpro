import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Search,
  PlusCircle,
  RefreshCcw,
  Trash2,
  User,
  Clock,
  ArrowRight,
  Filter
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const AuditLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");
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

  const getActionStyles = (action: string) => {
    switch (action) {
      case "INSERT":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-500",
          icon: PlusCircle,
          label: "Created"
        };
      case "UPDATE":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-500",
          icon: RefreshCcw,
          label: "Updated"
        };
      case "DELETE":
        return {
          bg: "bg-rose-500/10",
          text: "text-rose-500",
          icon: Trash2,
          label: "Deleted"
        };
      default:
        return {
          bg: "bg-zinc-500/10",
          text: "text-zinc-500",
          icon: FileText,
          label: action
        };
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.table_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = filterAction === "ALL" || log.action === filterAction;

    return matchesSearch && matchesAction;
  });

  const ChangeDiff = ({ oldVal, newVal }: { oldVal: any, newVal: any }) => {
    if (!oldVal && !newVal) return null;

    // Simple diffing logic
    const changes: { field: string, from: any, to: any }[] = [];

    if (oldVal && newVal) {
      const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
      allKeys.forEach(key => {
        // Skip common metadata fields
        if (['id', 'created_at', 'updated_at', 'created_by'].includes(key)) return;

        if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
          changes.push({
            field: key.replace(/_/g, ' '),
            from: oldVal[key],
            to: newVal[key]
          });
        }
      });
    } else if (newVal) {
      Object.keys(newVal).forEach(key => {
        if (['id', 'created_at', 'created_by'].includes(key)) return;
        changes.push({
          field: key.replace(/_/g, ' '),
          from: null,
          to: newVal[key]
        });
      });
    }

    if (changes.length === 0) return <span className="text-zinc-500 italic text-xs">No visible field changes recorded.</span>;

    return (
      <div className="space-y-2 mt-2">
        {changes.map((change, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold capitalize text-zinc-300 w-24 shrink-0">{change.field}:</span>
            {change.from !== null && (
              <>
                <span className="bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded line-through border border-rose-500/20">
                  {String(change.from)}
                </span>
                <ArrowRight className="h-3 w-3 text-zinc-600" />
              </>
            )}
            <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {String(change.to)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-emerald-500" />
            System Audit Log
          </h2>
          <p className="text-sm text-zinc-600">Track all administrative changes and user activity</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-900" />
            <Input
              placeholder="Search table or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-300/50 border-zinc-800 focus:border-emerald-500/50 transition-all"
            />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[140px] bg-zinc-300/50 border-zinc-800">
              <Filter className="h-3.5 w-3.5 mr-2 text-zinc-500" />
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
              <SelectItem value="ALL">All Actions</SelectItem>
              <SelectItem value="INSERT">Created</SelectItem>
              <SelectItem value="UPDATE">Updated</SelectItem>
              <SelectItem value="DELETE">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 w-full bg-zinc-900/20 animate-pulse rounded-xl border border-zinc-800/50" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="bg-zinc-900/30 border-dashed border-zinc-800">
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 text-zinc-800 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-zinc-300">No activity logs found</h3>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-1">
              {searchQuery || filterAction !== "ALL"
                ? "Try adjusting your filters to find what you're looking for."
                : "Activity logs will appear here once users start interacting with the system."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative border-l-2 border-zinc-800 ml-4 pl-8 space-y-8">
          {filteredLogs.map((log) => {
            const styles = getActionStyles(log.action);
            const ActionIcon = styles.icon;

            return (
              <div key={log.id} className="relative transition-all hover:translate-x-1 duration-200">
                {/* Timeline dot */}
                <div className={cn(
                  "absolute -left-[41px] top-0 p-1.5 rounded-full border-2 border-background",
                  styles.bg.replace('/10', ''), styles.text
                )}>
                  <ActionIcon className="h-4 w-4" />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200 uppercase tracking-wider text-[10px] bg-zinc-800/50 px-2 py-0.5 rounded">
                          {log.table_name}
                        </span>
                        <span className={cn("text-sm font-medium", styles.text)}>
                          {styles.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <User className="h-3.5 w-3.5" />
                        <span className="text-zinc-600 font-medium">{log.profiles?.full_name || "System"}</span>
                        <span className="text-zinc-600">•</span>
                        <span>{format(new Date(log.created_at), "MMM d, h:mm a")}</span>
                        <span className="text-xs text-zinc-500 bg-zinc-800/20 px-1.5 py-0.5 rounded">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-4 shadow-sm backdrop-blur-sm">
                    <ChangeDiff oldVal={log.old_values} newVal={log.new_values} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditLog;
