import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BillingTab } from '@/components/settings/BillingTab';
import { usePermissions } from '@/hooks/usePermissions';
import { useHasBillingRole } from '@/hooks/useMyRoles';

export default function Billing() {
  const navigate = useNavigate();
  const { isAdmin, isGod } = usePermissions();
  const { hasBillingRole } = useHasBillingRole();
  
  const hasBillingAccess = isAdmin || isGod || hasBillingRole;

  if (!hasBillingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to view this page.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Billing</h1>
              <p className="text-sm text-muted-foreground">Manage vendor invoices and payments</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        <BillingTab />
      </div>
    </div>
  );
}
