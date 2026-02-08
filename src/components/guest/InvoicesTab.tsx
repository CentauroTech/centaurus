import { useState, useEffect } from 'react';
import { InvoiceList } from './InvoiceList';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceView } from './InvoiceView';
import { Invoice } from '@/hooks/useInvoices';

type View = 'list' | 'create' | 'view';

interface InvoicesTabProps {
  initialInvoiceId?: string | null;
}

export function InvoicesTab({ initialInvoiceId }: InvoicesTabProps) {
  const [view, setView] = useState<View>(initialInvoiceId ? 'view' : 'list');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(initialInvoiceId || null);

  // Handle deep link changes
  useEffect(() => {
    if (initialInvoiceId) {
      setSelectedInvoiceId(initialInvoiceId);
      setView('view');
    }
  }, [initialInvoiceId]);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoiceId(invoice.id);
    setView('view');
  };

  const handleBack = () => {
    setView('list');
    setSelectedInvoiceId(null);
  };

  if (view === 'create') {
    return (
      <InvoiceForm 
        onBack={handleBack} 
        onSuccess={handleBack}
      />
    );
  }

  if (view === 'view' && selectedInvoiceId) {
    return (
      <InvoiceView 
        invoiceId={selectedInvoiceId} 
        onBack={handleBack}
      />
    );
  }

  return (
    <InvoiceList 
      onCreateNew={() => setView('create')} 
      onViewInvoice={handleViewInvoice}
    />
  );
}
