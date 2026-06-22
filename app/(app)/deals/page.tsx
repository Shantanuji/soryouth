

'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Handshake, Loader2, Trash2, Search, IndianRupee } from 'lucide-react';
import { DEAL_PIPELINES, type DealPipelineType, type DealStage } from '@/lib/constants';
import { DealsKanbanView } from './deals-kanban-view';
import { DealForm, type DealFormValues } from './deal-form';
import type { User, Client, Deal } from '@/types';
import { getUsers } from '@/app/(app)/users/actions';
import { getActiveClients } from '@/app/(app)/clients-list/actions';
import { useToast } from '@/hooks/use-toast';
import { createOrUpdateDeal, getAllDeals, updateDealStage, deleteDeal } from './actions';
import { format } from 'date-fns';
import { DragDropContext, type DropResult, Droppable } from '@hello-pangea/dnd';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DealsPage() {
  const [selectedPipeline, setSelectedPipeline] = useState<DealPipelineType>('Solar PV Plant');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialStage, setInitialStage] = useState<DealStage | undefined>();
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [dealToComplete, setDealToComplete] = useState<Deal | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);


  const refreshData = async () => {
      const [fetchedUsers, fetchedClients, fetchedDeals] = await Promise.all([
        getUsers(),
        getActiveClients(),
        getAllDeals(),
      ]);
      setUsers(fetchedUsers);
      setClients(fetchedClients);
      setDeals(fetchedDeals);
      setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    refreshData();
  }, []);

  const dealsForPipeline = useMemo(() => {
    return deals.filter(d => {
        if (d.pipeline !== selectedPipeline) return false;

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            const dealValueString = String(d.dealValue);
            const kilowattString = String(d.kilowatt);

            return (
                d.clientName.toLowerCase().includes(lowercasedTerm) ||
                (d.phone && d.phone.includes(lowercasedTerm)) ||
                dealValueString.includes(lowercasedTerm) ||
                (d.kilowatt != null && kilowattString.includes(lowercasedTerm))
            );
        }
        
        return true;
    });
  }, [deals, selectedPipeline, searchTerm]);

  const stages = DEAL_PIPELINES[selectedPipeline];
  const totalDeals = dealsForPipeline.length;
  const totalValue = dealsForPipeline.reduce((sum, deal) => sum + deal.dealValue, 0);

  const handleOpenForm = (stage: DealStage) => {
    setInitialStage(stage);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: DealFormValues) => {
    startTransition(async () => {
        const result = await createOrUpdateDeal({
            ...data,
            poWoDate: format(data.poWoDate, 'yyyy-MM-dd'),
        });
        if (result) {
            toast({
                title: "Deal Saved",
                description: `Deal for ${result.clientName} has been saved.`,
                variant: "success",
            });
            await refreshData();
            setIsFormOpen(false);
        } else {
            toast({ title: "Error", description: "Could not save deal.", variant: "destructive" });
        }
    });
  };

  const confirmDeleteDeal = () => {
    if (!dealToDelete) return;

    startTransition(async () => {
      const result = await deleteDeal(dealToDelete.id);
      if (result.success) {
        toast({ title: "Deal Deleted", description: `Deal "${dealToDelete.clientName}" has been deleted.`, variant: "success" });
        await refreshData();
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete deal.", variant: "destructive" });
      }
      setDealToDelete(null);
      setIsAlertOpen(false);
    });
  };

  const confirmCompleteDeal = () => {
    if (!dealToComplete) return;
    const originalStage = dealToComplete.stage;
    const dealId = dealToComplete.id;

    // No optimistic update here as it's a final state
    
    startTransition(async () => {
        const updatedDealResult = await updateDealStage(dealId, 'Completed');
        if (updatedDealResult.success && updatedDealResult.deal) {
           toast({ title: "Deal Completed", description: `${updatedDealResult.deal.clientName} moved to Completed.`, variant: "success" });
           await refreshData();
        } else {
          toast({ title: "Error", description: updatedDealResult.error || "Could not complete deal.", variant: "destructive" });
          // No revert needed as we didn't do an optimistic update
        }
    });
    setDealToComplete(null);
    setIsCompleteConfirmOpen(false);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    const dealToMove = deals.find(d => d.id === draggableId);
    if (!dealToMove) return;

    // Handle dropping into the delete zone
    if (destination.droppableId === 'delete-zone') {
      setDealToDelete(dealToMove);
      setIsAlertOpen(true);
      return;
    }

    if (destination.droppableId === 'Completed') {
      setDealToComplete(dealToMove);
      setIsCompleteConfirmOpen(true);
      return;
    }
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }
    
    const startStage = stages.find(s => s === source.droppableId);
    const finishStage = stages.find(s => s === destination.droppableId);

    if (startStage && finishStage && startStage !== finishStage) {
      // Optimistically update the UI
      setDeals(prevDeals =>
        prevDeals.map(deal =>
          deal.id === draggableId ? { ...deal, stage: finishStage } : deal
        )
      );

      // Call the server action
      startTransition(async () => {
        const updatedDealResult = await updateDealStage(draggableId, finishStage);
        if (updatedDealResult.success && updatedDealResult.deal) {
           toast({ title: "Deal Stage Updated", description: `${updatedDealResult.deal.clientName} moved to ${finishStage}.`, variant: "success" });
           await refreshData(); // Re-fetch to ensure consistency
        } else {
          // Revert UI on failure
          toast({ title: "Error", description: updatedDealResult.error || "Could not update deal stage.", variant: "destructive" });
          setDeals(prevDeals =>
            prevDeals.map(deal =>
              deal.id === draggableId ? { ...deal, stage: startStage } : deal
            )
          );
        }
      });
    }
  };

  if (isLoading) {
    return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <>
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-card p-4 rounded-xl shadow-sm border border-border/60">
        <PageHeader
            title={`Deals Pipeline`}
            icon={Handshake}
        />
        
        <div className="flex items-center gap-3">
            <Droppable droppableId="delete-zone">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex items-center px-4 py-2 transition-all duration-300 rounded-lg border-2 border-dashed ${
                          snapshot.isDraggingOver 
                            ? 'border-destructive bg-destructive/10 text-destructive scale-105 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                            : 'border-muted bg-muted/50 text-muted-foreground'
                        }`}
                    >
                        <Trash2 className={`h-5 w-5 mr-2 ${snapshot.isDraggingOver ? 'animate-bounce' : ''}`} />
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {snapshot.isDraggingOver ? 'Drop to Delete!' : 'Drag here to delete'}
                        </span>
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            <div className="h-8 w-px bg-border mx-1"></div>
            
            <div className="flex items-center gap-2">
                 <Button variant="secondary" size="icon" onClick={() => setIsSearchOpen(true)} className="rounded-full shadow-sm hover:shadow">
                  <Search className="h-4 w-4" />
                </Button>
                <div className="w-[200px]">
                <Select value={selectedPipeline} onValueChange={(value) => setSelectedPipeline(value as DealPipelineType)}>
                    <SelectTrigger className="font-semibold shadow-sm rounded-lg bg-background">
                    <SelectValue placeholder="Select a pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                    {Object.keys(DEAL_PIPELINES).map(pipeline => (
                        <SelectItem key={pipeline} value={pipeline} className="font-medium">{pipeline}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
            </div>
        </div>
      </div>
      
      {/* Pipeline Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-primary/10 to-transparent p-4 rounded-xl border border-primary/20 flex flex-col justify-center">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Total Deals in Pipeline</p>
          <p className="text-2xl font-black text-foreground">{totalDeals}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-center">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Total Pipeline Value</p>
          <p className="text-2xl font-black text-foreground flex items-center">
            <IndianRupee className="h-5 w-5 mr-1" />
            {totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
      
      <DealsKanbanView
        stages={stages}
        deals={dealsForPipeline}
        onAddDeal={handleOpenForm}
      />
    </DragDropContext>
       <DealForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        users={users}
        clients={clients}
        pipeline={selectedPipeline}
        initialStage={initialStage}
      />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the deal for "{dealToDelete?.clientName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDealToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDeal} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete Deal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
       <AlertDialog open={isCompleteConfirmOpen} onOpenChange={setIsCompleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Deal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move the deal for "{dealToComplete?.clientName}" to the "Completed" stage? This is a final step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDealToComplete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCompleteDeal} disabled={isPending}>
              {isPending ? 'Completing...' : 'Yes, Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {isSearchOpen && (
        <AlertDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Search Deals</AlertDialogTitle>
              <AlertDialogDescription>
                Search by client name, mobile no, deal value, or kW.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="search-input" className="sr-only">Search</Label>
              <Input 
                id="search-input"
                placeholder="e.g. Green Valley, 987..., 500000, 50kW"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setSearchTerm(''); setIsSearchOpen(false);}}>Clear & Close</AlertDialogCancel>
              <AlertDialogAction onClick={() => setIsSearchOpen(false)}>Apply</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
