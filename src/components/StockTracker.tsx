import { useState } from 'react';
import { Package, Wifi, Plus, Minus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useStockItems, useCreateStockItem, useUpdateStockItem, useDeleteStockItem } from '@/hooks/useStockItems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

export function StockTracker() {
  const [isOpen, setIsOpen] = useState(true);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string>('box');
  const [newQty, setNewQty] = useState('');

  const { data: items = [], isLoading } = useStockItems();
  const createItem = useCreateStockItem();
  const updateItem = useUpdateStockItem();
  const deleteItem = useDeleteStockItem();

  const boxes = items.filter(i => i.category === 'box');
  const remotes = items.filter(i => i.category === 'remote');

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createItem.mutate(
      { name: trimmed, category: newCategory, quantity: parseInt(newQty) || 0 },
      {
        onSuccess: () => {
          setNewName('');
          setNewQty('');
          toast.success('Stock item added');
        },
        onError: () => toast.error('Failed to add item'),
      }
    );
  };

  const adjustQty = (id: string, current: number, delta: number) => {
    const newQuantity = Math.max(0, current + delta);
    updateItem.mutate({ id, quantity: newQuantity });
  };

  const handleDelete = (id: string) => {
    deleteItem.mutate(id, {
      onSuccess: () => toast.success('Item removed'),
    });
  };

  const renderItems = (categoryItems: typeof items, icon: React.ReactNode, label: string) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </h4>
      {categoryItems.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-5">No {label.toLowerCase()} tracked yet</p>
      ) : (
        categoryItems.map(item => (
          <div key={item.id} className="flex items-center gap-2 pl-5">
            <span className="text-sm flex-1 truncate">{item.name}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => adjustQty(item.id, item.quantity, -1)}
                disabled={item.quantity <= 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium w-8 text-center tabular-nums">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => adjustQty(item.id, item.quantity, 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-left">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" /> Device Stock
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading stock...</p>
            ) : (
              <>
                {renderItems(boxes, <Package className="h-4 w-4" />, 'Boxes')}
                {renderItems(remotes, <Wifi className="h-4 w-4" />, 'Remotes')}
              </>
            )}

            {/* Add new item */}
            <div className="flex gap-2 pt-2 border-t">
              <Input
                placeholder="Item name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Qty"
                type="number"
                min="0"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-16 h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Button size="sm" className="h-8" onClick={handleAdd} disabled={!newName.trim()}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
