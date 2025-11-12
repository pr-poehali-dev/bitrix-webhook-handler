
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InnUniqueness from "./pages/InnUniqueness";
import Contracts from "./pages/Contracts";
import Purchases from "./pages/Purchases";
import UnfDocuments from "./pages/UnfDocuments";
import BpLogs from "./pages/BpLogs";
import DealChanges from "./pages/DealChanges";
import WebhookTest from "./pages/WebhookTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/inn-uniqueness" element={<InnUniqueness />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/unf-documents" element={<UnfDocuments />} />
          <Route path="/bp-logs" element={<BpLogs />} />
          <Route path="/deal-changes" element={<DealChanges />} />
          <Route path="/webhook-test" element={<WebhookTest />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;