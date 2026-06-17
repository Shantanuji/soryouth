
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
                className={`w-72 flex-shrink-0 transition-all duration-200 rounded-xl border p-2 flex flex-col max-h-[80vh] min-h-[60vh] ${snapshot.isDraggingOver ? 'bg-primary/5 border-primary/30 shadow-sm' : 'bg-muted/15 border-border/70 border-solid'}`}
              >
                <div className="flex flex-col bg-transparent flex-grow shadow-none">
                  <div className="flex flex-row items-center justify-between pb-3 pt-1 px-1">
                    <div className="flex flex-col">
                      <h4 className="text-sm font-bold text-foreground">{stage} ({stageDeals.length})</h4>
                      <p className="text-[11px] text-muted-foreground flex items-center font-medium mt-0.5">
                        <IndianRupee className="h-3 w-3 mr-0.5" />
                        {stageTotalValue.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-circle hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => onAddDeal(stage)}>
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3 p-1 min-h-[50vh] max-h-[65vh] overflow-y-auto">
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
                              <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden hover:shadow-md hover:border-primary/45 transition-all duration-200 bg-card">
                                <CardContent className="p-3.5">
                                  <p className="text-sm font-bold text-foreground truncate">{deal.clientName}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{deal.phone || deal.email || 'No contact info'}</p>
                                  <p className="text-sm font-extrabold text-primary flex items-center mt-1.5">
                                    <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                                    {deal.dealValue.toLocaleString('en-IN')}
                                  </p>
                                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/40">
                                    <p className="text-[10px] text-muted-foreground font-medium">PO: {format(new Date(deal.poWoDate), 'dd MMM yy')}</p>
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
                  </div>
                </div>
              </div>
            )}
          </Droppable>
        );
      })}
    </div>
  );
}
