import { useState } from 'react';
import { Coins, Plus, ChevronDown, ChevronUp, ArrowUpCircle, ArrowDownCircle, Calculator, Pencil, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { useCreditTransactions, useCreditBalance, useAddCredits, useUpdateCreditTransaction, useDeleteCreditTransaction } from '@/hooks/useCredits';
import { calculateCredits } from '@/lib/creditCalculator';
import { useAllAddonOptions } from '@/hooks/useAddonTypes';
import { useAppSettings, useUpdateAppSettings } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function CreditTracker() {
  const [isOpen, setIsOpen] = useState(false);
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [calcConnections, setCalcConnections] = useState('1');
  const [calcSelectedAddons, setCalcSelectedAddons] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const { data: transactions = [], isLoading } = useCreditTransactions();
  const { data: balance = 0 } = useCreditBalance();
  const addCredits = useAddCredits();
  const updateTransaction = useUpdateCreditTransaction();
  const deleteTransaction = useDeleteCreditTransaction();
  const addonOptions = useAllAddonOptions();
  const { data: settings } = useAppSettings();
  const updateSettings = useUpdateAppSettings();

  const threshold = settings?.credit_warning_threshold ?? 5;
  const isLowBalance = balance > 0 && balance <= threshold;
  const isZeroBalance = balance <= 0;

  const calculatedCredits = calculateCredits(
    parseInt(calcConnections) || 1,
    calcSelectedAddons.length
  );

  const handlePurchase = () => {
    const qty = parseFloat(purchaseQty);
    if (!qty || qty <= 0) return;
    addCredits.mutate(
      { amount: qty, notes: purchaseNotes.trim() || undefined },
      {
        onSuccess: () => {
          setPurchaseQty('');
          setPurchaseNotes('');
          toast.success(`Added ${qty} credit${qty !== 1 ? 's' : ''}`);
        },
        onError: () => toast.error('Failed to add credits'),
      }
    );
  };

  const startEdit = (t: { id: string; amount: number; notes: string | null }) => {
    setEditingId(t.id);
    setEditAmount(String(t.amount));
    setEditNotes(t.notes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditNotes('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const amt = parseFloat(editAmount);
    if (!amt || amt <= 0) return;
    updateTransaction.mutate(
      { id: editingId, amount: amt, notes: editNotes.trim() || null },
      {
        onSuccess: () => {
          cancelEdit();
          toast.success('Transaction updated');
        },
        onError: () => toast.error('Failed to update'),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteTransaction.mutate(id, {
      onSuccess: () => toast.success('Transaction deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-left">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5" /> Credits
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 ml-7">
                  Balance: <span className={`font-semibold ${isZeroBalance ? 'text-destructive' : isLowBalance ? 'text-amber-500' : 'text-primary'}`}>{balance}</span>
                </p>
                {(isLowBalance || isZeroBalance) && (
                  <p className={`text-xs mt-1 ml-7 flex items-center gap-1 ${isZeroBalance ? 'text-destructive' : 'text-amber-500'}`}>
                    <AlertTriangle className="h-3 w-3" />
                    {isZeroBalance ? 'No credits remaining!' : `Low balance — only ${balance} credits left`}
                  </p>
                )}
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Pricing Calculator */}
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5" /> Pricing Calculator
              </h4>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Connections</label>
                  <Select value={calcConnections} onValueChange={setCalcConnections}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-center px-3">
                  <p className="text-xs text-muted-foreground">Credits</p>
                  <p className="text-lg font-bold text-primary tabular-nums">{calculatedCredits}</p>
                </div>
              </div>
              {addonOptions.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Add-Ons</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {addonOptions.map((addon) => (
                      <div key={addon} className="flex items-center space-x-1.5">
                        <Checkbox
                          id={`calc-addon-${addon}`}
                          checked={calcSelectedAddons.includes(addon)}
                          onCheckedChange={(checked) => {
                            setCalcSelectedAddons(checked
                              ? [...calcSelectedAddons, addon]
                              : calcSelectedAddons.filter(a => a !== addon)
                            );
                          }}
                          className="h-3.5 w-3.5"
                        />
                        <Label htmlFor={`calc-addon-${addon}`} className="text-xs">{addon}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add credits */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Purchase Credits</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Qty"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    className="w-20 h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handlePurchase()}
                  />
                  <Input
                    placeholder="Notes (optional)"
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handlePurchase()}
                  />
                  <Button size="sm" className="h-8" onClick={handlePurchase} disabled={!purchaseQty || parseFloat(purchaseQty) <= 0}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Transaction history */}
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground">Recent History</h4>
              {isLoading ? (
                <p className="text-xs text-muted-foreground">Loading...</p>
              ) : transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No transactions yet</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {transactions.map(t => (
                    <div key={t.id} className="group flex items-center gap-2 text-xs py-1.5 px-2 rounded-md bg-muted/50">
                      {editingId === t.id ? (
                        <>
                          {t.type === 'purchase' ? (
                            <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <ArrowDownCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-16 h-6 text-xs px-1"
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          />
                          <Input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Notes"
                            className="flex-1 h-6 text-xs px-1"
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          />
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={saveEdit}>
                            <Check className="h-3 w-3 text-emerald-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={cancelEdit}>
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {t.type === 'purchase' ? (
                            <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <ArrowDownCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                          <span className={`font-semibold tabular-nums ${t.type === 'purchase' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {t.type === 'purchase' ? '+' : '-'}{t.amount}
                          </span>
                          <span className="flex-1 truncate text-muted-foreground">
                            {t.type === 'allocation' && t.customer_name
                              ? `→ ${t.customer_name}`
                              : t.notes || 'Purchase'}
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {format(new Date(t.created_at), 'MMM d')}
                          </span>
                          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => startEdit(t)}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete(t.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
