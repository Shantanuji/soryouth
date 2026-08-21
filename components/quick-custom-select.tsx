'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSettingsByType, addSetting, deleteSetting } from '@/app/(app)/settings/actions';
import type { CustomSetting, SettingType } from '@/types';

interface QuickCustomSelectProps {
  settingType: SettingType;
  value: string | undefined;
  onChange: (val: string) => void;
  placeholder?: string;
  unitSuffix?: string;
  defaultOptions?: string[];
}

export function QuickCustomSelect({
  settingType,
  value,
  onChange,
  placeholder = 'Select option',
  unitSuffix = '',
  defaultOptions = [],
}: QuickCustomSelectProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<CustomSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      let list = await getSettingsByType(settingType);
      if (list.length === 0 && defaultOptions.length > 0) {
        for (const opt of defaultOptions) {
          const res = await addSetting(settingType, opt);
          if (res && 'id' in res) {
            list.push(res);
          }
        }
      }
      setItems(list);
    } catch (e) {
      console.error(`Failed to load items for ${settingType}:`, e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [settingType]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newValue.trim();
    if (!trimmed) return;

    setIsAdding(true);
    try {
      const res = await addSetting(settingType, trimmed);
      if ('error' in res) {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      } else {
        toast({ title: 'Saved to Database', description: `"${trimmed}" added successfully.` });
        setItems(prev => {
          const exists = prev.some(i => i.id === res.id);
          return exists ? prev : [...prev, res];
        });
        onChange(res.name);
        setNewValue('');
        setIsAddOpen(false);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to add item', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const res = await deleteSetting(id);
      if (res.success) {
        toast({ title: 'Deleted', description: `"${name}" removed from database.` });
        setItems(prev => prev.filter(i => i.id !== id));
        if (value === name) {
          const remaining = items.filter(i => i.id !== id);
          onChange(remaining.length > 0 ? remaining[0].name : '');
        }
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to delete item', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete item', variant: 'destructive' });
    }
  };

  const selectedValue = value || '';

  const handleSelectChange = (val: string) => {
    if (val === '__ADD_NEW__') {
      setIsAddOpen(true);
    } else if (val === '__MANAGE__') {
      setIsManageOpen(true);
    } else {
      onChange(val);
    }
  };

  return (
    <div className="relative w-full">
      <Select
        value={selectedValue}
        onValueChange={handleSelectChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full h-8 text-xs font-medium px-2.5">
          <SelectValue placeholder={isLoading ? 'Loading...' : placeholder}>
            {selectedValue ? `${selectedValue}${unitSuffix}` : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {items.map(item => (
            <SelectItem key={item.id} value={item.name} className="text-xs font-medium">
              {item.name}{unitSuffix}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="__ADD_NEW__" className="text-xs text-primary font-semibold cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add New Option...
            </span>
          </SelectItem>
          <SelectItem value="__MANAGE__" className="text-xs text-muted-foreground font-normal cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> Manage / Delete Options...
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Add New Option Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Add New Option</DialogTitle>
            <DialogDescription className="text-xs">
              This option will be saved permanently to your database.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 pt-2">
            <Input
              autoFocus
              placeholder={`e.g. ${unitSuffix ? '680' : 'New Option Name'}`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-3"
                onClick={() => { setIsAddOpen(false); setNewValue(''); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs px-4"
                disabled={!newValue.trim() || isAdding}
              >
                {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save & Select'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage/Delete Dialog */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Manage Options</DialogTitle>
            <DialogDescription className="text-xs">
              Remove options from the database.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-1 py-2">
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No options found.</p>
            ) : (
              items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-muted/60 text-xs"
                >
                  <span className="font-medium">{item.name}{unitSuffix}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(item.id, item.name)}
                    title={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
