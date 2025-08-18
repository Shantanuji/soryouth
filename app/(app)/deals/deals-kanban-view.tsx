
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IndianRupee, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DealStage } from '@/lib/constants';
import type { Deal } from '@/types';
import { format } from 'date-fns';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import Link from 'next/link';

interface DealsKanbanViewProps {
  stages: readonly DealStage[];
  deals: Deal[];
  onAddDeal: (stage: DealStage) => void;
}

export function DealsKanbanView({ stages, deals, onAddDeal }: DealsKanbanViewProps) {
  const dealsByStage = (stage: DealStage) => deals.filter(deal => deal.stage === stage);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageDeals = dealsByStage(stage);
        const stageTotalValue = stageDeals.reduce((sum, deal) => sum + deal.dealValue, 0);

        return (
          <Droppable droppableId={stage} key={stage}>
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`w-72 flex-shrink-0 transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-primary/10' : 'bg-muted/50'}`}
              >
                <Card className="bg-transparent max-h-[80vh] min-h-[60vh] flex flex-col shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3">
                    <div className="flex flex-col">
                      <CardTitle className="text-base font-medium">{stage} ({stageDeals.length})</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <IndianRupee className="h-3 w-3 mr-0.5" />
                        {stageTotalValue.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddDeal(stage)}>
                      <PlusCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 p-2 min-h-[60vh] max-h-[60vh] overflow-auto ">
                    {stageDeals.map((deal, index) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{...provided.draggableProps.style}}
                            className={`mb-3 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <Link href={`/deals/${deal.id}`}>
                              <Card className="shadow-sm hover:shadow-md hover:border-primary/50">
                                <CardContent className="p-3">
                                  <p className="font-bold truncate">{deal.clientName}</p>
                                  <p className="text-sm text-muted-foreground">{deal.phone || deal.email || 'No contact info'}</p>
                                  <p className="text-sm flex items-center">
                                    <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                                    {deal.dealValue.toLocaleString('en-IN')}
                                  </p>
                                  <div className="flex justify-between items-center mt-2">
                                    <p className="text-xs text-muted-foreground">PO: {format(new Date(deal.poWoDate), 'dd MMM yy')}</p>
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={`https://placehold.co/40x40.png?text=${deal.assignedTo?.charAt(0) || 'U'}`} data-ai-hint="user avatar" />
                                      <AvatarFallback>{deal.assignedTo?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              </div>
            )}
          </Droppable>
        );
      })}
    </div>
  );
}
