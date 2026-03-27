import { useState } from 'react';
import { Coins, Plus, ChevronDown, ChevronUp, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useCreditTransactions, useCreditBalance, useAddCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function CreditTracker() {
  const [isOpen, setIsOpen] = useState(false);
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const { data: transactions = [], isLoading } = useCreditTransactions();
  const { data: balance = 0 } = useCreditBalance();
  const addCredits = useAddCredits();

  const handlePurchase = () => {
    const qty = parseInt(purchaseQty);
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
                  Balance: <span className={`font-semibold ${balance <= 0 ? 'text-destructive' : 'text-primary'}`}>{balance}</span>
                </p>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Add credits */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Purchase Credits</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Qty"
                    type="number"
                    min="1"
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
                  <Button size="sm" className="h-8" onClick={handlePurchase} disabled={!purchaseQty || parseInt(purchaseQty) <= 0}>
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
                    <div key={t.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-md bg-muted/50">
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
