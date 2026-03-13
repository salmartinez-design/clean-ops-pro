import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListClients } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Medal, MapPin, Mail, Phone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function CustomersPage() {
  const { data, isLoading } = useListClients({}, { request: { headers: getAuthHeaders() } });

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold">Client Roster</h1>
            <p className="text-muted-foreground mt-1">Manage customers and loyalty points.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        </div>

        <Card className="p-0 overflow-hidden border-border bg-card">
          <div className="p-4 border-b border-border flex justify-between items-center bg-[#1A1A1A]">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 bg-background border-border h-10" placeholder="Search clients by name or address..." />
            </div>
            <Button variant="outline" className="border-border">Batch Actions</Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-background text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 w-12"><Checkbox /></th>
                  <th className="px-6 py-4 font-semibold">Client Info</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Address</th>
                  <th className="px-6 py-4 font-semibold text-center">Loyalty</th>
                  <th className="px-6 py-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading clients...</td></tr>
                ) : data?.data?.map(client => (
                  <tr key={client.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4"><Checkbox /></td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-white text-base">{client.first_name} {client.last_name}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">ID: CL-{client.id.toString().padStart(4, '0')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {client.phone && <div className="flex items-center text-muted-foreground"><Phone className="w-3 h-3 mr-2" /> {client.phone}</div>}
                        {client.email && <div className="flex items-center text-muted-foreground"><Mail className="w-3 h-3 mr-2" /> {client.email}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start text-muted-foreground max-w-[200px]">
                        <MapPin className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                        <span className="truncate">{client.address || 'No address'}, {client.city}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5 bg-status-loyalty text-[#EEEDFE] px-3 py-1 rounded-full font-bold text-xs border border-[#EEEDFE]/20 shadow-sm shadow-[#3C3489]/50">
                          <Medal className="w-3.5 h-3.5" /> {client.loyalty_points} PTS
                        </div>
                        {client.loyalty_points > 100 && (
                          <span className="text-[10px] text-primary font-bold mt-1 uppercase tracking-wider">Reward Ready</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="bg-status-success/20 text-[#EAF3DE] border border-status-success px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
