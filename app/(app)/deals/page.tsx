

'use client';

import { useState, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Handshake, Loader2, Trash2 } from 'lucide-react';
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
  const [isAlertOpen, setIsAlertOpen] = useState(false);


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

  const stages = DEAL_PIPELINES[selectedPipeline];
  const dealsForPipeline = deals.filter(d => d.pipeline === selectedPipeline);
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
        toast({ title: "Deal Deleted", description: `Deal "${dealToDelete.clientName}" has been deleted.` });
        await refreshData();
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete deal.", variant: "destructive" });
      }
      setDealToDelete(null);
      setIsAlertOpen(false);
    });
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
           toast({ title: "Deal Stage Updated", description: `${updatedDealResult.deal.clientName} moved to ${finishStage}.` });
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
      <div className="flex items-center justify-between mb-4">
        <PageHeader
            title={`Deals (${totalDeals} - ${totalValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })})`}
            icon={Handshake}
        />
        <Droppable droppableId="delete-zone">
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-4 border-2 border-dashed rounded-full transition-colors duration-200 ${snapshot.isDraggingOver ? 'border-destructive bg-destructive/20' : 'border-muted-foreground/50'}`}
                >
                    <Trash2 className={`h-8 w-8 transition-colors ${snapshot.isDraggingOver ? 'text-destructive' : 'text-muted-foreground'}`} />
                     {provided.placeholder}
                </div>
            )}
        </Droppable>
        <div className="flex items-center gap-2">
            <div className="w-48">
              <Select value={selectedPipeline} onValueChange={(value) => setSelectedPipeline(value as DealPipelineType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(DEAL_PIPELINES).map(pipeline => (
                    <SelectItem key={pipeline} value={pipeline}>{pipeline}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
    </>
  );
}
