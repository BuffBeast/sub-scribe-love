import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { useColumnVisibility, useUpdateColumnVisibility } from '@/hooks/useColumnVisibility';
import { useCustomFields, useCreateCustomField, useDeleteCustomField, useUpdateCustomField } from '@/hooks/useCustomFields';
import { Separator } from '@/components/ui/separator';

const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  subscription_status: 'Status',
  subscription_plan: 'Plan',
  last_contact_date: 'Last Contact',
  total_spent: 'Total Spent',
};

export function ColumnSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');

  const { data: columns = [] } = useColumnVisibility();
  const { data: customFields = [] } = useCustomFields();
  const updateColumn = useUpdateColumnVisibility();
  const createField = useCreateCustomField();
  const deleteField = useDeleteCustomField();
  const updateField = useUpdateCustomField();

  const handleAddField = () => {
    if (newFieldName.trim()) {
      createField.mutate({ name: newFieldName.trim(), field_type: newFieldType });
      setNewFieldName('');
      setNewFieldType('text');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Column Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Built-in Columns</h4>
            <div className="space-y-3">
              {columns.map((col) => (
                <div key={col.id} className="flex items-center justify-between">
                  <Label htmlFor={col.column_name}>{COLUMN_LABELS[col.column_name] || col.column_name}</Label>
                  <Switch
                    id={col.column_name}
                    checked={col.is_visible}
                    onCheckedChange={(checked) => 
                      updateColumn.mutate({ column_name: col.column_name, is_visible: checked })
                    }
                    disabled={col.column_name === 'name'}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Custom Fields</h4>
            <div className="space-y-3">
              {customFields.map((field) => (
                <div key={field.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm">{field.name}</span>
                    <span className="text-xs text-muted-foreground">({field.field_type})</span>
                  </div>
                  <Switch
                    checked={field.is_visible}
                    onCheckedChange={(checked) => 
                      updateField.mutate({ id: field.id, is_visible: checked })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteField.mutate(field.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {customFields.length === 0 && (
                <p className="text-sm text-muted-foreground">No custom fields yet</p>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Add Custom Field</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Field name"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="flex-1"
              />
              <Select value={newFieldType} onValueChange={setNewFieldType}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddField} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
