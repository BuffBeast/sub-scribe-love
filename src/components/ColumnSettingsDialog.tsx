import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Plus, Trash2, GripVertical } from 'lucide-react';
import { useOrderedColumns, useUpdateColumnVisibility, useUpdateColumnOrder, COLUMN_LABELS } from '@/hooks/useColumnVisibility';
import { useCustomFields, useCreateCustomField, useDeleteCustomField, useUpdateCustomField } from '@/hooks/useCustomFields';
import { useDeviceTypes, useCreateDeviceType, useDeleteDeviceType } from '@/hooks/useDeviceTypes';
import { useServiceTypes, useCreateServiceType, useDeleteServiceType, DEFAULT_SERVICES } from '@/hooks/useServiceTypes';
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

// Default device types that are always available
const DEFAULT_DEVICES = ['Firestick', 'K8', '8X', 'M9', 'R69'];

function SortableColumnItem({
  col,
  onToggle,
  disabled,
}: {
  col: { column_name: string; is_visible: boolean; label: string };
  onToggle: (column_name: string, checked: boolean) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: col.column_name,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <Label htmlFor={col.column_name}>{col.label}</Label>
      </div>
      <Switch
        id={col.column_name}
        checked={col.is_visible}
        onCheckedChange={(checked) => onToggle(col.column_name, checked)}
        disabled={disabled}
      />
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

  const orderedColumns = useOrderedColumns();
  const { data: customFields = [] } = useCustomFields();
  const { data: deviceTypes = [] } = useDeviceTypes();
  const { data: serviceTypes = [] } = useServiceTypes();
  const updateColumn = useUpdateColumnVisibility();
  const updateOrder = useUpdateColumnOrder();
  const createField = useCreateCustomField();
  const deleteField = useDeleteCustomField();
  const updateField = useUpdateCustomField();
  const createDevice = useCreateDeviceType();
  const deleteDevice = useDeleteDeviceType();
  const createService = useCreateServiceType();
  const deleteService = useDeleteServiceType();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedColumns.findIndex((c) => c.column_name === active.id);
    const newIndex = orderedColumns.findIndex((c) => c.column_name === over.id);
    const reordered = arrayMove(orderedColumns, oldIndex, newIndex);

    updateOrder.mutate(
      reordered.map((col, idx) => ({ column_name: col.column_name, sort_order: idx }))
    );
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
            <h4 className="text-sm font-medium mb-1">Built-in Columns</h4>
            <p className="text-xs text-muted-foreground mb-3">Drag to reorder, toggle to show/hide</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedColumns.map((c) => c.column_name)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {orderedColumns.map((col) => (
                    <SortableColumnItem
                      key={col.column_name}
                      col={col}
                      onToggle={(name, checked) => updateColumn.mutate({ column_name: name, is_visible: checked })}
                      disabled={col.column_name === 'name'}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Custom Fields</h4>
            <div className="space-y-3">
              {customFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
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
                  {field.field_type === 'select' && field.options && (
                    <p className="text-xs text-muted-foreground ml-1">Options: {field.options.join(', ')}</p>
                  )}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteService.mutate(service.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="New service type..."
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddService} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteDevice.mutate(device.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="New device type..."
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddDevice} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
