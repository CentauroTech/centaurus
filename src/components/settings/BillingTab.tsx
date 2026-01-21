import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Check, 
  X, 
  DollarSign, 
  FileText, 
  Eye,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useAllInvoices, 
  useApproveInvoice, 
  useRejectInvoice, 
  useMarkInvoicePaid,
  Invoice,
  InvoiceStatus,
} from '@/hooks/useInvoices';
import { InvoiceView } from '@/components/guest/InvoiceView';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  draft: { label: 'Draft', variant: 'secondary', className: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Pending Approval', variant: 'default', className: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
  approved: { label: 'Approved', variant: 'default', className: 'bg-green-500/20 text-green-700 border-green-500/30' },
  rejected: { label: 'Rejected', variant: 'destructive', className: 'bg-red-500/20 text-red-700 border-red-500/30' },
  paid: { label: 'Paid', variant: 'default', className: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
};

export function BillingTab() {
  const { data: invoices, isLoading } = useAllInvoices();
  const approveInvoice = useApproveInvoice();
  const rejectInvoice = useRejectInvoice();
  const markPaid = useMarkInvoicePaid();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingInvoice, setRejectingInvoice] = useState<Invoice | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter((invoice) => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.billingName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!invoices) return { pending: 0, approved: 0, totalPending: 0 };
    
    const pending = invoices.filter(i => i.status === 'submitted').length;
    const approved = invoices.filter(i => i.status === 'approved').length;
    const totalPending = invoices
      .filter(i => i.status === 'submitted')
      .reduce((sum, i) => sum + i.totalAmount, 0);
    
    return { pending, approved, totalPending };
  }, [invoices]);

  const handleApprove = async (invoice: Invoice) => {
    await approveInvoice.mutateAsync(invoice.id);
  };

  const handleOpenReject = (invoice: Invoice) => {
    setRejectingInvoice(invoice);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingInvoice) return;
    await rejectInvoice.mutateAsync({ 
      invoiceId: rejectingInvoice.id, 
      reason: rejectReason 
    });
    setRejectDialogOpen(false);
    setRejectingInvoice(null);
    setRejectReason('');
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    await markPaid.mutateAsync(invoice.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-2xl font-bold">${stats.totalPending.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select 
          value={statusFilter} 
          onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No invoices found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.billingName}</TableCell>
                  <TableCell>{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    ${invoice.totalAmount.toFixed(2)}
                    <span className="text-xs text-muted-foreground ml-1">{invoice.currency}</span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={STATUS_CONFIG[invoice.status].variant}
                      className={STATUS_CONFIG[invoice.status].className}
                    >
                      {STATUS_CONFIG[invoice.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {invoice.status === 'submitted' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 gap-1"
                            onClick={() => handleApprove(invoice)}
                            disabled={approveInvoice.isPending}
                          >
                            <Check className="h-4 w-4" />
                            Approve?
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleOpenReject(invoice)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {invoice.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleMarkPaid(invoice)}
                          disabled={markPaid.isPending}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          {viewingInvoice && (
            <InvoiceView 
              invoice={viewingInvoice} 
              onClose={() => setViewingInvoice(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this invoice. The vendor will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectInvoice.isPending}
            >
              Reject Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
