
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
import { FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES, CLIENT_PRIORITY_OPTIONS, CLIENT_TYPES, DEAL_PIPELINES } from '@/lib/constants';
import type { Client, User, UserOptionType, FollowUp, FollowUpStatus, AddActivityData, FollowUpType, CreateClientData, ClientStatusType, ClientPriorityType, Proposal, CustomSetting, SiteSurvey, DocumentType, Deal, DealPipelineType, DealStage, ClientType } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit, Phone, MessageSquare, Mail, MessageCircle, UserCircle2, FileText, ShoppingCart, Loader2, Save, Send, Video, Building, Repeat, UserX, IndianRupee, ClipboardEdit, Eye, UploadCloud, PlusCircle, CheckCircle, LoaderPinwheel, LoaderIcon, Loader } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getClientById, updateClient, addClientActivity, getActivitiesForClient, convertClientToLead } from '@/app/(app)/clients-list/actions';
import { getProposalsForClient, createOrUpdateProposal } from '@/app/(app)/proposals/actions';
import { getDealsForClient, createOrUpdateDeal } from '@/app/(app)/deals/actions';
import { getSurveysForClient } from '@/app/(app)/site-survey/actions';
import { getUsers } from '@/app/(app)/users/actions';
import { getClientStatuses, getLeadSources } from '@/app/(app)/settings/actions';
import { ClientForm } from '@/app/(app)/clients/client-form';
import { DealForm, type DealFormValues } from '@/app/(app)/deals/deal-form';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ProposalPreviewDialog } from '@/app/(app)/proposals/proposal-preview-dialog';
import { ProposalForm } from '@/app/(app)/proposals/proposal-form';
import { TemplateSelectionDialog } from '@/app/(app)/proposals/template-selection-dialog';
import { DocumentCreationDialog } from '@/app/(app)/documents/document-creation-dialog';
import { DocumentTemplateSelectionDialog } from '@/app/(app)/documents/document-template-selection-dialog';
import { TaskCompletionToast } from '@/components/task-completion-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { sendCallNotification } from '@/lib/fcm';
import { useSession } from '@/hooks/use-sessions';
import { useIsMobile } from '@/hooks/use-mobile';

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

export default function ClientDetailsPage() {
  const router = useRouter();
  const session = useSession();
  const isMobile = useIsMobile();
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = typeof params.clientId === 'string' ? params.clientId : null;
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<CustomSetting[]>([]);
  const [sources, setSources] = useState<CustomSetting[]>([])
  const [isFormPending, startFormTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isConverting, startConversionTransition] = useTransition();
  const [isStatusChanging, startStatusChangeTransition] = useTransition();
  const [isUploadingBill, startBillUploadTransition] = useTransition();
  
  const [activities, setActivities] = useState<FollowUp[]>([]);
  const [isActivitiesLoading, setActivitiesLoading] = useState(true);
  const [surveys, setSurveys] = useState<SiteSurvey[]>([]);

  const [isProposalFormOpen, setIsProposalFormOpen] = useState(false);
  const [isDealFormOpen, setIsDealFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isProposalTemplateDialogOpen, setIsProposalTemplateDialogOpen] = useState(false);
  const [selectedProposalTemplateId, setSelectedProposalTemplateId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activityComment, setActivityComment] = useState('');

  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isDocumentTemplateDialogOpen, setIsDocumentTemplateDialogOpen] = useState(false);
  const [documentTypeToCreate, setDocumentTypeToCreate] = useState<DocumentType | null>(null);
  const [selectedDocumentTemplateId, setSelectedDocumentTemplateId] = useState<string | null>(null);
  const [documentPreviewUrls, setDocumentPreviewUrls] = useState<{ pdfUrl: string, docxUrl: string } | null>(null);


  const [activityType, setActivityType] = useState<FollowUpType>(FOLLOW_UP_TYPES[0]);
  const [activityDate, setActivityDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [activityTime, setActivityTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [activityStatus, setActivityStatus] = useState<FollowUpStatus>(FOLLOW_UP_STATUSES[0]);
  const [activityClientStage, setActivityClientStage] = useState<ClientStatusType | undefined>();
  
  const [taskForUser, setTaskForUser] = useState<string | undefined>(undefined);
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedProposalForPreview, setSelectedProposalForPreview] = useState<Proposal | null>(null);
  const [billToPreview, setBillToPreview] = useState<string|null>(null);

  const fetchProposals = async () => {
    if (clientId) {
      const fetchedProposals = await getProposalsForClient(clientId);
      setProposals(fetchedProposals);
    }
  };
  
  const fetchDeals = async () => {
      if (clientId) {
          const fetchedDeals = await getDealsForClient(clientId);
          setDeals(fetchedDeals);
      }
  };

  useEffect(() => {
    if (clientId) {
      const fetchDetails = async () => {
        setClient(undefined);
        try {
           const [fetchedClient, fetchedUsers, fetchedActivities, fetchedProposals, fetchedDeals, fetchedStatuses,fetchedSources, fetchedSurveys] = await Promise.all([
            getClientById(clientId),
            getUsers(),
            getActivitiesForClient(clientId),
            getProposalsForClient(clientId),
            getDealsForClient(clientId),
            getClientStatuses(),
            getLeadSources(),
            getSurveysForClient(clientId),
          ]);

          setClient(fetchedClient);
          setUsers(fetchedUsers);
          setActivities(fetchedActivities);
          setProposals(fetchedProposals);
          setDeals(fetchedDeals);
          setStatuses(fetchedStatuses);
          setSources(fetchedSources);
          setSurveys(fetchedSurveys);

          if (fetchedClient) {
            setActivityClientStage(fetchedClient.status as ClientStatusType);
          }
          if (fetchedUsers.length > 0) {
            setTaskForUser(fetchedUsers[0].name);
          }
        } catch (error) {
          console.error("Failed to fetch client details:", error);
          setClient(null);
          toast({
            title: "Error",
            description: "Could not load client details.",
            variant: "destructive",
          });
        } finally {
            setActivitiesLoading(false);
        }
      };
      
      fetchDetails();
    } else {
      setClient(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, toast]);

  useEffect(() => {
    if (client) {
        setActivityClientStage(client.status as ClientStatusType);
    }
  }, [client]);

  const handleBillUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !client) return;

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

        const updatedClient = await updateClient(client.id, { 
            electricityBillUrls: [...(client.electricityBillUrls || []), ...newUrls] 
        });
        
        if (updatedClient) {
          setClient(updatedClient);
          toast({ title: "E-Bills Uploaded", description: `${newUrls.length} bill(s) have been successfully attached.` });
        } else {
          throw new Error("Failed to save the bill URLs to the client.");
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
        toast({ title: "Error", description: "Could not save proposal to database.", variant: "destructive" });
      }
    });
    setIsProposalFormOpen(false);
    setSelectedProposalTemplateId(null);
  };
  
  const handleDealSubmit = (data: DealFormValues) => {
    if (!clientId) return;
    startFormTransition(async () => {
      const result = await createOrUpdateDeal({
        ...data,
        poWoDate: format(data.poWoDate, 'yyyy-MM-dd'),
        clientId,
      });
      if (result) {
        toast({
          title: "Deal Saved",
          description: `Deal for ${result.clientName} has been saved.`,
        });
        await fetchDeals(); // Refresh deals
        const updatedClient = await getClientById(clientId);
        setClient(updatedClient);
      } else {
        toast({ title: "Error", description: "Could not save deal.", variant: "destructive" });
      }
    });
    setIsDealFormOpen(false);
  };


  const handleCreateNewProposal = () => {
      setIsProposalTemplateDialogOpen(true);
  };

  const handleProposalTemplateSelected = (templateId: string) => {
      setSelectedProposalTemplateId(templateId);
      setIsProposalTemplateDialogOpen(false);
      setIsProposalFormOpen(true);
  };

  const handleCreateNewDocument = (type: DocumentType) => {
    setDocumentTypeToCreate(type);
    setIsDocumentTemplateDialogOpen(true);
  };

  const handleDocumentTemplateSelected = (templateId: string) => {
      setSelectedDocumentTemplateId(templateId);
      setIsDocumentTemplateDialogOpen(false);
      setIsDocumentDialogOpen(true);
  };

  const handleDocumentGenerationSuccess = (urls: { pdfUrl: string, docxUrl: string }) => {
      setIsDocumentDialogOpen(false);
      setDocumentPreviewUrls(urls);
  };
  
  const closeDocumentDialogs = () => {
      setIsDocumentTemplateDialogOpen(false);
      setIsDocumentDialogOpen(false);
      setDocumentTypeToCreate(null);
      setSelectedDocumentTemplateId(null);
  };


  const handleSaveActivity = () => {
    if (!client) return;

    startFormTransition(async () => {
      const isTask = taskDate && taskTime;
      const activityCategory = isTask ? 'Task' : 'Followup';

      const activityData: AddActivityData = {
        followupOrTask: activityCategory,
        clientId: client.id,
        type: activityType,
        date: activityDate,
        time: activityTime,
        status: activityStatus,
        leadStageAtTimeOfFollowUp: activityClientStage,
        comment: activityComment,
        ...(isTask && {
          taskForUser,
          taskDate,
          taskTime
        }),
      };

      const newActivity = await addClientActivity(activityData);

      if (newActivity) {
        toast({
          title: `${activityCategory} Saved`,
          description: `${activityType} for ${client.name} has been recorded.`,
        });
        setActivities(prev => [newActivity, ...prev]);
        const updatedClient = await getClientById(client.id);
        if (updatedClient) {
          setClient(updatedClient);
        }
        setActivityComment('');
        if (users.length > 0) {
            setTaskForUser(users[0].name);
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
    key: 'status' | 'priority' | 'assignedTo' | 'clientType' | 'kilowatt' | 'source' | 'notes',
    value: string | number
  ) => {
    if (!client || value === undefined || isUpdating) return;
    const originalClient = { ...client };

    setClient(prev => (prev ? { ...prev, [key]: value } : null));

    startUpdateTransition(async () => {
        const result = await updateClient(client.id, { [key]: value });
        if (result) {
            setClient(result);
            toast({
                title: `${key.charAt(0).toUpperCase() + key.slice(1)} Updated`,
                description: `Client ${key} set to "${value}".`,
            });
        } else {
            setClient(originalClient);
            toast({
                title: "Update Failed",
                description: `Could not update client ${key}.`,
                variant: "destructive",
            });
        }
    });
  };

  const handleOpenEditForm = () => {
    if (client) {
      setIsEditFormOpen(true);
    }
  };

  const handleEditFormSubmit = async (updatedClientData: CreateClientData | Client) => {
    if (!client || !client.id) return;
    startFormTransition(async () => {
      const result = await updateClient(client.id, updatedClientData as Partial<CreateClientData>);
      if (result) {
        setClient(result);
        toast({ title: "Client Updated", description: `${result.name}'s information has been updated.` });
        setIsEditFormOpen(false);
      } else {
        toast({ title: "Error", description: "Failed to update client.", variant: "destructive" });
      }
    });
  };
  
  const handleConvertToLead = () => {
    if (!client || isConverting) return;
    startConversionTransition(async () => {
        const result = await convertClientToLead(client.id);
        if (result.success && result.leadId) {
            toast({
                title: "Conversion Successful",
                description: `${client.name} has been converted back to a lead.`
            });
            router.push(`/leads/${result.leadId}`);
        } else {
            toast({
                title: "Conversion Failed",
                description: result.message || "Could not convert client to lead.",
                variant: "destructive",
            });
        }
    });
  };

  const handleSetClientStatus = (status: ClientStatusType) => {
    if (!client || isStatusChanging) return;
    startStatusChangeTransition(async () => {
      const result = await updateClient(client.id, { status });
      if (result) {
        toast({
          title: `Client Status Updated`,
          description: `${client.name} has been marked as ${status}.`
        });
        if (status === 'Inactive') {
          router.push('/inactive-clients');
        } else {
          setClient(result);
        }
      } else {
        toast({
          title: "Status Update Failed",
          description: "Could not update the client's status.",
          variant: "destructive",
        });
      }
    });
  };
  

  const handleInitiateCall = () => {
    if (!client || !client.phone ) {
        toast({ title: "Cannot Initiate Call", description: "Client must have a phone number and be assigned to a user.", variant: "destructive" });
        return;
    }
    const loggedInUser = users.find(u => u.id === session?.userId);
    if (!loggedInUser?.deviceId) {
        toast({ title: "Cannot Initiate Call", description: "You do not have a registered mobile device. Please login to the mobile app.", variant: "destructive" });
        return;
    }

    startUpdateTransition(async () => {
        toast({ title: "Initiating Call...", description: "Sending notification to your mobile device." });
        const result = await sendCallNotification(loggedInUser.deviceId!, client.phone!, client.name);
        if (result.success) {
            toast({ title: "Notification Sent", description: "Check your mobile device to place the call." });
        } else {
            toast({ title: "Failed to Send Notification", description: result.error, variant: "destructive" });
        }
    });
  };

  const CallButton = () => {
    if (!client?.phone) {
      return (
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled>
          <Phone className="h-5 w-5" />
        </Button>
      );
    }
    if (isMobile) {
      return (
        <a href={`tel:${client.phone}`}>
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

  if (client === undefined) {
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Loader className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading Client Details...</p>
        </div>
    );
  }

  if (client === null) {
    return (
        <div className="flex flex-col flex-1 items-center justify-center h-full p-8 text-center">
            <UserCircle2 className="h-16 w-16 mb-4 text-destructive" />
            <h2 className="text-2xl font-semibold mb-2">Client Not Found</h2>
            <p className="text-muted-foreground mb-6">
                The client you are looking for does not exist or could not be loaded.
            </p>
            <Button onClick={() => router.push('/clients-list')}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Clients List
            </Button>
        </div>
    );
  }

  const creationDateTime = client.createdAt && isValid(parseISO(client.createdAt)) ? format(parseISO(client.createdAt), 'dd-MM-yyyy HH:mm') : 'N/A';
  const nextFollowUpDisplay = client.nextFollowUpDate && isValid(parseISO(client.nextFollowUpDate))
    ? `${format(parseISO(client.nextFollowUpDate), 'dd-MM-yyyy')} ${client.nextFollowUpTime || ''}`.trim()
    : 'Not set';
  
  return (
    <>
    {searchParams.get('from_task') && <TaskCompletionToast taskId={searchParams.get('from_task')!} />}
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b bg-card sticky top-0 z-10">
        <h1 className="text-xl font-semibold font-headline">{client.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button variant="outline" size="sm" disabled>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center pb-2">
                <CardTitle className="text-lg font-semibold">Client Information</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenEditForm} >
                  <Edit className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xl font-bold text-primary">{client.name}</p>
                <p className="text-sm text-muted-foreground">{client.phone || 'No phone number'}</p>
                <p className="text-xs text-muted-foreground">Client Since: {creationDateTime}</p>
                <div>
                  <Label htmlFor="client-stage" className="text-xs font-medium">Stage</Label>
                  <Select value={client.status || ''} onValueChange={(value) => handleAttributeChange('status', value)} disabled={isUpdating}>
                    <SelectTrigger id="client-stage" className="h-8 text-xs">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(stage => <SelectItem key={stage.id} value={stage.name} className="text-xs">{stage.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div>
                  <Label htmlFor="client-priority" className="text-xs font-medium">Priority</Label>
                  <Select value={client.priority || ''} onValueChange={(value) => handleAttributeChange('priority', value as ClientPriorityType)} disabled={isUpdating}>
                    <SelectTrigger id="client-priority" className="h-8 text-xs">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
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
                        <Label htmlFor="client-kw" className="text-xs font-medium">Capacity (KW)</Label>
                        <Input
                            id="client-kw"
                            key={client.id} // Re-renders the input when client data changes
                            type="number"
                            defaultValue={client.kilowatt || ''}
                            onBlur={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value !== client.kilowatt) {
                                    handleAttributeChange('kilowatt', value);
                                }
                            }}
                            className="h-8 text-xs"
                            disabled={isUpdating}
                        />
                    </div>
                    <div>
                        <Label htmlFor="client-type" className="text-xs font-medium">Customer Type</Label>
                        <Select value={client.clientType || ''} onValueChange={(value) => handleAttributeChange('clientType', value as ClientType)} disabled={isUpdating}>
                            <SelectTrigger id="client-type" className="h-8 text-xs">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {CLIENT_TYPES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                      <Label htmlFor="client-source" className="text-xs font-medium">Source</Label>
                      <Select value={client.source || ''} onValueChange={(value) => handleAttributeChange('source', value)} disabled={isUpdating}>
                        <SelectTrigger id="client-source" className="h-8 text-xs">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {sources.map(source => <SelectItem key={source.id} value={source.name} className="text-xs">{source.name}</SelectItem>)}
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
                {client.status !== 'Inactive' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full" disabled={isStatusChanging}>
                        <UserX className="mr-2 h-4 w-4" /> Make Inactive
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Make Client Inactive?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will move "{client.name}" to the inactive clients list. You can reactivate them later. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSetClientStatus('Inactive')} disabled={isStatusChanging}>
                          {isStatusChanging ? "Updating..." : "Yes, Make Inactive"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                 {client.status === 'Inactive' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full" disabled={isStatusChanging}>
                        <UserCircle2 className="mr-2 h-4 w-4" /> Make Active
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Make Client Active?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will move "{client.name}" back to the active clients list with the stage 'Fresher'. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSetClientStatus('Fresher')} disabled={isStatusChanging}>
                           {isStatusChanging ? "Updating..." : "Yes, Make Active"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full" disabled={isConverting}>
                      <Repeat className="mr-2 h-4 w-4" /> Convert to Lead
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Convert Client to Lead?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will move "{client.name}" back to the leads list. This action can be reversed later. Are you sure?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConvertToLead} disabled={isConverting}>
                        {isConverting ? "Converting..." : "Yes, Convert"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={handleCreateNewProposal} className="w-full" size="sm"><FileText className="mr-2 h-4 w-4" /> Create Proposal</Button>
                <Button onClick={() => handleCreateNewDocument('Purchase Order')} className="w-full" variant="outline" size="sm"><ShoppingCart className="mr-2 h-4 w-4" /> Create Purchase Order</Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-6 space-y-6">
             <Card>
              <CardHeader><CardTitle>New Activity</CardTitle></CardHeader>
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
                    <Label htmlFor="activityClientStage">Client Stage</Label>
                    <Select value={activityClientStage} onValueChange={(val) => setActivityClientStage(val as ClientStatusType)}><SelectTrigger id="activityClientStage"><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent>{statuses.map(stage => <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="activityComment">Activity Comment</Label>
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
              <CardHeader><CardTitle>Activity History ({client.followupCount || 0})</CardTitle></CardHeader>
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
                            <Badge variant="secondary" className="capitalize bg-teal-100 text-teal-800 border-transparent hover:bg-teal-200">
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
                   <Avatar className="h-8 w-8"><AvatarImage src={`https://placehold.co/40x40.png?text=${client.assignedTo?.charAt(0) || 'U'}`} data-ai-hint="user avatar" /><AvatarFallback>{client.assignedTo?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                   <Select
                      value={client.assignedTo || ''}
                      onValueChange={(value) => handleAttributeChange('assignedTo', value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-9 text-sm flex-grow">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>{users.map(user => <SelectItem key={user.id} value={user.name} className="text-sm">{user.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <p className="text-xs text-muted-foreground ml-10">Assigned to</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-1">
                 <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8"><AvatarImage src={`https://placehold.co/40x40.png?text=${client.createdBy?.charAt(0) || 'S'}`} data-ai-hint="user avatar"/><AvatarFallback>{client.createdBy?.charAt(0) || 'S'}</AvatarFallback></Avatar>
                  <p className="text-sm font-medium flex-grow bg-muted px-3 py-2 rounded-md h-9 flex items-center">{client.createdBy || 'System'}</p>
                </div>
                <p className="text-xs text-muted-foreground ml-10">Created by</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/10 border-primary/20">
                <CardContent className="pt-6 text-center">
                    <p className="text-sm text-primary font-semibold">Total Deal Value</p>
                    <p className="text-3xl font-bold text-primary flex items-center justify-center">
                        <IndianRupee className="h-7 w-7 mr-1" />
                        {client.totalDealValue?.toLocaleString('en-IN') || 0}
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="text-md">Add New Deal</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        className="w-full h-20 border-dashed"
                        onClick={() => setIsDealFormOpen(true)}
                    >
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                    </Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2 pt-4"><CardTitle className="text-md">E-Bills ({client.electricityBillUrls?.length || 0})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {client.electricityBillUrls && client.electricityBillUrls.length > 0 ? (
                       <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {client.electricityBillUrls.map((url, index) => (
                                <Button key={url} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setBillToPreview(url)}>
                                    <Eye className="mr-2 h-4 w-4" /> 
                                    <span className="truncate">View Bill {index + 1} ({url.split('-').pop()})</span>
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-xs text-muted-foreground p-2">No bills uploaded.</div>
                    )}
                    <div>
                        <Label htmlFor="bill-upload" className={cn(buttonVariants({variant: "secondary", size: "sm"}), "w-full cursor-pointer")}>
                            {isUploadingBill ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4"/>}
                            {client.electricityBillUrls?.length ? 'Upload More Bills' : 'Upload Bills'}
                        </Label>
                        <Input id="bill-upload" type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleBillUpload} disabled={isUploadingBill}/>
                    </div>
                </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4"><CardTitle className="text-md">Notes</CardTitle></CardHeader>
              <CardContent>
                <Textarea 
                  key={client.id}
                  placeholder="Add notes here..." 
                  defaultValue={client.notes || ''}
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
                   <p className="text-sm text-center text-muted-foreground py-6">No proposals created for this client yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {isProposalFormOpen && client && (
        <ProposalForm
            isOpen={isProposalFormOpen}
            onClose={() => { setIsProposalFormOpen(false); setSelectedProposalTemplateId(null); }}
            onSubmit={handleProposalSubmit}
            clients={[client]}
            leads={[]}
            templateId={selectedProposalTemplateId}
        />
      )}
       {isDealFormOpen && client && (
         <DealForm
            isOpen={isDealFormOpen}
            onClose={() => setIsDealFormOpen(false)}
            onSubmit={handleDealSubmit}
            users={users}
            clients={[client]}
         />
       )}
      <TemplateSelectionDialog
        isOpen={isProposalTemplateDialogOpen}
        onClose={() => setIsProposalTemplateDialogOpen(false)}
        onSelect={handleProposalTemplateSelected}
      />
      
      {documentTypeToCreate && (
        <DocumentTemplateSelectionDialog
          isOpen={isDocumentTemplateDialogOpen}
          onClose={closeDocumentDialogs}
          onSelect={handleDocumentTemplateSelected}
          documentType={documentTypeToCreate}
        />
      )}
      
      {isDocumentDialogOpen && documentTypeToCreate && selectedDocumentTemplateId && (
        <DocumentCreationDialog
          isOpen={isDocumentDialogOpen}
          onClose={closeDocumentDialogs}
          documentType={documentTypeToCreate}
          templateId={selectedDocumentTemplateId}
          onSuccess={handleDocumentGenerationSuccess}
        />
      )}

      {isEditFormOpen && client && (<ClientForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} onSubmit={handleEditFormSubmit} client={client} users={users} statuses={statuses} sources={sources}/>)}
      
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

      {documentPreviewUrls && (
        <ProposalPreviewDialog
            isOpen={!!documentPreviewUrls}
            onClose={() => setDocumentPreviewUrls(null)}
            pdfUrl={documentPreviewUrls.pdfUrl}
            docxUrl={documentPreviewUrls.docxUrl}
        />
      )}
    </div>
    </>
  );
}
