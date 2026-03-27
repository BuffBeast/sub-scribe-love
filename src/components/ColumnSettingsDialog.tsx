import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Plus, Trash2, GripVertical, Pencil, Check, X } from 'lucide-react';
import { useOrderedColumns, useUpdateColumnVisibility, useUpdateColumnOrder, UnifiedColumn } from '@/hooks/useColumnVisibility';
import { useCustomFields, useCreateCustomField, useDeleteCustomField, useUpdateCustomField } from '@/hooks/useCustomFields';
import { useDeviceTypes, useCreateDeviceType, useDeleteDeviceType } from '@/hooks/useDeviceTypes';
import { useServiceTypes, useCreateServiceType, useDeleteServiceType, DEFAULT_SERVICES } from '@/hooks/useServiceTypes';
import { useAddonTypes, useCreateAddonType, useDeleteAddonType } from '@/hooks/useAddonTypes';
import { Separator } from '@/components/ui/separator';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DEFAULT_DEVICES = ['Firestick', 'K8', '8X', 'M9', 'R69'];

function SortableColumnItem({
  col,
  onToggle,
  onDelete,
  onEdit,
  disabled,
}: {
  col: UnifiedColumn;
  onToggle: (column_name: string, checked: boolean) => void;
  onDelete?: () => void;
  onEdit?: (updates: { name?: string; field_type?: string; options?: string[] | null }) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(col.label);
  const [editType, setEditType] = useState(col.customField?.field_type || 'text');
  const [editOptions, setEditOptions] = useState(
    (col.customField?.options as string[] | null)?.join(', ') || ''
  );

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: col.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    if (!onEdit || !editName.trim()) return;
    const options = editType === 'select' && editOptions.trim()
      ? editOptions.split(',').map(o => o.trim()).filter(o => o)
      : null;
    onEdit({ name: editName.trim(), field_type: editType, options });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditName(col.label);
    setEditType(col.customField?.field_type || 'text');
    setEditOptions((col.customField?.options as string[] | null)?.join(', ') || '');
    setEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="py-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0">
            <GripVertical className="h-4 w-4" />
          </button>
          <Label htmlFor={col.id} className="truncate">
            {col.label}
            {col.type === 'custom' && col.customField && (
              <span className="text-xs text-muted-foreground ml-1">({col.customField.field_type})</span>
            )}
          </Label>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && !editing && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          <Switch
            id={col.id}
            checked={col.is_visible}
            onCheckedChange={(checked) => onToggle(col.column_name, checked)}
            disabled={disabled}
          />
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      {editing && (
        <div className="ml-6 mt-2 space-y-2 p-2 rounded-md border border-border bg-muted/30">
          <div className="flex gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Field name"
              className="flex-1 h-8 text-sm"
            />
            <Select value={editType} onValueChange={setEditType}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="select">Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {editType === 'select' && (
            <Input
              value={editOptions}
              onChange={(e) => setEditOptions(e.target.value)}
              placeholder="Options (comma-separated)"
              className="h-8 text-sm"
            />
          )}
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
              <Check className="h-3.5 w-3.5 text-primary" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ColumnSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newAddonName, setNewAddonName] = useState('');

  const orderedColumns = useOrderedColumns();
  const { data: deviceTypes = [] } = useDeviceTypes();
  const { data: serviceTypes = [] } = useServiceTypes();
  const { data: addonTypes = [] } = useAddonTypes();
  const updateColumn = useUpdateColumnVisibility();
  const updateOrder = useUpdateColumnOrder();
  const createField = useCreateCustomField();
  const deleteField = useDeleteCustomField();
  const updateField = useUpdateCustomField();
  const createDevice = useCreateDeviceType();
  const deleteDevice = useDeleteDeviceType();
  const createService = useCreateServiceType();
  const deleteService = useDeleteServiceType();
  const createAddon = useCreateAddonType();
  const deleteAddon = useDeleteAddonType();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedColumns.findIndex((c) => c.id === active.id);
    const newIndex = orderedColumns.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(orderedColumns, oldIndex, newIndex);

    updateOrder.mutate(
      reordered.map((col, idx) => ({ column_name: col.column_name, sort_order: idx }))
    );
  };

  const handleToggle = (column_name: string, checked: boolean) => {
    updateColumn.mutate({ column_name, is_visible: checked });
  };

  const handleAddField = () => {
    if (newFieldName.trim()) {
      const options = newFieldType === 'select' && newFieldOptions.trim()
        ? newFieldOptions.split(',').map(o => o.trim()).filter(o => o)
        : undefined;
      createField.mutate({ name: newFieldName.trim(), field_type: newFieldType, options });
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
    }
  };

  const handleAddDevice = () => {
    if (newDeviceName.trim()) {
      createDevice.mutate(newDeviceName.trim());
      setNewDeviceName('');
    }
  };

  const handleAddService = () => {
    if (newServiceName.trim()) {
      createService.mutate(newServiceName.trim());
      setNewServiceName('');
    }
  };

  const handleAddAddon = () => {
    if (newAddonName.trim()) {
      createAddon.mutate(newAddonName.trim());
      setNewAddonName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Column Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Columns</h4>
            <p className="text-xs text-muted-foreground mb-3">Drag to reorder, toggle to show/hide</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedColumns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {orderedColumns.map((col) => (
                    <SortableColumnItem
                      key={col.id}
                      col={col}
                      onToggle={handleToggle}
                      onDelete={col.type === 'custom' && col.customField ? () => deleteField.mutate(col.customField!.id) : undefined}
                      onEdit={col.type === 'custom' && col.customField ? (updates) => updateField.mutate({ id: col.customField!.id, ...updates }) : undefined}
                      disabled={col.column_name === 'name'}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Add Custom Field</h4>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Field name"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="flex-1"
                />
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddField} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {newFieldType === 'select' && (
                <Input
                  placeholder="Options (comma-separated, e.g., Option 1, Option 2)"
                  value={newFieldOptions}
                  onChange={(e) => setNewFieldOptions(e.target.value)}
                />
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Service Types</h4>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Default services: {DEFAULT_SERVICES.join(', ')}</p>
              {serviceTypes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Custom services:</p>
                  {serviceTypes.map((service) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <span className="text-sm">{service.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteService.mutate(service.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Input placeholder="New service type..." value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} className="flex-1" />
                <Button onClick={handleAddService} size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Device Types</h4>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Default devices: {DEFAULT_DEVICES.join(', ')}</p>
              {deviceTypes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Custom devices:</p>
                  {deviceTypes.map((device) => (
                    <div key={device.id} className="flex items-center justify-between">
                      <span className="text-sm">{device.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteDevice.mutate(device.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Input placeholder="New device type..." value={newDeviceName} onChange={(e) => setNewDeviceName(e.target.value)} className="flex-1" />
                <Button onClick={handleAddDevice} size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
