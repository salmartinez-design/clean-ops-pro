import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListInvoices, ListInvoicesStatus } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Send, Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<ListInvoicesStatus | 'all'>('all');
  const { data, isLoading } = useListInvoices(
    activeTab !== 'all' ? { status: activeTab } : {},
    { request: { headers: getAuthHeaders() } }
  );

  const tabs = [
    { id: 'all', label: 'All Invoices' },
    { id: 'draft', label: 'Drafts' },
    { id: 'sent', label: 'Sent' },
    { id: 'paid', label: 'Paid' },
    { id: 'overdue', label: 'Overdue' },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold">Invoicing</h1>
            <p className="text-muted-foreground mt-1">Manage billing, capture payments, and track revenue.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </Button>
        </div>

        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Outstanding</p>
            <p className="text-2xl font-bold text-white mt-1">${(data?.stats?.total_outstanding || 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Overdue</p>
            <p className="text-2xl font-bold text-status-danger mt-1">${(data?.stats?.total_overdue || 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Paid (Last 30D)</p>
            <p className="text-2xl font-bold text-status-success mt-1">${(data?.stats?.total_paid || 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-[#1A1A1A] border-primary/30 card-active-accent">
            <p className="text-xs text-primary uppercase tracking-wider font-semibold">Total Revenue (YTD)</p>
            <p className="text-2xl font-bold text-white mt-1">${(data?.stats?.total_revenue || 0).toLocaleString()}</p>
          </Card>
        </div>

        <Card className="p-0 overflow-hidden border-border bg-card mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-border bg-[#1A1A1A] gap-4">
             <div className="flex space-x-1 p-1 bg-background rounded-lg border border-border overflow-x-auto w-full sm:w-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-secondary text-white shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 bg-background border-border h-10" placeholder="Search invoice # or client..." />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-background text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Invoice #</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading invoices...</td></tr>
                ) : data?.data?.map(invoice => (
                  <tr key={invoice.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white">INV-{invoice.id.toString().padStart(4, '0')}</td>
                    <td className="px-6 py-4 font-semibold">{invoice.client_name}</td>
                    <td className="px-6 py-4 font-bold text-white">${invoice.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(invoice.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {invoice.status === 'draft' && (
                        <Button variant="outline" size="sm" className="h-8 border-border hover-elevate">
                          <Send className="w-3 h-3 mr-2" /> Send
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover-elevate">
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!data?.data?.length && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">No invoices found matching criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
