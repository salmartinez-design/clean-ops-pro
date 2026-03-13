import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Page Imports
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import JobsPage from "@/pages/jobs";
import EmployeesPage from "@/pages/employees";
import CustomersPage from "@/pages/customers";
import InvoicesPage from "@/pages/invoices";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/employees" component={EmployeesPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/invoices" component={InvoicesPage} />
      {/* Fallback to NotFound if no route matches */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
