import { useState } from 'react';
import { InvoiceList } from './InvoiceList';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceView } from './InvoiceView';
import { Invoice } from '@/hooks/useInvoices';

type View = 'list' | 'create' | 'view';

export function InvoicesTab() {
  const [view, setView] = useState<View>('list');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

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
