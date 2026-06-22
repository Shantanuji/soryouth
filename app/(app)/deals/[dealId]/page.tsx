
'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { DEAL_PIPELINES, FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES } from '@/lib/constants';
import type { Deal, User, FollowUp, FollowUpStatus, AddActivityData, FollowUpType, DealStage, Client } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { ChevronLeft, CheckCircle, Phone, MessageSquare, Mail, MessageCircle, UserCircle2, Loader2, Save, Send, Video, Building, IndianRupee, Calendar as CalendarIcon, Edit, Link2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getDealById, addDealActivity, updateDeal, getActivitiesForDeal, updateDealStage, updateDealEffectiveDate, createOrUpdateDeal, } from '@/app/(app)/deals/actions';
import { getUsers } from '@/app/(app)/users/actions';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { TaskCompletionToast } from '@/components/task-completion-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { sendCallNotification } from '@/lib/fcm';
import { useSession } from '@/hooks/use-sessions';
import { useIsMobile } from '@/hooks/use-mobile';
import { DealForm, type DealFormValues } from '../deal-form';

const ActivityIcon = ({ type, className }: { type: string, className?: string }) => {
  const defaultClassName = "h-4 w-4";
  const finalClassName = cn(defaultClassName, className);

  switch (type) {
    case 'Call': return <Phone className={finalClassName} />;
    case 'SMS': return <MessageSquare className={finalClassName} />;
    case 'Email': return <Mail className={finalClassName} />;
    case 'Meeting': return <Video className={finalClassName} />;
    case 'Visit': return <Building className={finalClassName} />;
    default: return <Send className={finalClassName} />;
  }
};


export default function DealDetailsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const session = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const dealId = typeof params.dealId === 'string' ? params.dealId : null;
  const { toast } = useToast();
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const [isFormPending, startFormTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isAmcDateUpdating, startAmcDateUpdateTransition] = useTransition();
  
  const [activities, setActivities] = useState<FollowUp[]>([]);
  const [isActivitiesLoading, setActivitiesLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [activityComment, setActivityComment] = useState('');
  const [activityType, setActivityType] = useState<FollowUpType>(FOLLOW_UP_TYPES[0]);
  const [activityDate, setActivityDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [activityTime, setActivityTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [activityStatus, setActivityStatus] = useState<FollowUpStatus>(FOLLOW_UP_STATUSES[0]);
  
  const [taskForUser, setTaskForUser] = useState<string | undefined>(undefined);
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  
  const [effectiveAmcDate, setEffectiveAmcDate] = useState<Date | undefined>();

  const dealForForm = useMemo(() => {
    if (!deal) return undefined;
    return {
      id: deal.id,
      clientId: deal.clientId ?? undefined,
      clientName: deal.clientName,
      contactPerson: deal.contactPerson,
      email: deal.email ?? '',
      phone: deal.phone ?? '',
      pipeline: deal.pipeline,
      dealFor: deal.dealFor ?? undefined,
      source: deal.source ?? undefined,
      stage: deal.stage,
      dealValue: deal.dealValue ?? 0,
      kilowatt: deal.kilowatt ?? undefined,
      assignedTo: deal.assignedTo ?? undefined,
      poWoDate: deal.poWoDate && isValid(parseISO(deal.poWoDate)) ? parseISO(deal.poWoDate) : new Date(),
      amcDealValue: deal.linkedAmcDeal?.dealValue || 0,
      amcDurationInMonths: deal.amcDurationInMonths ?? undefined,
      notes: deal.notes ?? '',
    };
  }, [deal]);

  const fetchDetails = async () => {
    if(!dealId) return;
    setDeal(undefined);
    try {
      const fetchedDeal = await getDealById(dealId);
      setDeal(fetchedDeal);

      if (fetchedDeal) {
          const [fetchedUsers, fetchedActivities] = await Promise.all([
            getUsers(),
            getActivitiesForDeal(fetchedDeal.id),
          ]);
          setUsers(fetchedUsers);
          setActivities(fetchedActivities);
          if(fetchedDeal?.amcEffectiveDate) {
            setEffectiveAmcDate(parseISO(fetchedDeal.amcEffectiveDate));
          }
          if (fetchedUsers.length > 0) {
            setTaskForUser(fetchedDeal?.assignedTo || fetchedUsers[0].name);
          }
      } else {
          setDeal(null);
      }
    } catch (error) {
      console.error("Failed to fetch deal details:", error);
      setDeal(null);
      toast({
        title: "Error",
        description: "Could not load deal details.",
        variant: "destructive",
      });
    } finally {
        setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) {
      fetchDetails();
    } else {
      setDeal(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);


  const handleSaveActivity = () => {
    if (!deal) return;
    if (!activityComment) 
      return toast({title: "Couldn't Save Activity !", description: "Please Enter the Comment First.", variant: "destructive"});

    startFormTransition(async () => {
      const isTask = taskDate && taskTime;
      const activityCategory = isTask ? 'Task' : 'Followup';

      const activityData: AddActivityData = {
        followupOrTask: activityCategory,
        dealId: deal.id,
        type: activityType,
        date: activityDate,
        time: activityTime,
        status: activityStatus,
        comment: activityComment,
        ...(isTask && {
          taskForUser,
          taskDate,
          taskTime,
        }),
      };

      const newActivity = await addDealActivity(activityData);

      if (newActivity) {
        toast({
          title: `${activityCategory} Saved`,
          description: `${activityType} for deal ${deal.clientName} has been recorded.`,
        });
        setActivities(prev => [newActivity, ...prev]);
        setActivityComment('');
        const updatedDeal = await getDealById(deal.id);
        if (updatedDeal) {
          setDeal(updatedDeal);
        }

        if (users.length > 0) {
            setTaskForUser(updatedDeal?.assignedTo || users[0].name);
        }
        setTaskDate('');
        setTaskTime('');
      } else {
        toast({
          title: 'Error',
          description: `Failed to save ${activityCategory}.`,
          variant: 'destructive',
        });
      }
    });
  };

  const handleAttributeChange = (
    key: 'assignedTo' | 'notes',
    value: string
    ) => {
      if (!deal || isUpdating) return;
      const originalDeal = { ...deal };

      // Optimistic UI update
      setDeal(prev => prev ? { ...prev, [key]: value } : null);

      startUpdateTransition(async () => {
        const result = await updateDeal(deal.id, { [key]: value });
        if (result) {
            setDeal(result);
            toast({
                title: `${key.charAt(0).toUpperCase() + key.slice(1)} Updated`,
                description: `Deal ${key} has been updated.`,
            });
        } else {
            setDeal(originalDeal); // Revert on failure
            toast({
                title: "Update Failed",
                description: `Could not update deal ${key}.`,
                variant: "destructive",
            });
        }
      });
    };
  
  const handleStageChange = (newStage: DealStage) => {
    if (!deal || isUpdating) return;
    const originalDeal = { ...deal };
    
    setDeal(prev => (prev ? { ...prev, stage: newStage } : null));

    startUpdateTransition(async () => {
        const result = await updateDealStage(deal.id, newStage);
        if (result.success && result.deal) {
            setDeal(result.deal);
            toast({
                title: "Deal Stage Updated",
                description: `Deal stage set to "${newStage}".`,
            });
            if(result.tasksCreatedCount && result.tasksCreatedCount > 0) {
              toast({
                title: "AMC Tasks Created",
                description: `${result.tasksCreatedCount} quarterly tasks have been automatically scheduled.`
              });
            }
        } else {
            setDeal(originalDeal);
            toast({
                title: "Update Failed",
                description: result.error || "Could not update deal stage.",
                variant: "destructive",
            });
        }
    });
  };

  const handleUpdateAmcDate = () => {
    if (!deal || !effectiveAmcDate || isAmcDateUpdating) return;
    startAmcDateUpdateTransition(async () => {
      const result = await updateDealEffectiveDate(deal.id, effectiveAmcDate);
      if (result.success && result.deal) {
        setDeal(result.deal);
        setEffectiveAmcDate(parseISO(result.deal.amcEffectiveDate!));
        toast({
          title: "Effective Date Updated",
          description: `AMC effective date has been updated.`
        });
        if (result.tasksCreatedCount && result.tasksCreatedCount > 0) {
          toast({
            title: "AMC Tasks Regenerated",
            description: `${result.tasksCreatedCount} quarterly tasks have been rescheduled based on the new date.`
          });
        }
      } else {
        toast({ title: "Update Failed", description: result.error, variant: "destructive" });
      }
    });
  }

  const handleInitiateCall = () => {
    if (!deal || !deal.phone) {
        toast({ title: "Cannot Initiate Call", description: "Deal must have a phone number and be assigned to a user.", variant: "destructive" });
        return;
    }
    const loggedInUser = users.find(u => u.id === session?.userId);
    if (!loggedInUser?.deviceId) {
        toast({ title: "Cannot Initiate Call", description: "You do not have a registered mobile device. Please login to the mobile app.", variant: "destructive" });
        return;
    }

    startUpdateTransition(async () => {
        toast({ title: "Initiating Call...", description: "Sending notification to your mobile device." });
        const result = await sendCallNotification(loggedInUser.deviceId!, deal.phone!, deal.clientName);
        if (result.success) {
            toast({ title: "Notification Sent", description: "Check your mobile device to place the call." });
        } else {
            toast({ title: "Failed to Send Notification", description: result.error, variant: "destructive" });
        }
    });
  };

  const handleDealSubmit = (data: DealFormValues) => {
    if (!dealId) return;
    startFormTransition(async () => {
      const result = await createOrUpdateDeal({
        ...data,
        id: dealId,
        poWoDate: format(data.poWoDate, 'yyyy-MM-dd'),
      });
      if (result) {
        toast({
          title: "Deal Updated",
          description: `Deal for ${result.clientName} has been updated.`,
        });
        await fetchDetails();
        setIsFormOpen(false);
      } else {
        toast({ title: "Error", description: "Could not update deal.", variant: "destructive" });
      }
    });
  };

  const CallButton = () => {
    if (!deal?.phone) {
      return (
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled>
          <Phone className="h-5 w-5" />
        </Button>
      );
    }
    if (isMobile) {
      return (
        <a href={`tel:${deal.phone}`}>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Phone className="h-5 w-5" />
          </Button>
        </a>
      );
    }
    return (
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled={isUpdating} onClick={handleInitiateCall}>
        <Phone className="h-5 w-5" />
      </Button>
    );
  };

  if (deal === undefined) {
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading Deal Details...</p>
        </div>
    );
  }

  if (deal === null) {
    return (
        <div className="flex flex-col flex-1 items-center justify-center h-full p-8 text-center">
            <UserCircle2 className="h-16 w-16 mb-4 text-destructive" />
            <h2 className="text-2xl font-semibold mb-2">Deal Not Found</h2>
            <p className="text-muted-foreground mb-6">
                The deal you are looking for does not exist or could not be loaded.
            </p>
            <Button onClick={() => router.push('/deals')}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Deals
            </Button>
        </div>
    );
  }

  const creationDateTime = deal.createdAt && isValid(parseISO(deal.createdAt)) ? format(parseISO(deal.createdAt), 'dd-MM-yyyy HH:mm') : 'N/A';
  const poWoDateDisplay = deal.poWoDate && isValid(parseISO(deal.poWoDate)) ? format(parseISO(deal.poWoDate), 'dd MMM, yyyy') : 'N/A';
  const stagesForPipeline = DEAL_PIPELINES[deal.pipeline] || [];

  const dealTitle = `${deal.clientName}${deal.dealFor ? ` - ${deal.dealFor}` : ''}${deal.kilowatt ? ` - ${deal.kilowatt} kW` : ''}`;

  return (
    <>
    {searchParams.get('from_task') && <TaskCompletionToast taskId={searchParams.get('from_task')!} />}
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center px-6 py-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-xl font-semibold font-headline">Deal Details</h1>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back To List
            </Button>
        </div>
      </div>

      <div className="flex-grow flex flex-col bg-muted/20 overflow-hidden pt-4">
        {/* CORPORATE HEADER PANEL */}
        <div className="bg-card border-y shadow-sm px-6 py-4 shrink-0 z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            {/* Identity */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{deal.clientName}</h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{deal.pipeline}</Badge>
                <Badge variant="outline" className="text-muted-foreground">{deal.stage}</Badge>
              </div>
              <div className="flex items-center gap-5 text-sm text-muted-foreground font-medium">
                {deal.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {deal.phone}</span>}
                {deal.dealFor && <span className="flex items-center gap-1.5"><Building className="h-4 w-4" /> {deal.dealFor}</span>}
                <span className="flex items-center gap-1.5"><CalendarIcon className="h-4 w-4" /> Created {creationDateTime}</span>
              </div>
            </div>
            
            {/* Quick Stats & Assignment */}
            <div className="flex items-center gap-6 md:border-l border-border/50 md:pl-6">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Deal Value</p>
                <p className="text-lg font-bold flex items-center text-foreground"><IndianRupee className="h-3.5 w-3.5 mr-0.5 text-muted-foreground"/> {deal.dealValue?.toLocaleString('en-IN') || 0}</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Created By</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Avatar className="h-6 w-6 border bg-muted"><AvatarFallback className="text-[10px] text-muted-foreground">{deal.createdBy?.charAt(0) || 'S'}</AvatarFallback></Avatar>
                  <span className="text-sm font-semibold">{deal.createdBy || 'System'}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Assigned To</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Avatar className="h-6 w-6 border bg-muted"><AvatarFallback className="text-[10px] text-muted-foreground">{deal.assignedTo?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                  <Select value={deal.assignedTo || ''} onValueChange={(value) => handleAttributeChange('assignedTo', value)} disabled={isUpdating}>
                      <SelectTrigger className="h-6 border-0 bg-transparent p-0 w-auto shadow-none text-sm font-semibold focus:ring-0 [&>svg]:hidden hover:underline">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>{users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:border-l border-border/50 md:pl-6">
               <CallButton />
               <Button variant="outline" className="h-9 px-3 font-medium bg-background" onClick={() => setIsFormOpen(true)}>
                 <Edit className="h-4 w-4 mr-2"/> Edit Deal
               </Button>
            </div>
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div className="flex-grow overflow-y-auto p-6 scrollbar-thin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Activity Logging & Form */}
            <div className="lg:col-span-5 space-y-6 sticky top-0 max-h-[calc(100vh-150px)] overflow-y-auto scrollbar-none pb-4">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-0 border-b px-4 py-3 bg-muted/10 rounded-t-xl">
                  <CardTitle className="text-lg">Activity & Follow-up</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-1">
                      <Select value={activityType} onValueChange={(val) => setActivityType(val as FollowUpType)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{FOLLOW_UP_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-1"><Input type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)} /></div>
                    <div className="sm:col-span-1"><Input type="time" value={activityTime} onChange={e => setActivityTime(e.target.value)} /></div>
                  </div>
                  <RadioGroup value={activityStatus} onValueChange={(value) => setActivityStatus(value as FollowUpStatus)} className="flex flex-wrap gap-x-4 gap-y-2">
                      {FOLLOW_UP_STATUSES.map(status => (<div key={status} className="flex items-center space-x-2"><RadioGroupItem value={status} id={`activity-status-${status}`} /><Label htmlFor={`activity-status-${status}`} className="text-sm font-normal">{status}</Label></div>))}
                  </RadioGroup>
                  <div>
                    <Label htmlFor="activityComment">Activity Comment</Label>
                    <Textarea id="activityComment" placeholder="Enter comment..." value={activityComment} onChange={e => setActivityComment(e.target.value)} className="mt-1" />
                  </div>
                  <Separator />
                  <div>
                      <h3 className="text-sm font-semibold mb-2">Schedule new task</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                          <div>
                              <Label htmlFor="taskForUser" className="text-xs">Task for</Label>
                              <Select value={taskForUser} onValueChange={(val) => setTaskForUser(val)}><SelectTrigger id="taskForUser" className="h-8 text-xs mt-1"><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent>{users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}</SelectContent></Select>
                          </div>
                          <div><Label htmlFor="taskDate" className="text-xs">Task date</Label><Input type="date" id="taskDate" className="h-8 text-xs mt-1" value={taskDate} onChange={e => setTaskDate(e.target.value)}/></div>
                          <div><Label htmlFor="taskTime" className="text-xs">Task time</Label><Input type="time" id="taskTime" className="h-8 text-xs mt-1" value={taskTime} onChange={e => setTaskTime(e.target.value)}/></div>
                      </div>
                  </div>
                  <Button onClick={handleSaveActivity} className="w-full bg-primary hover:bg-primary/90 mt-2" disabled={isFormPending}>
                    {isFormPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save Activity
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-3 border-b bg-muted/5 rounded-t-xl"><CardTitle className="text-md">Activity History ({activities.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {isActivitiesLoading ? (
                     <div className="flex items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : activities.length > 0 ? (
                    <div className="space-y-0 max-h-96 overflow-y-auto scrollbar-thin">
                      {activities.map((activity, index) => (
                        <div key={activity.id} className={cn("flex items-start gap-4 p-4", index !== activities.length - 1 && "border-b")}>
                          <Avatar className="h-9 w-9 border mt-1">
                             <ActivityIcon type={activity.type} className="h-full w-full p-2 text-muted-foreground" />
                          </Avatar>
                          <div className="flex-1 space-y-1.5">
                            <p className="text-sm font-semibold">
                                {activity.comment || (activity.followupOrTask === 'Task' ? 'Task Scheduled' : 'Activity Logged')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(activity.createdAt), 'dd-MM-yyyy p')} by {activity.createdBy || 'System'}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              <Badge variant="secondary" className="capitalize bg-teal-100 text-teal-800 border-transparent hover:bg-teal-200">
                                 {activity.type}
                              </Badge>
                              {activity.followupOrTask === 'Task' ? (
                                 activity.taskStatus === 'Closed' ? (
                                    <Badge className="bg-primary/10 text-primary border-transparent hover:bg-primary/20">
                                        <CheckCircle className="mr-1.5 h-3.5 w-3.5"/> Completed: {activity.taskDate ? format(parseISO(activity.taskDate), 'dd-MM-yyyy') : ''} : {activity.taskTime || ''}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-orange-100 text-orange-800 border-transparent hover:bg-orange-200">
                                        Task For: {activity.taskForUser} Due: {activity.taskDate ? format(parseISO(activity.taskDate), 'dd-MM-yyyy') : ''} {activity.taskTime || ''}
                                    </Badge>
                                  )
                              ) : (
                                <Badge variant="outline" className="bg-slate-800 text-white border-transparent hover:bg-slate-700">Followup</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-center text-muted-foreground py-6">No activity history yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Deal Details & Notes */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-3 border-b bg-muted/5 rounded-t-xl">
                  <CardTitle className="text-md flex items-center justify-between">
                    Deal Information
                    {deal.clientId && (
                      <Link href={`/clients/${deal.clientId}`} className={cn(buttonVariants({variant: 'link'}), 'p-0 h-auto text-xs')}>View Client Details</Link>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                   <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1 block">Stage</Label>
                    <Select value={deal.stage || ''} onValueChange={(value) => handleStageChange(value as DealStage)} disabled={isUpdating}>
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stagesForPipeline.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1 block">PO/WO Date</Label>
                    <p className="text-sm font-medium mt-2">{poWoDateDisplay}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1 block">Contact Person</Label>
                    <p className="text-sm font-medium">{deal.contactPerson}</p>
                  </div>
                  {deal.kilowatt && (
                     <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1 block">System Size</Label>
                        <p className="text-sm font-medium">{deal.kilowatt} kW</p>
                      </div>
                  )}
                </CardContent>
              </Card>

              {deal.pipeline === 'AMC' && (
                <Card className="shadow-sm border-border/50 border-t-emerald-500 border-t-2">
                  <CardHeader className="pb-3 border-b bg-muted/5 rounded-t-xl">
                    <CardTitle className="text-md">AMC Details</CardTitle>
                    <CardDescription>Duration: {deal.amcDurationInMonths} months</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1 max-w-sm">
                      <Label htmlFor="amc-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Effective AMC Date</Label>
                       <Popover>
                          <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-9 mt-1", !effectiveAmcDate && "text-muted-foreground")}>
                                  {effectiveAmcDate ? format(effectiveAmcDate, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={effectiveAmcDate} onSelect={setEffectiveAmcDate} initialFocus />
                          </PopoverContent>
                      </Popover>
                    </div>
                    <Button size="sm" onClick={handleUpdateAmcDate} disabled={isAmcDateUpdating}>
                      {isAmcDateUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                      Update Date & Reschedule Tasks
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="pb-3 border-b bg-muted/5 rounded-t-xl">
                        <CardTitle className="text-md">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3">
                        {deal.linkedAmcDeal && (
                            <Button asChild variant="outline" className="w-full justify-start shadow-sm" size="sm">
                                <Link href={`/deals/${deal.linkedAmcDeal.id}`}>
                                    <Link2 className="mr-2 h-4 w-4" /> View Linked AMC Deal
                                </Link>
                            </Button>
                        )}
                        {deal.parentDealId && (
                             <Button asChild variant="outline" className="w-full justify-start shadow-sm" size="sm">
                                <Link href={`/deals/${deal.parentDealId}`}>
                                    <Link2 className="mr-2 h-4 w-4" /> View Parent Deal
                                </Link>
                            </Button>
                        )}
                        {!deal.linkedAmcDeal && !deal.parentDealId && (
                            <p className="text-sm text-muted-foreground">No linked deals.</p>
                        )}
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm border-border/50">
                  <CardHeader className="pb-3 border-b bg-muted/5 rounded-t-xl"><CardTitle className="text-md">Notes</CardTitle></CardHeader>
                  <CardContent className="p-5">
                    <Textarea 
                      key={deal.id}
                      placeholder="Add internal notes here..." 
                      defaultValue={deal.notes || ''}
                      onBlur={(e) => handleAttributeChange('notes', e.target.value)}
                      disabled={isUpdating}
                      className="min-h-[120px] bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 focus-visible:ring-yellow-500" 
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {isFormOpen && dealForForm && (
      <DealForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleDealSubmit}
        users={users}
        clients={[]}
        deal={dealForForm as any}
      />
    )}
    </>
  );
}
