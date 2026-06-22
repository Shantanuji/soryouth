'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IndianRupee, PlusCircle, Building2, Phone, CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DealStage } from '@/lib/constants';
import type { Deal } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface DealsKanbanViewProps {
  stages: readonly DealStage[];
  deals: Deal[];
  onAddDeal: (stage: DealStage) => void;
}

const getStageTheme = (stage: string) => {
  const normalized = stage.toLowerCase();
  if (normalized.includes('new') || normalized.includes('lead')) {
    return {
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      borderTop: 'border-t-blue-500',
      text: 'text-blue-700 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
      cardBorder: 'border-l-blue-400 dark:border-l-blue-600'
    };
  }
  if (normalized.includes('negotiat') || normalized.includes('proposal') || normalized.includes('site')) {
    return {
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      borderTop: 'border-t-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      cardBorder: 'border-l-amber-400 dark:border-l-amber-600'
    };
  }
  if (normalized.includes('won') || normalized.includes('complet')) {
    return {
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      borderTop: 'border-t-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      cardBorder: 'border-l-emerald-400 dark:border-l-emerald-600'
    };
  }
  if (normalized.includes('lost') || normalized.includes('drop')) {
    return {
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
      borderTop: 'border-t-rose-500',
      text: 'text-rose-700 dark:text-rose-400',
      badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
      cardBorder: 'border-l-rose-400 dark:border-l-rose-600'
    };
  }
  // Default
  return {
    bg: 'bg-slate-50/50 dark:bg-slate-800/30',
    borderTop: 'border-t-slate-400',
    text: 'text-slate-700 dark:text-slate-300',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    cardBorder: 'border-l-slate-300 dark:border-l-slate-600'
  };
};

export function DealsKanbanView({ stages, deals, onAddDeal }: DealsKanbanViewProps) {
  const dealsByStage = (stage: DealStage) => deals.filter(deal => deal.stage === stage);

  return (
    <div className="flex gap-5 overflow-x-auto pb-6 px-1 custom-scrollbar">
      {stages.map((stage) => {
        const stageDeals = dealsByStage(stage);
        const stageTotalValue = stageDeals.reduce((sum, deal) => sum + deal.dealValue, 0);
        const theme = getStageTheme(stage);

        return (
          <Droppable droppableId={stage} key={stage}>
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`w-[320px] flex-shrink-0 flex flex-col rounded-xl border border-border/50 shadow-sm transition-all duration-300 max-h-[80vh] min-h-[60vh]
                  ${theme.bg} border-t-[3px] ${theme.borderTop}
                  ${snapshot.isDraggingOver ? 'ring-2 ring-primary/20 bg-muted/30 scale-[1.01]' : ''}
                `}
              >
                <div className="flex flex-col flex-grow">
                  {/* Column Header */}
                  <div className="flex flex-col p-4 border-b border-border/40 bg-background/40 backdrop-blur-sm rounded-t-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[15px] font-semibold text-foreground tracking-tight flex items-center gap-2">
                        {stage}
                        <Badge variant="secondary" className={`px-1.5 py-0 text-xs font-bold rounded-full ${theme.badge}`}>
                          {stageDeals.length}
                        </Badge>
                      </h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full hover:bg-background/80 hover:shadow-sm transition-all text-muted-foreground hover:text-foreground" 
                        onClick={() => onAddDeal(stage)}
                      >
                        <PlusCircle className="h-[18px] w-[18px]" />
                      </Button>
                    </div>
                    
                    {/* Stage Total Value */}
                    <div className="flex items-center text-sm font-medium">
                      <IndianRupee className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                      <span className="text-muted-foreground">
                        {stageTotalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Deals Container */}
                  <div className="space-y-3 p-3 min-h-[50vh] overflow-y-auto custom-scrollbar flex-grow">
                    {stageDeals.map((deal, index) => {
                      const daysOld = differenceInDays(new Date(), new Date(deal.createdAt));
                      const isStale = daysOld > 30;

                      return (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{...provided.draggableProps.style}}
                              className={`mb-3 outline-none`}
                            >
                              <Link href={`/deals/${deal.id}`} className="block outline-none group">
                                <Card className={`
                                  relative overflow-hidden bg-card border-l-[4px] ${theme.cardBorder}
                                  transition-all duration-200 ease-in-out
                                  ${snapshot.isDragging ? 'shadow-xl rotate-2 scale-105 z-50 ring-1 ring-primary/20' : 'shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-l-primary'}
                                `}>
                                  <CardContent className="p-4">
                                    {/* Client Name & Avatar */}
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1 min-w-0 pr-3">
                                        <h5 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                          {deal.clientName}
                                        </h5>
                                        {deal.kilowatt && (
                                           <p className="text-xs font-medium text-muted-foreground mt-0.5">
                                             {deal.kilowatt} kW System
                                           </p>
                                        )}
                                      </div>
                                      <Avatar className="h-7 w-7 border-2 border-background shadow-sm ring-1 ring-border/50">
                                        <AvatarImage src={`https://placehold.co/40x40.png?text=${deal.assignedTo?.charAt(0) || 'U'}`} />
                                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                          {deal.assignedTo?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>

                                    {/* Deal Value */}
                                    <div className="flex items-center mb-3">
                                      <div className="bg-primary/10 px-2 py-1 rounded-md flex items-center text-primary font-bold text-sm tracking-tight border border-primary/20">
                                        <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                                        {deal.dealValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                      </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/50">
                                      <div className="flex items-center max-w-[60%] truncate" title={deal.phone || deal.email || 'No contact'}>
                                        <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                                        <span className="truncate">{deal.phone || deal.email || 'No contact'}</span>
                                      </div>
                                      
                                      <div className={`flex items-center ${isStale ? 'text-rose-500 font-medium' : ''}`}>
                                        <CalendarDays className="h-3 w-3 mr-1" />
                                        {format(new Date(deal.poWoDate), 'dd MMM')}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
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
