import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListUsers } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Star, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";

export default function EmployeesPage() {
  const { data, isLoading } = useListUsers({}, { request: { headers: getAuthHeaders() } });

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold">Team Directory</h1>
            <p className="text-muted-foreground mt-1">Manage staff, roles, and performance.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Add Team Member
          </Button>
        </div>

        <Card className="p-0 overflow-hidden border-border bg-card">
          <div className="p-4 border-b border-border flex gap-4 bg-[#1A1A1A]">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 bg-background border-border h-10" placeholder="Search team..." />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-background text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Employee</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Pay Structure</th>
                  <th className="px-6 py-4 font-semibold text-center">Productivity</th>
                  <th className="px-6 py-4 font-semibold text-center">Score</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading team data...</td></tr>
                ) : data?.data?.map(user => (
                  <tr key={user.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-secondary border border-secondary/30">
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-white">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-[#1A1A1A] px-2 py-1 rounded border border-border text-xs font-semibold uppercase tracking-wider text-primary">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">${user.pay_rate}/hr</div>
                      <div className="text-xs text-muted-foreground capitalize">{user.pay_type?.replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-4 border-primary/30">
                        <span className="text-sm font-bold text-primary">{user.productivity_pct || 85}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-[#EAF3DE]/10 text-[#EAF3DE] px-3 py-1.5 rounded-md font-bold border border-[#3B6D11]/30">
                        <Star className="w-3.5 h-3.5 fill-[#EAF3DE]" /> 3.9
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="hover-elevate">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </Button>
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
