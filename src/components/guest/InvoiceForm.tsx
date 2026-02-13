import { useState, useMemo, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { ArrowLeft, Plus, Trash2, Calendar, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGuestCompletedHistory, GuestCompletedTask } from '@/hooks/useGuestCompletedHistory';
import { useCreateInvoice, CreateInvoiceData, createItemsFromCompletedTasks } from '@/hooks/useInvoices';
import { useInvoicedTaskIds } from '@/hooks/useInvoicedTaskIds';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useBillingProfile } from '@/hooks/useBillingProfile';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InvoiceFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface LineItem {
  id: string;
  completedTaskId?: string;
  description: string;
  workOrderNumber?: string;
  phase?: string;
  branch?: string;
  rolePerformed?: string;
  runtime?: string;
  quantity: number;
  unitPrice: number;
}

export function InvoiceForm({ onBack, onSuccess }: InvoiceFormProps) {
  const { data: completedTasks } = useGuestCompletedHistory();
  const { data: currentMember } = useCurrentTeamMember();
  const { data: billingProfile, isLoading: profileLoading } = useBillingProfile();
  const { user } = useAuth();
  const createInvoice = useCreateInvoice();
  const { data: invoicedTaskIds } = useInvoicedTaskIds();

  // Billing info - pre-filled from billing profile
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingCountry, setBillingCountry] = useState('');
  const [billingTaxId, setBillingTaxId] = useState('');
  const [billingBankName, setBillingBankName] = useState('');
  const [billingBankAccount, setBillingBankAccount] = useState('');
  const [billingBankRouting, setBillingBankRouting] = useState('');
  const [billingNotes, setBillingNotes] = useState('');

  // Payment terms
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 30));
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [taxRate, setTaxRate] = useState(0);

  // Task selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Check if billing fields should be locked (profile is locked)
  const isBillingLocked = billingProfile?.isLocked ?? false;

  // Pre-fill billing info from billing profile
  useEffect(() => {
    if (billingProfile) {
      // Build full name (use business name if invoicing as business)
      const displayName = billingProfile.isBusiness && billingProfile.businessName
        ? billingProfile.businessName
        : `${billingProfile.firstName} ${billingProfile.lastName}`;
      setBillingName(displayName);
      
      // Build full address
      const addressParts = [billingProfile.address, billingProfile.state, billingProfile.postalCode].filter(Boolean);
      setBillingAddress(addressParts.join(', '));
      
      setBillingCity(billingProfile.city || '');
      setBillingCountry(billingProfile.country || '');
      setBillingTaxId(billingProfile.isBusiness ? (billingProfile.businessId || '') : (billingProfile.taxId || ''));
      setBillingBankName(billingProfile.bankName || '');
      setBillingBankAccount(billingProfile.bankAccountNumber || '');
      setBillingBankRouting(billingProfile.bankRoutingNumber || '');
    } else if (currentMember?.name && !billingName) {
      // Fallback to current member name if no profile
      setBillingName(currentMember.name);
    }
  }, [billingProfile, currentMember?.name]);

  // Parse runtime string (e.g., "01:30:00" or "90 min") to minutes
  const parseRuntimeToMinutes = (runtime: string | undefined): number => {
    if (!runtime) return 1;
    
    // Handle HH:MM:SS format
    const timeMatch = runtime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      return hours * 60 + minutes || 1;
    }
    
    // Handle "X min" or "X minutes" format
    const minMatch = runtime.match(/(\d+)\s*min/i);
    if (minMatch) {
      return parseInt(minMatch[1], 10) || 1;
    }
    
    // Handle "X hr" or "X hours" format
    const hrMatch = runtime.match(/(\d+)\s*h(?:r|our)?/i);
    if (hrMatch) {
      return parseInt(hrMatch[1], 10) * 60 || 1;
    }
    
    // Try to parse as plain number (assume minutes)
    const numMatch = runtime.match(/^(\d+)$/);
    if (numMatch) {
      return parseInt(numMatch[1], 10) || 1;
    }
    
    return 1;
  };

  // Calculate totals
  const subtotal = useMemo(() => 
    lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [lineItems]
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const toggleTask = (task: GuestCompletedTask) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(task.id)) {
      newSelected.delete(task.id);
      setLineItems(prev => prev.filter(item => item.completedTaskId !== task.id));
    } else {
      newSelected.add(task.id);
      const runtimeMinutes = parseRuntimeToMinutes(task.lockedRuntime);
      setLineItems(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          completedTaskId: task.id,
          description: `${task.taskName}${task.tituloAprobadoEspanol ? ` - ${task.tituloAprobadoEspanol}` : ''}`,
          workOrderNumber: task.workOrderNumber,
          phase: task.phase,
          branch: task.branch,
          rolePerformed: task.rolePerformed,
          runtime: task.lockedRuntime,
          quantity: runtimeMinutes,
          unitPrice: 0,
        },
      ]);
    }
    setSelectedTaskIds(newSelected);
  };

  const addManualItem = () => {
    setLineItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(prev => 
      prev.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  };

  const removeItem = (id: string) => {
    const item = lineItems.find(i => i.id === id);
    if (item?.completedTaskId) {
      setSelectedTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.completedTaskId!);
        return newSet;
      });
    }
    setLineItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!billingName.trim()) {
      toast.error('Please enter your billing name');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    const hasInvalidItems = lineItems.some(item => !item.description.trim());
    if (hasInvalidItems) {
      toast.error('Please fill in all item descriptions');
      return;
    }

    try {
      await createInvoice.mutateAsync({
        billingName,
        billingAddress,
        billingCity,
        billingCountry,
        billingTaxId,
        billingBankName,
        billingBankAccount,
        billingBankRouting,
        billingNotes,
        dueDate: dueDate?.toISOString().split('T')[0],
        paymentInstructions,
        taxRate,
        items: lineItems.map(item => ({
          completedTaskId: item.completedTaskId,
          description: item.description,
          workOrderNumber: item.workOrderNumber,
          phase: item.phase,
          branch: item.branch,
          rolePerformed: item.rolePerformed,
          runtime: item.runtime,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      toast.success('Invoice created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invoice');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">Create Invoice</h3>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column - Billing Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Billing Information</CardTitle>
                {isBillingLocked && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>Locked</span>
                  </div>
                )}
              </div>
              {isBillingLocked && billingProfile?.lockedAt && (
                <CardDescription className="text-xs">
                  Using profile from {format(new Date(billingProfile.lockedAt), 'MMM d, yyyy')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isBillingLocked && (
                <Alert className="bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Billing details are locked after your first invoice submission. Contact a Project Manager to make changes.
                  </AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="billingName">Full Name / Company *</Label>
                <Input
                  id="billingName"
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  placeholder="Your name or company name"
                  disabled={isBillingLocked}
                  className={isBillingLocked ? "bg-muted" : ""}
                />
              </div>
              <div>
                <Label htmlFor="billingAddress">Address</Label>
                <Textarea
                  id="billingAddress"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Street address"
                  rows={2}
                  disabled={isBillingLocked}
                  className={isBillingLocked ? "bg-muted" : ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billingCity">City</Label>
                  <Input
                    id="billingCity"
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                    disabled={isBillingLocked}
                    className={isBillingLocked ? "bg-muted" : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="billingCountry">Country</Label>
                  <Input
                    id="billingCountry"
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                    disabled={isBillingLocked}
                    className={isBillingLocked ? "bg-muted" : ""}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="billingTaxId">Tax ID / VAT Number</Label>
                <Input
                  id="billingTaxId"
                  value={billingTaxId}
                  onChange={(e) => setBillingTaxId(e.target.value)}
                  placeholder="Optional"
                  disabled={isBillingLocked}
                  className={isBillingLocked ? "bg-muted" : ""}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Bank Details</CardTitle>
                {isBillingLocked && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>Locked</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={billingBankName}
                  onChange={(e) => setBillingBankName(e.target.value)}
                  disabled={isBillingLocked}
                  className={isBillingLocked ? "bg-muted" : ""}
                />
              </div>
              <div>
                <Label htmlFor="bankAccount">Account Number</Label>
                <Input
                  id="bankAccount"
                  value={billingBankAccount}
                  onChange={(e) => setBillingBankAccount(e.target.value)}
                  disabled={isBillingLocked}
                  className={isBillingLocked ? "bg-muted" : ""}
                />
              </div>
              <div>
                <Label htmlFor="bankRouting">Routing / SWIFT Code</Label>
                <Input
                  id="bankRouting"
                  value={billingBankRouting}
                  onChange={(e) => setBillingBankRouting(e.target.value)}
                  disabled={isBillingLocked}
                  className={isBillingLocked ? "bg-muted" : ""}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="paymentInstructions">Payment Instructions</Label>
                <Textarea
                  id="paymentInstructions"
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="Any additional payment instructions..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="billingNotes">Additional Notes</Label>
                <Textarea
                  id="billingNotes"
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
                  placeholder="Any notes for the recipient..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Tasks and Items */}
        <div className="space-y-6">
          {completedTasks && completedTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Completed Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {completedTasks.map((task) => {
                    const isAlreadyInvoiced = invoicedTaskIds?.has(task.id) ?? false;
                    return (
                    <label
                      key={task.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        isAlreadyInvoiced
                          ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                          : "cursor-pointer",
                        !isAlreadyInvoiced && selectedTaskIds.has(task.id) 
                          ? "border-primary bg-primary/5" 
                          : !isAlreadyInvoiced ? "border-border hover:bg-muted/50" : ""
                      )}
                    >
                      <Checkbox
                        checked={selectedTaskIds.has(task.id)}
                        onCheckedChange={() => !isAlreadyInvoiced && toggleTask(task)}
                        disabled={isAlreadyInvoiced}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{task.taskName}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs">
                          {task.workOrderNumber && (
                            <div>
                              <span className="text-muted-foreground">WO#:</span>{' '}
                              <span>{task.workOrderNumber}</span>
                            </div>
                          )}
                          {task.branch && (
                            <div>
                              <span className="text-muted-foreground">Branch:</span>{' '}
                              <span className="capitalize">{task.branch}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Phase:</span>{' '}
                            <span>{task.phase}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Role:</span>{' '}
                            <span className="capitalize">{task.rolePerformed}</span>
                          </div>
                          {task.lockedRuntime && (
                            <div>
                              <span className="text-muted-foreground">Duration:</span>{' '}
                              <span>{task.lockedRuntime}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Completed: {format(new Date(task.completedAt), 'MMM d, yyyy')}
                          {isAlreadyInvoiced && (
                            <span className="ml-2 text-amber-600 font-medium">
                              <Lock className="inline h-3 w-3 mr-0.5" />Already invoiced
                            </span>
                          )}
                        </p>
                      </div>
                    </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Line Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addManualItem} className="gap-1">
                <Plus className="w-3 h-3" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select completed tasks or add manual line items
                </p>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                            placeholder="Description"
                            className="font-medium"
                          />
                          {(item.workOrderNumber || item.branch || item.rolePerformed || item.runtime) && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                              {item.workOrderNumber && (
                                <div>
                                  <span className="text-muted-foreground block">Work Order</span>
                                  <span className="font-medium">{item.workOrderNumber}</span>
                                </div>
                              )}
                              {item.branch && (
                                <div>
                                  <span className="text-muted-foreground block">Branch</span>
                                  <span className="font-medium capitalize">{item.branch}</span>
                                </div>
                              )}
                              {item.rolePerformed && (
                                <div>
                                  <span className="text-muted-foreground block">Role</span>
                                  <span className="font-medium capitalize">{item.rolePerformed}</span>
                                </div>
                              )}
                              {item.runtime && (
                                <div>
                                  <span className="text-muted-foreground block">Duration</span>
                                  <span className="font-medium">{item.runtime}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Runtime (min)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Rate per min ($)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.unitPrice ? item.unitPrice : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '');
                              updateItem(item.id, { unitPrice: parseFloat(value) || 0 });
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Total</Label>
                          <Input
                            readOnly
                            value={`$${(item.quantity * item.unitPrice).toFixed(2)}`}
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handleSubmit(true)}
              disabled={createInvoice.isPending}
            >
              Save as Draft
            </Button>
            <Button 
              className="flex-1"
              onClick={() => handleSubmit(false)}
              disabled={createInvoice.isPending}
            >
              {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
