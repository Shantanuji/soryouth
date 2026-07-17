
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LEAD_PRIORITY_OPTIONS, FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES, CLIENT_TYPES, DROP_REASON_OPTIONS } from '@/lib/constants';
import type { Lead, User, LeadStatusType, LeadPriorityType, ClientType, FollowUp, FollowUpStatus, AddActivityData, FollowUpType, CreateLeadData, DropReasonType, Proposal, CustomSetting, SiteSurvey, LeadSourceOptionType } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit, Phone, MessageSquare, Mail, MessageCircle, UserCircle2, Lock, FileText, ShoppingCart, Loader2, Save, Send, Video, Building, Repeat, Trash2, IndianRupee, ClipboardEdit, Eye, UploadCloud, CheckCircle, ChevronsLeftIcon, ChevronsRight, ChevronsLeft, UserX, ChevronDown, Zap } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  const fromTask = searchParams?.get('from_task');
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

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  
  const openPdfInNewTab = async (pdfUrl: string) => {
    const newTab = window.open('about:blank', '_blank');
    try {
      const s3Key = new URL(pdfUrl).pathname.substring(1);
      const res = await fetch(`/api/s3/presigned-url?key=${encodeURIComponent(s3Key)}`);
      const data = await res.json();
      if (data.url && newTab) {
        newTab.location.href = data.url;
      } else if (newTab) {
        newTab.close();
        toast({ title: "Error", description: "Could not open document securely", variant: "destructive" });
      }
    } catch (e) {
      if (newTab) newTab.close();
      toast({ title: "Error", description: "Failed to open PDF", variant: "destructive" });
    }
  };

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDropDialogOpen, setIsDropDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
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

  const [detailsState, setDetailsState] = useState({
    source: '',
    clientType: '',
    assignedTo: '',
    kilowatt: '',
    notes: '',
  });

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
    if (lead) {
      setDetailsState({
        source: lead.source || '',
        clientType: lead.clientType || '',
        assignedTo: lead.assignedTo || '',
        kilowatt: lead.kilowatt?.toString() || '',
        notes: lead.notes || '',
      });
    }
  }, [lead]);

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
          openPdfInNewTab(result.pdfUrl);
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
    if (!activityComment) 
      return toast({title: "Couldn't Save Activity !", description: "Please Enter the Comment First.", variant: "destructive"});

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
  
  const handleUpdateDetails = () => {
    if (!lead || !lead.id) return;

    startUpdateTransition(async () => {
        const result = await updateLead(lead.id, { 
            source: detailsState.source,
            clientType: detailsState.clientType as ClientType,
            assignedTo: detailsState.assignedTo,
            kilowatt: detailsState.kilowatt ? parseFloat(detailsState.kilowatt) : null,
            notes: detailsState.notes,
        });

        if (result !== null && !('error' in result))  {
            setLead(result);
            toast({
                title: `Lead Details Updated`,
                description: `Successfully saved the lead details.`,
            });
        } else {
            toast({
                title: "Update Failed",
                description: result && 'error' in result ? result.error : `Could not update lead details.`,
                variant: "destructive",
            });
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
    <div className="flex flex-col h-full">
      {searchParams.get('from_task') && <TaskCompletionToast taskId={searchParams.get('from_task')!} />}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-xl font-semibold font-headline">Lead Details</h1>
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

      <div className="flex-grow flex flex-col bg-muted/20 overflow-hidden pt-4">
        
        {/* CORPORATE HEADER PANEL */}
        <div className="bg-card border-y shadow-sm px-6 py-4 shrink-0 z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            {/* Identity */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{lead.name}</h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{lead.status || 'New'}</Badge>
                {lead.priority && <Badge variant="outline" className="text-muted-foreground">{lead.priority}</Badge>}
              </div>
              <div className="flex items-center gap-5 text-sm text-muted-foreground font-medium">
                {lead.phone && <span className="flex items-center gap-1.5"><i className="ri-phone-fill" /> {lead.phone}</span>}
                {lead.kilowatt && <span className="flex items-center gap-1.5"><i className="ri-flashlight-fill text-amber-500" /> {lead.kilowatt} kW</span>}
                <span className="flex items-center gap-1.5"><i className="ri-calendar-line" /> Created {creationDateTime}</span>
              </div>
            </div>
            
            {/* Quick Stats & Assignment */}
            <div className="flex items-center gap-6 md:border-l border-border/50 md:pl-6">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Deal Value</p>
                <p className="text-lg font-bold flex items-center text-foreground"><IndianRupee className="h-3.5 w-3.5 mr-0.5 text-muted-foreground"/> {lead.totalDealValue?.toLocaleString('en-IN') || 0}</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Created By</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Avatar className="h-6 w-6 border bg-muted"><AvatarFallback className="text-[10px] text-muted-foreground">{lead.createdBy?.charAt(0) || 'S'}</AvatarFallback></Avatar>
                  <span className="text-sm font-semibold">{lead.createdBy || 'System'}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Assigned To</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Avatar className="h-6 w-6 border bg-muted"><AvatarFallback className="text-[10px] text-muted-foreground">{lead.assignedTo?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                  <Select value={lead.assignedTo || ''} onValueChange={(value) => handleAttributeChange('assignedTo', value)} disabled={isUpdating}>
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
               <Button variant="outline" className="h-9 px-3 font-medium bg-background" onClick={handleOpenEditForm}>
                 <Edit className="h-4 w-4 mr-2"/> Edit Profile
               </Button>
               <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="default" className="h-9 px-4 font-medium shadow-sm bg-blue-600 hover:bg-blue-700 text-white" disabled={isUpdating}>
                      <Zap className="mr-2 h-4 w-4" /> Quick Links
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-3 border border-border shadow-xl rounded-xl flex flex-col gap-2 bg-card">
                    <div className="font-semibold text-[13px] mb-1 px-1">Quick Actions</div>

                    <Button className="justify-start shadow-sm font-medium h-10" onClick={() => setIsConvertDialogOpen(true)}>
                      <Repeat className="mr-2 h-4 w-4" /> Convert to Client
                    </Button>

                    <Button variant="outline" className="justify-start shadow-sm font-medium hover:bg-muted h-10 text-slate-700 dark:text-slate-200" onClick={() => setIsTemplateDialogOpen(true)}>
                      <FileText className="mr-2 h-4 w-4" /> Create Proposal
                    </Button>

                    <Button variant="outline" disabled className="justify-start shadow-sm font-medium h-10 text-muted-foreground opacity-60">
                      <ShoppingCart className="mr-2 h-4 w-4" /> Create Purchase Order
                    </Button>
                  </PopoverContent>
                </Popover>

               <AlertDialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Convert Lead to Client?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will convert "{lead.name}" into a client, moving them and their activity history to the Clients section.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { setIsConvertDialogOpen(false); handleConvertToClient(); }} disabled={isUpdating}>
                        {isUpdating ? "Converting..." : "Yes, Convert"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div className="flex-grow overflow-y-auto p-6 scrollbar-thin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Activity Logging & Form */}
            <div className="lg:col-span-5 space-y-6 sticky top-0 max-h-[calc(100vh-150px)] overflow-y-auto scrollbar-none pb-4">
              <Card className="shadow-sm border-border/50">
                <Tabs defaultValue="activity-followup" className="w-full">
                  <CardHeader className="pb-0 border-b px-2 pt-2 bg-muted/10 rounded-t-xl">
                    <TabsList className="h-10 bg-transparent border-b-0 w-full justify-start overflow-x-auto rounded-none p-0">
                      <TabsTrigger value="activity-followup" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold">Activity & Follow-up</TabsTrigger>
                      <TabsTrigger value="lead-details" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold">Lead Details</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent className="p-0">
                    <TabsContent value="activity-followup" className="m-0">
                      <Tabs defaultValue="log-activity" className="w-full">
                        <div className="px-5 pt-4 pb-2 flex justify-between items-center">
                          <span className="text-sm font-semibold text-foreground hidden sm:block">Record Activity</span>
                          <TabsList className="h-8 bg-muted/50">
                            <TabsTrigger value="log-activity" className="text-xs font-medium">Log Activity</TabsTrigger>
                            <TabsTrigger value="schedule-task" className="text-xs font-medium">Schedule Task</TabsTrigger>
                          </TabsList>
                        </div>
                        <div className="px-5 pb-5">
                          <TabsContent value="log-activity" className="space-y-4 mt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                              <div className="sm:col-span-1">
                                <Select value={activityType} onValueChange={(val) => setActivityType(val as FollowUpType)}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>{FOLLOW_UP_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="sm:col-span-1"><Input type="date" className="h-9 text-sm" value={activityDate} onChange={e => setActivityDate(e.target.value)} /></div>
                              <div className="sm:col-span-1"><Input type="time" className="h-9 text-sm" value={activityTime} onChange={e => setActivityTime(e.target.value)} /></div>
                            </div>
                            <RadioGroup value={activityStatus} onValueChange={(value) => setActivityStatus(value as FollowUpStatus)} className="flex flex-wrap gap-x-5 gap-y-2 py-1">
                                {FOLLOW_UP_STATUSES.map(status => (<div key={status} className="flex items-center space-x-2"><RadioGroupItem value={status} id={`activity-status-${status}`} /><Label htmlFor={`activity-status-${status}`} className="text-sm cursor-pointer">{status}</Label></div>))}
                            </RadioGroup>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="activityLeadStage" className="text-[11px] font-bold uppercase text-muted-foreground">Update Stage</Label>
                                <Select value={activityLeadStage} onValueChange={(val) => setActivityLeadStage(val as LeadStatusType)}><SelectTrigger id="activityLeadStage" className="h-9 mt-1"><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent>{leadStatuses.map(stage => <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>)}</SelectContent></Select>
                              </div>
                               <div>
                                <Label htmlFor="activityPriority" className="text-[11px] font-bold uppercase text-muted-foreground">Update Priority</Label>
                                <Select value={activityPriority} onValueChange={(val) => setActivityPriority(val as LeadPriorityType)}><SelectTrigger id="activityPriority" className="h-9 mt-1"><SelectValue placeholder="Select priority" /></SelectTrigger><SelectContent>{LEAD_PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="activityComment" className="text-[11px] font-bold uppercase text-muted-foreground">Notes / Description</Label>
                              <Textarea id="activityComment" placeholder="Enter what happened..." value={activityComment} onChange={e => setActivityComment(e.target.value)} className="resize-none mt-1 h-20" />
                            </div>
                            <Button onClick={() => { setTaskDate(''); setTaskTime(''); handleSaveActivity(); }} className="w-full font-semibold shadow-sm" disabled={isFormPending}>
                              {isFormPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Log Activity
                            </Button>
                          </TabsContent>

                          <TabsContent value="schedule-task" className="space-y-4 mt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                               <div className="sm:col-span-1">
                                <Label htmlFor="taskType" className="text-[11px] font-bold uppercase text-muted-foreground">Task Type</Label>
                                <Select value={activityType} onValueChange={(val) => setActivityType(val as FollowUpType)}>
                                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>{FOLLOW_UP_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div>
                                  <Label htmlFor="taskForUser" className="text-[11px] font-bold uppercase text-muted-foreground">Assign To</Label>
                                  <Select value={taskForUser} onValueChange={(val) => setTaskForUser(val)}><SelectTrigger id="taskForUser" className="h-9 mt-1"><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent>{users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}</SelectContent></Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                <div><Label htmlFor="taskDate" className="text-[11px] font-bold uppercase text-muted-foreground">Due Date</Label><Input type="date" id="taskDate" className="h-9 mt-1" value={taskDate} onChange={e => setTaskDate(e.target.value)}/></div>
                                <div><Label htmlFor="taskTime" className="text-[11px] font-bold uppercase text-muted-foreground">Due Time</Label><Input type="time" id="taskTime" className="h-9 mt-1" value={taskTime} onChange={e => setTaskTime(e.target.value)}/></div>
                            </div>
                            <div>
                              <Label htmlFor="taskComment" className="text-[11px] font-bold uppercase text-muted-foreground">Task Description</Label>
                              <Textarea id="taskComment" placeholder="What needs to be done?" value={activityComment} onChange={e => setActivityComment(e.target.value)} className="resize-none mt-1 h-20" />
                            </div>
                            <Button onClick={handleSaveActivity} className="w-full font-semibold shadow-sm" disabled={isFormPending || !taskDate || !taskTime}>
                              {isFormPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Schedule Task
                            </Button>
                          </TabsContent>
                        </div>
                      </Tabs>
                    </TabsContent>

                    <TabsContent value="lead-details" className="m-0">
                      <div className="px-5 pt-5 pb-5 space-y-5 relative">
                        {isUpdating && <span className="absolute top-2 right-5 text-[10px] text-muted-foreground flex items-center font-medium bg-muted px-2 py-1 rounded-md"><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Saving</span>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                              <Label htmlFor="lead-source" className="text-xs font-semibold text-muted-foreground mb-1 block">Source</Label>
                              <Select value={detailsState.source} onValueChange={(value) => setDetailsState(s => ({...s, source: value}))} disabled={isUpdating}>
                                  <SelectTrigger id="lead-source" className="h-8 text-sm bg-background">
                                      <SelectValue placeholder="Select source" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {leadSources.map(source => <SelectItem key={source.id} value={source.name} className="text-sm">{source.name}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <div>
                              <Label htmlFor="lead-client-type" className="text-xs font-semibold text-muted-foreground mb-1 block">Customer Type</Label>
                              <Select value={detailsState.clientType} onValueChange={(value) => setDetailsState(s => ({...s, clientType: value}))} disabled={isUpdating}>
                                  <SelectTrigger id="lead-client-type" className="h-8 text-sm bg-background">
                                      <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {CLIENT_TYPES.map(p => <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <div>
                              <Label htmlFor="lead-assigned" className="text-xs font-semibold text-muted-foreground mb-1 block">Assigned To</Label>
                              <Select value={detailsState.assignedTo} onValueChange={(value) => setDetailsState(s => ({...s, assignedTo: value}))} disabled={isUpdating}>
                                  <SelectTrigger id="lead-assigned" className="h-8 text-sm bg-background">
                                      <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                  <SelectContent>{users.map(user => <SelectItem key={user.id} value={user.name} className="text-sm">{user.name}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          <div>
                              <Label htmlFor="lead-kw" className="text-xs font-semibold text-muted-foreground mb-1 block">Capacity (kW)</Label>
                              <Input
                                  id="lead-kw"
                                  key={`kw-${lead.id}`}
                                  type="number"
                                  value={detailsState.kilowatt}
                                  onChange={(e) => setDetailsState(s => ({...s, kilowatt: e.target.value}))}
                                  className="h-8 text-sm bg-background"
                                  disabled={isUpdating}
                              />
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-border/50">
                          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Permanent Notes</Label>
                          <Textarea 
                            key={`notes-${lead.id}`}
                            placeholder="Type notes here..." 
                            value={detailsState.notes}
                            onChange={(e) => setDetailsState(s => ({...s, notes: e.target.value}))}
                            disabled={isUpdating}
                            className="min-h-[100px] text-sm bg-background focus-visible:ring-1 resize-none" 
                          />
                        </div>
                        
                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleUpdateDetails} disabled={isUpdating} className="font-semibold shadow-sm">
                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Update Details
                            </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          {/* RIGHT COLUMN: History & Records Tabs */}
          <div className="lg:col-span-7 sticky top-0 h-[calc(100vh-150px)] pb-4 flex flex-col">
            <Card className="shadow-sm border-border/50 h-full flex flex-col">
              <Tabs defaultValue="activity" className="w-full h-full flex flex-col overflow-hidden">
                <CardHeader className="pb-0 border-b px-2 pt-2 bg-muted/10 rounded-t-xl shrink-0">
                  <TabsList className="h-10 bg-transparent border-b-0 w-full justify-start overflow-x-auto rounded-none p-0">
                    <TabsTrigger value="activity" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold">Activity History ({lead.followupCount || 0})</TabsTrigger>
                    <TabsTrigger value="proposals" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold">Proposals ({proposals.length})</TabsTrigger>
                    <TabsTrigger value="surveys" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold">Surveys ({surveys.length})</TabsTrigger>
                    <TabsTrigger value="bills" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold">E-Bills ({lead.electricityBillUrls?.length || 0})</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="p-0 flex-grow overflow-y-auto scrollbar-none relative">
                  
                  {/* Activity Tab */}
                  <TabsContent value="activity" className="p-5 m-0 h-full">
                    {isActivitiesLoading ? (
                      <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : activities.length > 0 ? (
                      <div className="relative pl-6 border-l-2 border-muted space-y-4 mt-2 ml-2">
                        {activities.map((activity, index) => {
                          const activityNumber = activities.length - index;
                          return (
                          <div key={activity.id} className="relative flex flex-col gap-1.5 p-3 border border-border/50 rounded-lg hover:bg-muted/10 transition-colors shadow-sm bg-background">
                            {/* Circle on the line */}
                            <div className="absolute -left-[33px] top-3 h-6 w-6 rounded-full border-[3px] border-background bg-primary shadow-sm z-10 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                               {activityNumber}
                            </div>
                            
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <ActivityIcon type={activity.type} className="h-3.5 w-3.5 text-primary" />
                                <span className="font-semibold text-[13px] text-foreground">{activity.type}</span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">
                                  • {format(parseISO(activity.createdAt), 'dd MMM yyyy, p')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider sm:hidden">
                                  {format(parseISO(activity.createdAt), 'dd MMM yyyy, p')}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-[13px] text-foreground mt-0.5 font-medium leading-snug">
                                {activity.comment || (activity.followupOrTask === 'Task' ? 'Task Scheduled' : 'Activity Logged')}
                            </p>
                            
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                {activity.leadStageAtTimeOfFollowUp && (
                                  <Badge variant="outline" className="capitalize text-[9px] px-1.5 py-0 h-4 bg-background">{activity.leadStageAtTimeOfFollowUp}</Badge>
                                )}
                                {activity.followupOrTask === 'Task' ? (
                                  activity.taskStatus === 'Closed' ? (
                                      <Badge className="bg-primary/10 text-primary border-transparent hover:bg-primary/20 text-[9px] px-1.5 py-0 h-4">
                                        <CheckCircle className="mr-1 h-2.5 w-2.5"/> Completed
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-amber-100 text-amber-800 border-transparent hover:bg-amber-200 text-[9px] px-1.5 py-0 h-4">
                                        Due: {activity.taskDate ? format(parseISO(activity.taskDate), 'dd MMM') : ''} {activity.taskTime || ''}
                                      </Badge>
                                    )
                                  ) : null}
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">By <span className="font-bold text-foreground">{activity.createdBy || 'System'}</span></p>
                          </div>
                        )})}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg border-dashed bg-muted/10">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-semibold text-foreground">No activity logged yet</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">Use the form on the left to log calls, meetings, or schedule future follow-up tasks.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Proposals Tab */}
                  <TabsContent value="proposals" className="p-5 m-0">
                    <div className="mb-4 flex justify-end">
                      <Button variant="outline" size="sm" onClick={handleCreateNewProposal} className="h-8 shadow-sm">
                        <FileText className="mr-2 h-3.5 w-3.5" /> Create Proposal
                      </Button>
                    </div>
                    {proposals.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {proposals.map(proposal => (
                          <div key={proposal.id} onClick={() => { if(proposal.pdfUrl) openPdfInNewTab(proposal.pdfUrl); else toast({title: 'No PDF', description: 'PDF not generated for this proposal.', variant: 'destructive'}) }} className="flex flex-col p-4 border border-border/50 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="bg-primary/10 p-2 rounded-md"><FileText className="h-4 w-4 text-primary" /></div>
                              <div>
                                <p className="font-bold text-sm text-foreground">{proposal.proposalNumber}</p>
                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{format(parseISO(proposal.proposalDate), 'dd MMM yyyy')}</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-end mt-auto pt-2 border-t border-border/50">
                               <p className="text-xs text-muted-foreground font-medium">{proposal.capacity} kW System</p>
                               <p className="font-bold text-sm flex items-center text-foreground"><IndianRupee className="h-3.5 w-3.5 mr-0.5" />{proposal.finalAmount.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg border-dashed bg-muted/10">
                         <FileText className="h-8 w-8 text-muted-foreground/30 mb-3" />
                         <p className="text-sm font-semibold text-foreground">No proposals created</p>
                         <p className="text-xs text-muted-foreground mt-1">Generate a proposal for this lead to send them a quotation.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Surveys Tab */}
                  <TabsContent value="surveys" className="p-5 m-0">
                     {surveys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg border-dashed bg-muted/10">
                          <ClipboardEdit className="h-8 w-8 text-muted-foreground/30 mb-3" />
                          <p className="text-sm font-semibold text-foreground">No site surveys</p>
                          <p className="text-xs text-muted-foreground mt-1">Surveys conducted for this lead will appear here.</p>
                        </div>
                      ) : (
                          <Accordion type="single" collapsible className="w-full space-y-3">
                              {surveys.map(survey => (
                                  <AccordionItem value={survey.id} key={survey.id} className="border border-border/50 rounded-lg px-4 bg-background shadow-sm">
                                      <AccordionTrigger className="py-4 hover:no-underline">
                                          <div className="flex flex-col items-start w-full pr-2 text-left">
                                              <span className="text-sm font-semibold">Survey No: {survey.surveyNumber.slice(-8)}</span>
                                              <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><i className="ri-calendar-line" /> {format(parseISO(survey.date), 'dd MMM yyyy')}</span>
                                          </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="p-0 pb-4">
                                         <div className="text-xs space-y-3 p-4 bg-muted/20 border border-border/50 rounded-lg">
                                                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                                                  <div><span className="text-muted-foreground block mb-0.5">Surveyor</span> <span className="font-semibold">{survey.surveyorName || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Consumer Name</span> <span className="font-semibold">{survey.consumerName || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Category</span> <span className="font-semibold">{survey.consumerCategory || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Location</span> <span className="font-semibold">{survey.location || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Discom</span> <span className="font-semibold">{survey.discom || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Sanctioned Load</span> <span className="font-semibold">{survey.sanctionedLoad || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Load Type</span> <span className="font-semibold">{survey.consumerLoadType || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Meters</span> <span className="font-semibold">{survey.numberOfMeters || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Meter Phase</span> <span className="font-semibold">{survey.meterPhase || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Meter Rating</span> <span className="font-semibold">{survey.meterRating || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Monthly Bill</span> <span className="font-semibold">{survey.electricityAmount ? `₹${survey.electricityAmount}` : 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Roof Type</span> <span className="font-semibold">{survey.roofType || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Building Height</span> <span className="font-semibold">{survey.buildingHeight || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Shadow-Free Area</span> <span className="font-semibold">{survey.shadowFreeArea || 'N/A'}</span></div>
                                                                                                    <div className="col-span-2 sm:col-span-4"><span className="text-muted-foreground block mb-0.5">Remark</span> <span className="font-semibold">{survey.remark || 'N/A'}</span></div>
                                                  <div className="col-span-2 sm:col-span-4">
                                                    <span className="text-muted-foreground block mb-0.5">Attachments</span>
                                                    <span className="font-semibold">
                                                      {survey.electricityBillFiles && survey.electricityBillFiles.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                          {survey.electricityBillFiles.map((file, i) => (
                                                            <a key={i} href={typeof file === 'string' ? file : (file as any).url || file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-500 hover:underline bg-blue-500/10 px-2 py-1 rounded text-xs">
                                                              <i className="ri-attachment-2 mr-1"></i> File {i + 1}
                                                            </a>
                                                          ))}
                                                        </div>
                                                      ) : 'N/A'}
                                                    </span>
                                                  </div>
                                              </div>
                                          </div>
                                      </AccordionContent>
                                  </AccordionItem>
                              ))}
                          </Accordion>
                      )}
                  </TabsContent>

                  {/* E-Bills Tab */}
                  <TabsContent value="bills" className="p-5 m-0">
                      <div className="mb-4 flex justify-end">
                        <Label htmlFor="bill-upload" className="flex items-center h-8 px-3 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md cursor-pointer shadow-sm transition-colors border">
                            {isUploadingBill ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> : <UploadCloud className="mr-2 h-3.5 w-3.5"/>}
                            Upload New Bill
                        </Label>
                        <Input id="bill-upload" type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleBillUpload} disabled={isUploadingBill}/>
                      </div>

                      {lead.electricityBillUrls && lead.electricityBillUrls.length > 0 ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {lead.electricityBillUrls.map((url, index) => (
                                  <div key={url} className="flex items-center gap-2 group p-3 border border-border/50 rounded-lg bg-background shadow-sm hover:border-primary/50 transition-colors">
                                    <div className="bg-primary/10 p-2 rounded-md"><UploadCloud className="h-4 w-4 text-primary" /></div>
                                    <div className="flex-grow min-w-0">
                                      <p className="text-sm font-semibold truncate cursor-pointer hover:underline" onClick={() => setBillToPreview(url)}>Bill Document {index + 1}</p>
                                      <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{url.split('-').pop()}</p>
                                    </div>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" disabled={isDeletingBill}>
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
                                              <AlertDialogAction onClick={() => handleDeleteBill(url)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                              ))}
                          </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg border-dashed bg-muted/10">
                          <UploadCloud className="h-8 w-8 text-muted-foreground/30 mb-3" />
                          <p className="text-sm font-semibold text-foreground">No electricity bills</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-sm">Upload electricity bills to help with system sizing and proposals.</p>
                        </div>
                      )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
      </div>
      
      {/* DIALOGS */}
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
  );
}
