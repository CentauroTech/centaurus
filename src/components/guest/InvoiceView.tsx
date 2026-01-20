import { format } from 'date-fns';
import { ArrowLeft, Send, Printer, FileText, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useInvoice, useSubmitInvoice, Invoice } from '@/hooks/useInvoices';
import { toast } from 'sonner';
import centaurusLogo from '@/assets/centaurus-logo.jpeg';

interface InvoiceViewProps {
  invoiceId: string;
  onBack: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  draft: { label: 'Draft', icon: <FileText className="w-4 h-4" />, className: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Submitted', icon: <Clock className="w-4 h-4" />, className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', icon: <CheckCircle className="w-4 h-4" />, className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', icon: <XCircle className="w-4 h-4" />, className: 'bg-red-100 text-red-700' },
  paid: { label: 'Paid', icon: <DollarSign className="w-4 h-4" />, className: 'bg-emerald-100 text-emerald-700' },
};

export function InvoiceView({ invoiceId, onBack }: InvoiceViewProps) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const submitInvoice = useSubmitInvoice();

  const handleSubmit = async () => {
    try {
      await submitInvoice.mutateAsync(invoiceId);
      toast.success('Invoice submitted for approval');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit invoice');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading invoice...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Invoice not found
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-6">
      {/* Header - Hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold">Invoice {invoice.invoiceNumber}</h3>
          <Badge className={`${statusConfig.className} gap-1`}>
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          {invoice.status === 'draft' && (
            <Button onClick={handleSubmit} className="gap-2">
              <Send className="w-4 h-4" />
              Submit for Approval
            </Button>
          )}
        </div>
      </div>

      {/* Rejection reason */}
      {invoice.status === 'rejected' && invoice.rejectionReason && (
        <Card className="border-red-200 bg-red-50 print:hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Invoice Rejected</p>
                <p className="text-sm text-red-600">{invoice.rejectionReason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Document */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <img 
                src={centaurusLogo} 
                alt="Centaurus" 
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold">INVOICE</h1>
                <p className="text-muted-foreground">{invoice.invoiceNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">Invoice Date</p>
              <p className="text-muted-foreground">
                {format(new Date(invoice.invoiceDate), 'MMMM d, yyyy')}
              </p>
              {invoice.dueDate && (
                <>
                  <p className="font-medium mt-2">Due Date</p>
                  <p className="text-muted-foreground">
                    {format(new Date(invoice.dueDate), 'MMMM d, yyyy')}
                  </p>
                </>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Bill From / To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">BILL FROM</p>
              <p className="font-semibold">{invoice.billingName}</p>
              {invoice.billingAddress && <p className="text-sm">{invoice.billingAddress}</p>}
              {(invoice.billingCity || invoice.billingCountry) && (
                <p className="text-sm">
                  {[invoice.billingCity, invoice.billingCountry].filter(Boolean).join(', ')}
                </p>
              )}
              {invoice.billingTaxId && (
                <p className="text-sm text-muted-foreground mt-1">
                  Tax ID: {invoice.billingTaxId}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">BILL TO</p>
              <p className="font-semibold">Centaurus Media</p>
              <p className="text-sm">Production Services</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-lg overflow-hidden mb-8">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-left p-3 font-medium w-24">Phase</th>
                  <th className="text-left p-3 font-medium w-24">Role</th>
                  <th className="text-right p-3 font-medium w-20">Qty</th>
                  <th className="text-right p-3 font-medium w-28">Rate</th>
                  <th className="text-right p-3 font-medium w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3">
                      <p className="font-medium">{item.description}</p>
                      {item.workOrderNumber && (
                        <p className="text-xs text-muted-foreground">WO# {item.workOrderNumber}</p>
                      )}
                      {item.runtime && (
                        <p className="text-xs text-muted-foreground">Runtime: {item.runtime}</p>
                      )}
                    </td>
                    <td className="p-3 text-sm">{item.phase || '-'}</td>
                    <td className="p-3 text-sm capitalize">{item.rolePerformed || '-'}</td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right">${item.unitPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-medium">${item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
                  <span>${invoice.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total ({invoice.currency})</span>
                <span>${invoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bank Details & Notes */}
          {(invoice.billingBankName || invoice.billingBankAccount || invoice.paymentInstructions || invoice.billingNotes) && (
            <>
              <Separator className="my-8" />
              <div className="grid grid-cols-2 gap-8">
                {(invoice.billingBankName || invoice.billingBankAccount) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">BANK DETAILS</p>
                    {invoice.billingBankName && <p className="text-sm">Bank: {invoice.billingBankName}</p>}
                    {invoice.billingBankAccount && <p className="text-sm">Account: {invoice.billingBankAccount}</p>}
                    {invoice.billingBankRouting && <p className="text-sm">Routing/SWIFT: {invoice.billingBankRouting}</p>}
                  </div>
                )}
                {(invoice.paymentInstructions || invoice.billingNotes) && (
                  <div>
                    {invoice.paymentInstructions && (
                      <>
                        <p className="text-sm font-medium text-muted-foreground mb-2">PAYMENT INSTRUCTIONS</p>
                        <p className="text-sm whitespace-pre-wrap">{invoice.paymentInstructions}</p>
                      </>
                    )}
                    {invoice.billingNotes && (
                      <>
                        <p className="text-sm font-medium text-muted-foreground mb-2 mt-4">NOTES</p>
                        <p className="text-sm whitespace-pre-wrap">{invoice.billingNotes}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
