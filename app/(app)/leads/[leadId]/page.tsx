
'use client';

import { useEffect, useState, useTransition, useMemo, ChangeEvent } from 'react';
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
import { LEAD_PRIORITY_OPTIONS, FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES, CLIENT_TYPES, DROP_REASON_OPTIONS } from '@/lib/constants';
import type { Lead, User, LeadStatusType, LeadPriorityType, ClientType, FollowUp, FollowUpStatus, AddActivityData, FollowUpType, CreateLeadData, DropReasonType, Proposal, CustomSetting, SiteSurvey, LeadSourceOptionType } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit, Phone, MessageSquare, Mail, MessageCircle, UserCircle2, Lock, FileText, ShoppingCart, Loader2, Save, Send, Video, Building, Repeat, Trash2, IndianRupee, ClipboardEdit, Eye, UploadCloud, CheckCircle, ChevronsLeftIcon, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getLeadById, updateLead, addActivity, convertToClient, dropLead, getActivitiesForLead, deleteElectricityBill } from '@/app/(app)/leads-list/actions';
import { getProposalsForLead, createOrUpdateProposal } from '@/app/(app)/proposals/actions';
import { getSurveysForLead } from '@/app/(app)/site-survey/actions';
import { getUsers } from '@/app/(app)/users/actions';
import { getLeadStatuses, getLeadSources } from '@/app/(app)/settings/actions';
import { LeadForm } from '@/app/(app)/leads/lead-form';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ProposalPreviewDialog } from '@/app/(app)/proposals/proposal-preview-dialog';
import { ProposalForm } from '@/app/(app)/proposals/proposal-form';
import { TemplateSelectionDialog } from '@/app/(app)/proposals/template-selection-dialog';
import { TaskCompletionToast } from '@/components/task-completion-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { sendCallNotification } from '@/lib/fcm';
import { useSession } from '@/hooks/use-sessions';
import { useIsMobile } from '@/hooks/use-mobile';

const dropLeadSchema = z.object({
  dropReason: z.enum(DROP_REASON_OPTIONS, { required_error: "Drop reason is required." }),
  dropComment: z.string().optional(),
});
type DropLeadFormValues = z.infer<typeof dropLeadSchema>;

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

const SurveyDetailsCard = ({ survey }: { survey: SiteSurvey }) => {
    if (!survey) return null;
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardEdit className="h-5 w-5 text-primary" />
                    Site Survey Details
                </CardTitle>
                <CardDescription>Survey No: {survey.surveyNumber.slice(-8)}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div><strong>Survey Date:</strong> {format(parseISO(survey.date), 'dd MMM, yyyy')}</div>
                    <div><strong>Surveyor:</strong> {survey.surveyorName}</div>
                    <div><strong>Category:</strong> {survey.consumerCategory}</div>
                    <div><strong>Roof Type:</strong> {survey.roofType}</div>
                    <div><strong>Building Height:</strong> {survey.buildingHeight}</div>
                    <div><strong>Shadow-Free Area:</strong> {survey.shadowFreeArea}</div>
                    <div><strong>DISCOM:</strong> {survey.discom}</div>
                    <div><strong>Sanctioned Load:</strong> {survey.sanctionedLoad || 'N/A'}</div>
                    <div><strong>Meter Phase:</strong> {survey.meterPhase || 'N/A'}</div>
                    <div><strong>No. of Meters:</strong> {survey.numberOfMeters}</div>
                    <div><strong>Meter Rating:</strong> {survey.meterRating || 'N/A'}</div>
                    <div><strong>Avg. Bill (₹):</strong> {survey.electricityAmount?.toLocaleString('en-IN') || 'N/A'}</div>
                </div>
                {survey.remark && (
                    <div className="pt-1">
                        <strong className="font-semibold">Remark:</strong>
                        <p className="p-2 bg-muted rounded-md mt-1 text-xs">{survey.remark}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function LeadDetailsPage() {
  const session = useSession();
  const isMobile = useIsMobile();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const leadId = typeof params.leadId === 'string' ? params.leadId : null;
  const { toast } = useToast();
  const [lead, setLead] = useState<Lead | null | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<CustomSetting[]>([]);
  const [leadSources, setLeadSources] = useState<CustomSetting[]>([]);
  const [isFormPending, startFormTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isDropping, startDropTransition] = useTransition();
  const [isUploadingBill, startBillUploadTransition] = useTransition();
  const [isDeletingBill, startBillDeleteTransition] = useTransition();
  
  const [activities, setActivities] = useState<FollowUp[]>([]);
  const [isActivitiesLoading, setActivitiesLoading] = useState(true);
  const [surveys, setSurveys] = useState<SiteSurvey[]>([]);

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDropDialogOpen, setIsDropDialogOpen] = useState(false);
  const [isProposalFormOpen, setIsProposalFormOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const [activityType, setActivityType] = useState<FollowUpType>(FOLLOW_UP_TYPES[0]);
  const [activityDate, setActivityDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [activityTime, setActivityTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [activityStatus, setActivityStatus] = useState<FollowUpStatus>(FOLLOW_UP_STATUSES[0]);
  const [activityLeadStage, setActivityLeadStage] = useState<LeadStatusType | undefined>();
  const [activityPriority, setActivityPriority] = useState<LeadPriorityType | undefined>();
  const [activityComment, setActivityComment] = useState('');
  
  const [taskForUser, setTaskForUser] = useState<string | undefined>(undefined);
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedProposalForPreview, setSelectedProposalForPreview] = useState<Proposal | null>(null);
  const [billToPreview, setBillToPreview] = useState<string|null>(null);

  const [navigationIds, setNavigationIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    try {
      const storedIds = sessionStorage.getItem('navigation_ids');
      if (storedIds) {
        const ids = JSON.parse(storedIds);
        setNavigationIds(ids);
        if (leadId) {
            setCurrentIndex(ids.indexOf(leadId));
        }
      }
    } catch (e) {
        console.error("Failed to parse navigation IDs from sessionStorage", e);
    }
  }, [leadId]);

  const navigateTo = (direction: 'next' | 'prev') => {
    if(currentIndex === -1) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if(navigationIds[nextIndex]) {
      router.push(`/leads/${navigationIds[nextIndex]}?${searchParams.toString()}`);
    }
  };

  const dropForm = useForm<DropLeadFormValues>({
    resolver: zodResolver(dropLeadSchema),
  });

  const fetchProposals = async () => {
    if (leadId) {
      const fetchedProposals = await getProposalsForLead(leadId);
      setProposals(fetchedProposals);
    }
  };

  useEffect(() => {
    if (leadId) {
      const fetchLeadDetails = async () => {
        setLead(undefined);
        try {
          const [fetchedLead, fetchedUsers, fetchedStatuses, fetchedSources, fetchedSurveys] = await Promise.all([
            getLeadById(leadId),
            getUsers(),
            getLeadStatuses(),
            getLeadSources(),
            getSurveysForLead(leadId),
          ]);
          setLead(fetchedLead);
          setUsers(fetchedUsers);
          setLeadStatuses(fetchedStatuses);
          setLeadSources(fetchedSources);
          setSurveys(fetchedSurveys);

          if (fetchedLead) {
            setActivityLeadStage(fetchedLead.status as LeadStatusType);
            setActivityPriority(fetchedLead.priority as LeadPriorityType || undefined);
          }
          if (fetchedUsers.length > 0) {
            setTaskForUser(fetchedLead?.assignedTo || fetchedUsers[0].name);
          }
        } catch (error) {
          console.error("Failed to fetch lead details:", error);
          setLead(null);
          toast({
            title: "Error",
            description: "Could not load lead details.",
            variant: "destructive",
          });
        }
      };
      
      const fetchActivities = async () => {
        setActivitiesLoading(true);
        const fetchedActivities = await getActivitiesForLead(leadId);
        setActivities(fetchedActivities);
        setActivitiesLoading(false);
      };

      fetchLeadDetails();
      fetchActivities();
      fetchProposals();
    } else {
      setLead(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, toast]);

  useEffect(() => {
    if (session && lead && session.viewPermission === 'ASSIGNED' && lead.assignedTo !== session.name) {
      setLead(null); // This will trigger the "Not Found" view
      toast({
        title: "Access Denied",
        description: "You do not have permission to view this lead.",
        variant: "destructive",
      });
    }
  }, [session, lead, toast]);

  useEffect(() => {
    if (lead) {
        setActivityLeadStage(lead.status as LeadStatusType);
        setActivityPriority(lead.priority as LeadPriorityType || undefined);
    }
  }, [lead]);

  const handleDeleteBill = (billUrl: string) => {
    if (!leadId) return;
    startBillDeleteTransition(async () => {
      const result = await deleteElectricityBill(leadId, 'lead', billUrl);
      if (result.success) {
        setLead(prev => prev ? ({ ...prev, electricityBillUrls: prev.electricityBillUrls.filter(url => url !== billUrl) }) : null);
        toast({ title: 'Success', description: 'Electricity bill has been deleted.' });
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete bill.', variant: 'destructive' });
      }
    });
  };

  const handleBillUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !lead) return;

    for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit per file
            toast({ title: "File Too Large", description: `"${file.name}" is larger than 5MB.`, variant: "destructive" });
            return;
        }
    }
    
    startBillUploadTransition(async () => {
      try {
        const uploadPromises = Array.from(files).map(file => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'e-bills');
            return fetch('/api/templates/upload', {
                method: 'POST',
                body: formData,
            }).then(res => res.json());
        });

        const results = await Promise.all(uploadPromises);
        
        const newUrls: string[] = [];
        for (const result of results) {
            if (!result.success || !result.filePath) {
                throw new Error(result.error || 'One or more files failed to upload.');
            }
            newUrls.push(result.filePath);
        }

        const updatedLead = await updateLead(lead.id, { 
            electricityBillUrls: [...(lead.electricityBillUrls || []), ...newUrls] 
        });
        if (updatedLead == null) {
          toast({title: "Failed to Upload Lead."});
        } else if (! ('error' in updatedLead)) {
          setLead(updatedLead);
          toast({ title: "E-Bills Uploaded", description: `${newUrls.length} bill(s) have been successfully attached.` });
        } else {
          toast({title: "Failed to update the Lead !", description: updatedLead.error, variant: 'destructive'
          })
        }
      } catch (error) {
        toast({ title: "Upload Failed", description: (error as Error).message, variant: "destructive" });
      }
    });
  };

  const handleProposalSubmit = async (data: Partial<Proposal>) => {
    startFormTransition(async () => {
      const result = await createOrUpdateProposal(data);
      if (result) {
        toast({
          title: "Proposal History Updated",
          description: `Proposal ${data.proposalNumber} has been saved.`,
        });
        await fetchProposals(); 
        if(result.pdfUrl) {
          setSelectedProposalForPreview(result);
          setIsPreviewOpen(true);
        }
      } else {
        toast({ title: "Error", description: "Could not save the proposal to the database.", variant: "destructive" });
      }
    });
    setIsProposalFormOpen(false);
    setSelectedTemplateId(null);
  };
  
  const handleCreateNewProposal = () => {
      setIsTemplateDialogOpen(true);
  };

  const handleTemplateSelected = (templateId: string) => {
      setSelectedTemplateId(templateId);
      setIsTemplateDialogOpen(false);
      setIsProposalFormOpen(true);
  };

  const handleSaveActivity = () => {
    if (!lead) return;
    if (!activityComment) return;

    startFormTransition(async () => {
      const isTask = taskDate && taskTime;
      const activityCategory = isTask ? 'Task' : 'Followup';

      const activityData: AddActivityData = {
        followupOrTask: activityCategory,
        leadId: lead.id,
        type: activityType,
        date: activityDate,
        time: activityTime,
        status: activityStatus,
        leadStageAtTimeOfFollowUp: activityLeadStage,
        comment: activityComment,
        priority: activityPriority,
        ...(isTask && {
          taskForUser,
          taskDate,
          taskTime
        }),
      };

      const newActivity = await addActivity(activityData);

      if (newActivity) {
        toast({
          title: `${activityCategory} Saved`,
          description: `${activityType} for ${lead.name} has been recorded.`,
        });
        setActivities(prev => [newActivity, ...prev]);
        const updatedLead = await getLeadById(lead.id);
        if (updatedLead) {
          setLead(updatedLead);
        }
        setActivityComment('');
        if (users.length > 0) {
            setTaskForUser(updatedLead?.assignedTo || users[0].name);
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

  const handleOpenEditForm = () => {
    if (lead) {
      setIsEditFormOpen(true);
    }
  };

  const handleEditFormSubmit = async (updatedLeadData: CreateLeadData | Lead) => {
    if (!lead || !lead.id) return;
    startFormTransition(async () => {
      const result = await updateLead(lead.id, updatedLeadData as Partial<CreateLeadData>);
      if (result !== null && !('error' in result)) {
        setLead(result);
        toast({ title: "Lead Updated", description: `${result.name}'s information has been updated.` });
        setIsEditFormOpen(false);
      } else {
        toast({ title: "Error", description: "Failed to update lead.", variant: "destructive" });
      }
    });
  };
  
  const handleAttributeChange = (
    key: 'status' | 'priority' | 'assignedTo' | 'clientType' | 'kilowatt' | 'source' | 'notes',
    value: string | number
  ) => {
    if (!lead || value === undefined || isUpdating) return;
    const originalLead = { ...lead };

    setLead(prev => (prev ? { ...prev, [key]: value } : null));

    startUpdateTransition(async () => {
        const result = await updateLead(lead.id, { [key]: value });

        if (result !== null && !('error' in result))  {
            setLead(result);
            toast({
                title: `${key.charAt(0).toUpperCase() + key.slice(1)} Updated`,
                description: `Lead ${key} set to "${value}".`,
            });
        } else {
            setLead(originalLead);
            toast({
                title: "Update Failed",
                description: `Could not update lead ${key}.`,
                variant: "destructive",
            });
        }
    });
  };

  const handleConvertToClient = () => {
    if (!lead || isUpdating) return;
    startUpdateTransition(async () => {
      const result = await convertToClient(lead.id);
      if (result.success && result.clientId) {
        toast({
          title: "Conversion Successful",
          description: `${lead.name} is now a client.`
        });
        router.push(`/clients/${result.clientId}`);
      } else {
        toast({
          title: "Conversion Failed",
          description: result.message || "Could not convert lead to client.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDropLead = (values: DropLeadFormValues) => {
    if (!lead) return;
    startDropTransition(async () => {
        const result = await dropLead(lead.id, values.dropReason, values.dropComment);
        if (result.success) {
            toast({
                title: "Lead Dropped",
                description: `${lead.name} has been moved to the dropped leads list.`
            });
            router.push('/dropped-leads-list');
        } else {
            toast({
                title: "Drop Failed",
                description: result.message || "Could not drop lead.",
                variant: "destructive",
            });
            setIsDropDialogOpen(false);
        }
    });
  };

  const handleInitiateCall = () => {
    if (!lead || !lead.phone) {
        toast({ title: "Cannot Initiate Call", description: "Lead must have a phone number.", variant: "destructive" });
        return;
    }
    const loggedInUser = users.find(u => u.id === session?.userId);
    if (!loggedInUser?.deviceId) {
        toast({ title: "Cannot Initiate Call", description: "You do not have a registered mobile device. Please login to the mobile app.", variant: "destructive" });
        return;
    }

    startUpdateTransition(async () => {
        toast({ title: "Initiating Call...", description: "Sending notification to your mobile device." });
        const result = await sendCallNotification(loggedInUser.deviceId!, lead.phone!, lead.name);
        if (result.success) {
            toast({ title: "Notification Sent", description: "Check your mobile device to place the call." });
        } else {
            toast({ title: "Failed to Send Notification", description: result.error, variant: "destructive" });
        }
    });
  };

  const CallButton = () => {
    if (!lead?.phone) {
      return (
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled>
          <Phone className="h-5 w-5" />
        </Button>
      );
    }
    if (isMobile) {
      return (
        <a href={`tel:${lead.phone}`}>
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

  const backToListUrl = `/leads-list?${searchParams.toString()}`;

  if (lead === undefined) {
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading Lead Details...</p>
        </div>
    );
  }

  if (lead === null) {
    return (
        <div className="flex flex-col flex-1 items-center justify-center h-full p-8 text-center">
            <UserCircle2 className="h-16 w-16 mb-4 text-destructive" />
            <h2 className="text-2xl font-semibold mb-2">Lead Not Found or Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              The lead you are looking for does not exist or you do not have permission to view it.
            </p>
            <Button variant="outline" size="sm" onClick={() => router.push(backToListUrl)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Leads List
            </Button>
        </div>
    );
  }

  const creationDateTime = lead.createdAt && isValid(parseISO(lead.createdAt)) ? format(parseISO(lead.createdAt), 'dd-MM-yyyy HH:mm') : 'N/A';
  const nextFollowUpDisplay = lead.nextFollowUpDate && isValid(parseISO(lead.nextFollowUpDate))
    ? `${format(parseISO(lead.nextFollowUpDate), 'dd-MM-yyyy')} ${lead.nextFollowUpTime || ''}`.trim()
    : 'Not set';

  return (
    <>
    {searchParams.get('from_task') && <TaskCompletionToast taskId={searchParams.get('from_task')!} />}
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b bg-card sticky top-0 z-10">
        <h1 className="text-xl font-semibold font-headline">{lead.name}</h1>
        <div className="flex flex-wrap justify-center gap-2">
            <AlertDialog open={isDropDialogOpen} onOpenChange={setIsDropDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDropping}><Trash2 className="mr-2 h-4 w-4" /> Drop</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <Form {...dropForm}>
                        <form onSubmit={dropForm.handleSubmit(handleDropLead)}>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Drop Lead: {lead.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Select a reason for dropping this lead. This action will move the lead to the dropped list and cannot be undone directly.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4 space-y-4">
                                <FormField control={dropForm.control} name="dropReason"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label>Reason *</Label>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select a drop reason" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {DROP_REASON_OPTIONS.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={dropForm.control} name="dropComment"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label>Comment (Optional)</Label>
                                            <FormControl><Textarea placeholder="Add an optional comment..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDropping}>Cancel</AlertDialogCancel>
                                <Button type="submit" variant="destructive" disabled={isDropping}>
                                    {isDropping && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Confirm Drop
                                </Button>
                            </AlertDialogFooter>
                        </form>
                    </Form>
                </AlertDialogContent>
            </AlertDialog>
          <Button variant="outline" size="sm" onClick={() => router.push(backToListUrl)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back To List
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateTo('prev')} disabled={currentIndex <= 0}>
                <ChevronsLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateTo('next')} disabled={currentIndex < 0 || currentIndex >= navigationIds.length - 1}>
              Next <ChevronsRight className="h-4 w-4 ml-1" />
            </Button>
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center pb-2">
                <CardTitle className="text-lg font-semibold">Lead Information</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenEditForm} >
                  <Edit className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xl font-bold text-primary">{lead.name}</p>
                <p className="text-sm text-muted-foreground">{lead.phone || 'No phone number'}</p>
                <p className="text-xs text-muted-foreground">Created: {creationDateTime}</p>
                <div>
                  <Label htmlFor="lead-status" className="text-xs font-medium">Stage</Label>
                  <Select value={lead.status || ''} onValueChange={(value) => handleAttributeChange('status', value)} disabled={isUpdating}>
                    <SelectTrigger id="lead-status" className="h-8 text-xs">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStatuses.map(stage => <SelectItem key={stage.id} value={stage.name} className="text-xs">{stage.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div>
                  <Label htmlFor="lead-priority" className="text-xs font-medium">Priority</Label>
                  <Select value={lead.priority || ''} onValueChange={(value) => handleAttributeChange('priority', value as LeadPriorityType)} disabled={isUpdating}>
                    <SelectTrigger id="lead-priority" className="h-8 text-xs">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs font-medium">Next follow-up:</p>
                  <p className="text-sm">{nextFollowUpDisplay}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Communication</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-around items-center">
                <CallButton />
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled><MessageSquare className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled><Mail className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled><MessageCircle className="h-5 w-5" /></Button>
              </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-md">Attributes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="lead-source" className="text-xs font-medium">Source</Label>
                        <Select value={lead.source || ''} onValueChange={(value) => handleAttributeChange('source', value as LeadSourceOptionType)} disabled={isUpdating}>
                            <SelectTrigger id="lead-source" className="h-8 text-xs">
                                <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent>
                                {leadSources.map(source => <SelectItem key={source.id} value={source.name} className="text-xs">{source.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="lead-kw" className="text-xs font-medium">Capacity (KW)</Label>
                        <Input
                            id="lead-kw"
                            key={lead.id}
                            type="number"
                            defaultValue={lead.kilowatt || ''}
                            onBlur={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value !== lead.kilowatt) {
                                    handleAttributeChange('kilowatt', value);
                                }
                            }}
                            className="h-8 text-xs"
                            disabled={isUpdating}
                        />
                    </div>
                    <div>
                        <Label htmlFor="lead-client-type" className="text-xs font-medium">Customer Type</Label>
                        <Select value={lead.clientType || ''} onValueChange={(value) => handleAttributeChange('clientType', value as ClientType)} disabled={isUpdating}>
                            <SelectTrigger id="lead-client-type" className="h-8 text-xs">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {CLIENT_TYPES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full bg-green-600 hover:bg-green-700" size="sm" disabled={isUpdating}>
                      <Repeat className="mr-2 h-4 w-4" /> Convert to Client
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Convert Lead to Client?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will convert "{lead.name}" into a client, moving them and their activity history to the Clients section. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConvertToClient} disabled={isUpdating}>
                        {isUpdating ? "Converting..." : "Yes, Convert"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button className="w-full" variant="outline" size="sm" onClick={handleCreateNewProposal}><FileText className="mr-2 h-4 w-4" /> Create Proposal</Button>
                <Button className="w-full" variant="outline" size="sm" disabled><ShoppingCart className="mr-2 h-4 w-4" /> Create Purchase Order</Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <Card>
              <CardHeader><CardTitle>New follow-up</CardTitle></CardHeader>
              <CardContent className="space-y-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="activityLeadStage">Lead Stage</Label>
                    <Select value={activityLeadStage} onValueChange={(val) => setActivityLeadStage(val as LeadStatusType)}><SelectTrigger id="activityLeadStage"><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent>{leadStatuses.map(stage => <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                   <div>
                    <Label htmlFor="activityPriority">Lead Priority</Label>
                    <Select value={activityPriority} onValueChange={(val) => setActivityPriority(val as LeadPriorityType)}><SelectTrigger id="activityPriority"><SelectValue placeholder="Select priority" /></SelectTrigger><SelectContent>{LEAD_PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="activityComment">Follow-up Comment</Label>
                  <Textarea id="activityComment" placeholder="Enter comment..." value={activityComment} onChange={e => setActivityComment(e.target.value)} />
                </div>
                <Separator />
                <div>
                    <h3 className="text-md font-semibold mb-2">Schedule new task</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div>
                            <Label htmlFor="taskForUser">Task for</Label>
                            <Select value={taskForUser} onValueChange={(val) => setTaskForUser(val)}><SelectTrigger id="taskForUser"><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent>{users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div><Label htmlFor="taskDate">Task date</Label><Input type="date" id="taskDate" value={taskDate} onChange={e => setTaskDate(e.target.value)}/></div>
                        <div><Label htmlFor="taskTime">Task time</Label><Input type="time" id="taskTime" value={taskTime} onChange={e => setTaskTime(e.target.value)}/></div>
                    </div>
                </div>
                <Button onClick={handleSaveActivity} className="w-full bg-green-600 hover:bg-green-700" disabled={isFormPending}>
                  {isFormPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Activity History ({lead.followupCount || 0})</CardTitle></CardHeader>
              <CardContent>
                {isActivitiesLoading ? (
                   <div className="flex items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : activities.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {activities.map(activity => (
                      <div key={activity.id} className="flex items-start gap-4 p-3 border rounded-md">
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
                              <Badge variant="secondary" className="capitalize bg-blue-100 text-blue-800 border-transparent hover:bg-blue-200">
                                 {activity.type}
                              </Badge>
                              {activity.leadStageAtTimeOfFollowUp && (
                                <Badge variant="outline" className="capitalize bg-slate-800 text-white border-transparent hover:bg-slate-700">{activity.leadStageAtTimeOfFollowUp}</Badge>
                              )}
                              {activity.followupOrTask === 'Task' ? (
                                activity.taskStatus === 'Closed' ? (
                                    <Badge className="bg-green-100 text-green-800 border-transparent hover:bg-green-200">
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
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ClipboardEdit className="h-5 w-5 text-primary" />
                        Site Survey History
                    </CardTitle>
                    <CardDescription>All surveys conducted for this client.</CardDescription>
                </CardHeader>
                <CardContent>
                    {surveys.length === 0 ? (
                        <p className="text-sm text-center text-muted-foreground py-4">No surveys found.</p>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {surveys.map(survey => (
                                <AccordionItem value={survey.id} key={survey.id}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full pr-4">
                                            <span>Survey No: {survey.surveyNumber.slice(-8)}</span>
                                            <span className="text-muted-foreground text-sm">{format(parseISO(survey.date), 'dd MMM, yyyy')}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-1">
                                       <div className="text-xs space-y-3 p-3 border rounded-md">
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                <div><strong>Surveyor:</strong> {survey.surveyorName}</div>
                                                <div><strong>Category:</strong> {survey.consumerCategory}</div>
                                                <div><strong>Roof Type:</strong> {survey.roofType}</div>
                                                <div><strong>Building Height:</strong> {survey.buildingHeight}</div>
                                                <div><strong>Shadow-Free Area:</strong> {survey.shadowFreeArea}</div>
                                                <div><strong>DISCOM:</strong> {survey.discom}</div>
                                                <div><strong>Sanctioned Load:</strong> {survey.sanctionedLoad || 'N/A'}</div>
                                                <div><strong>Meter Phase:</strong> {survey.meterPhase || 'N/A'}</div>
                                                <div><strong>No. of Meters:</strong> {survey.numberOfMeters}</div>
                                                <div><strong>Meter Rating:</strong> {survey.meterRating || 'N/A'}</div>
                                                <div><strong>Avg. Bill (₹):</strong> {survey.electricityAmount?.toLocaleString('en-IN') || 'N/A'}</div>
                                            </div>
                                            {survey.remark && (
                                                <div className="pt-1">
                                                    <strong className="font-semibold">Remark:</strong>
                                                    <p className="p-2 bg-muted rounded-md mt-1 text-xs">{survey.remark}</p>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-1">
                <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8"><AvatarImage src={`https://placehold.co/40x40.png?text=${lead.assignedTo?.charAt(0) || 'U'}`} data-ai-hint="user avatar" /><AvatarFallback>{lead.assignedTo?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                   <Select
                      value={lead.assignedTo || ''}
                      onValueChange={(value) => handleAttributeChange('assignedTo', value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-9 text-sm flex-grow">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>{users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <p className="text-xs text-muted-foreground ml-10">Assigned to</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-1">
                 <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8"><AvatarImage src={`https://placehold.co/40x40.png?text=${lead.createdBy?.charAt(0) || 'S'}`} data-ai-hint="user avatar"/><AvatarFallback>{lead.createdBy?.charAt(0) || 'S'}</AvatarFallback></Avatar>
                  <p className="text-sm font-medium flex-grow bg-muted px-3 py-2 rounded-md h-9 flex items-center">{lead.createdBy || 'System'}</p>
                </div>
                <p className="text-xs text-muted-foreground ml-10">Created by</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/10 border-primary/20">
                <CardContent className="pt-6 text-center">
                    <p className="text-sm text-primary font-semibold">Total Deal Value</p>
                    <p className="text-3xl font-bold text-primary flex items-center justify-center">
                        <IndianRupee className="h-7 w-7 mr-1" />
                        {lead.totalDealValue?.toLocaleString('en-IN') || 0}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2 pt-4"><CardTitle className="text-md">E-Bills ({lead.electricityBillUrls?.length || 0})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {lead.electricityBillUrls && lead.electricityBillUrls.length > 0 ? (
                       <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {lead.electricityBillUrls.map((url, index) => (
                                <div key={url} className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" className="flex-grow justify-start text-xs" onClick={() => setBillToPreview(url)}>
                                      <Eye className="mr-2 h-4 w-4" /> 
                                      <span className="truncate">View Bill {index + 1} ({url.split('-').pop()})</span>
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="icon" className="h-8 w-8" disabled={isDeletingBill}>
                                          <Trash2 className="h-4 w-4"/>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the uploaded bill file. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteBill(url)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-xs text-muted-foreground p-2">No bills uploaded.</div>
                    )}
                    <div>
                        <Label htmlFor="bill-upload" className={cn(buttonVariants({variant: "secondary", size: "sm"}), "w-full cursor-pointer")}>
                            {isUploadingBill ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4"/>}
                            {lead.electricityBillUrls?.length ? 'Upload More Bills' : 'Upload Bills'}
                        </Label>
                        <Input id="bill-upload" type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleBillUpload} disabled={isUploadingBill}/>
                    </div>
                </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4"><CardTitle className="text-md">Notes</CardTitle></CardHeader>
              <CardContent>
                 <Textarea 
                  key={lead.id}
                  placeholder="Add notes here..." 
                  defaultValue={lead.notes || ''}
                  onBlur={(e) => handleAttributeChange('notes', e.target.value)}
                  disabled={isUpdating}
                  className="min-h-[100px] bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800" 
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Proposal History ({proposals.length})</CardTitle></CardHeader>
              <CardContent>
                {proposals.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {proposals.map(proposal => (
                      <div key={proposal.id} onClick={() => { setSelectedProposalForPreview(proposal); setIsPreviewOpen(true); }} className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold text-sm">{proposal.proposalNumber}</p>
                            <p className="text-xs text-muted-foreground">Capacity: {proposal.capacity} kW</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="font-semibold text-sm flex items-center"><IndianRupee className="h-4 w-4 mr-0.5" />{proposal.finalAmount.toLocaleString('en-IN')}</p>
                           <p className="text-xs text-muted-foreground">{format(parseISO(proposal.proposalDate), 'dd MMM yyyy')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                   <p className="text-sm text-center text-muted-foreground py-6">No proposals created for this lead yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {isEditFormOpen && lead && (<LeadForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} onSubmit={handleEditFormSubmit} lead={lead} users={users} statuses={leadStatuses} sources={leadSources} />)}
      {isProposalFormOpen && lead && (
          <ProposalForm 
            isOpen={isProposalFormOpen} 
            onClose={() => { setIsProposalFormOpen(false); setSelectedTemplateId(null); }} 
            onSubmit={handleProposalSubmit} 
            clients={[]} 
            leads={[lead]}
            templateId={selectedTemplateId} 
          />
      )}
      <TemplateSelectionDialog
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        onSelect={handleTemplateSelected}
      />
      {isPreviewOpen && selectedProposalForPreview && (
        <ProposalPreviewDialog
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          pdfUrl={selectedProposalForPreview.pdfUrl || null}
          docxUrl={selectedProposalForPreview.docxUrl || null}
        />
      )}
      {billToPreview && (
        <ProposalPreviewDialog
            isOpen={!!billToPreview}
            onClose={() => setBillToPreview(null)}
            pdfUrl={billToPreview}
            docxUrl={null}
        />
      )}
    </div>
    </>
  );
}
