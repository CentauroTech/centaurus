import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Plus, Send, Trash2, Eye, Clock, CheckCircle, XCircle, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMyInvoices, useDeleteInvoice, useSubmitInvoice, Invoice } from '@/hooks/useInvoices';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InvoiceListProps {
  onCreateNew: () => void;
  onViewInvoice: (invoice: Invoice) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  draft: { label: 'Draft', icon: <FileText className="w-3 h-3" />, className: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Pending', icon: <Clock className="w-3 h-3" />, className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', icon: <CheckCircle className="w-3 h-3" />, className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', icon: <XCircle className="w-3 h-3" />, className: 'bg-red-100 text-red-700' },
  paid: { label: 'Paid', icon: <DollarSign className="w-3 h-3" />, className: 'bg-emerald-100 text-emerald-700' },
};

export function InvoiceList({ onCreateNew, onViewInvoice }: InvoiceListProps) {
  const { data: invoices, isLoading } = useMyInvoices();
  const deleteInvoice = useDeleteInvoice();
  const submitInvoice = useSubmitInvoice();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitId, setSubmitId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteInvoice.mutateAsync(deleteId);
      toast.success('Invoice deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete invoice');
    }
    setDeleteId(null);
  };

  const handleSubmit = async () => {
    if (!submitId) return;
    try {
      await submitInvoice.mutateAsync(submitId);
      toast.success('Invoice submitted for approval');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit invoice');
    }
    setSubmitId(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading invoices...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Invoices</h3>
        <Button onClick={onCreateNew} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Invoice
        </Button>
      </div>

      {!invoices || invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first invoice from your completed tasks.
            </p>
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
            
            return (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{invoice.invoiceNumber}</p>
                          <Badge className={`${statusConfig.className} gap-1`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}
                          {invoice.dueDate && ` • Due: ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          ${invoice.totalAmount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewInvoice(invoice)}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {invoice.status === 'draft' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSubmitId(invoice.id)}
                              title="Submit for approval"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(invoice.id)}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {invoice.status === 'rejected' && invoice.rejectionReason && (
                          <div className="flex items-center gap-1 ml-2 text-xs text-red-600">
                            <AlertCircle className="w-3 h-3" />
                            <span className="max-w-[150px] truncate" title={invoice.rejectionReason}>
                              {invoice.rejectionReason}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The invoice will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit confirmation */}
      <AlertDialog open={!!submitId} onOpenChange={() => setSubmitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, you won't be able to edit this invoice until it's reviewed. Are you sure it's ready?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Submit for Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
