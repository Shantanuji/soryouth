
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
import { ChevronLeft, Edit, Phone, MessageSquare, Mail, MessageCircle, UserCircle2, FileText,Handshake, ShoppingCart, Loader2, Save, Send, Video, Building, Repeat, Trash2, UserX, IndianRupee, ClipboardEdit, Eye, UploadCloud, PlusCircle, CheckCircle, Lock, LoaderPinwheel, LoaderIcon, Loader, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getClientById, updateClient, addClientActivity, getActivitiesForClient, convertClientToLead } from '@/app/(app)/clients-list/actions';
import { deleteElectricityBill } from '../../leads-list/actions';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sendCallNotification } from '@/lib/fcm';
import { useSession } from '@/hooks/use-sessions';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';

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
  const [isDeletingBill, startBillDeleteTransition] = useTransition();

  
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

  const [attributesState, setAttributesState] = useState({
    kilowatt: '',
    clientType: '',
    source: '',
  });
  const [notesState, setNotesState] = useState('');
  const [assignedToState, setAssignedToState] = useState('');

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
            if (clientId) {
                setCurrentIndex(ids.indexOf(clientId));
            }
        }
    } catch (e) {
        console.error("Failed to parse navigation IDs from sessionStorage", e);
    }
  }, [clientId]);

  const navigateTo = (direction: 'next' | 'prev') => {
    if(currentIndex === -1) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if(navigationIds[nextIndex]) {
      router.push(`/clients/${navigationIds[nextIndex]}?${searchParams.toString()}`);
    }
  };

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
            setTaskForUser(fetchedClient?.assignedTo || fetchedUsers[0].name);
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
    if (session && client && session.viewPermission === 'ASSIGNED' && client.assignedTo !== session.name) {
      setClient(null); // This will trigger the "Not Found" view
      toast({
        title: "Access Denied",
        description: "You do not have permission to view this client.",
        variant: "destructive",
      });
    }
  }, [session, client, toast]);

  useEffect(() => {
    if (client) {
        setActivityClientStage(client.status as ClientStatusType);
        setAttributesState({
            kilowatt: client.kilowatt?.toString() || '',
            clientType: client.clientType || '',
            source: client.source || '',
        });
        setNotesState(client.notes || '');
        setAssignedToState(client.assignedTo || '');
    }
  }, [client]);

  const handleDeleteBill = (billUrl: string) => {
    if (!clientId) return;
    startBillDeleteTransition(async () => {
      const result = await deleteElectricityBill(clientId, 'client', billUrl);
      if (result.success) {
        setClient(prev => prev ? ({ ...prev, electricityBills: prev.electricityBillUrls.filter(url => url !== billUrl) }) : null);
        toast({ title: 'Success', description: 'Electricity bill has been deleted.' });
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete bill.', variant: 'destructive' });
      }
    });
  };

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
        
        if (updatedClient !== null && !('error' in updatedClient)) {
          setClient(updatedClient);
          toast({ title: "E-Bills Uploaded", description: `${newUrls.length} bill(s) have been successfully attached.` });
        } else {
          toast({title: "Failed to save the bill URLs to the client.", description: updatedClient.error || "Unknown Error", variant: 'destructive'});
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
    if (!activityComment) 
      return toast({title: "Couldn't Save Activity !", description: "Please Enter the Comment First.", variant: "destructive"});

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
            setTaskForUser(updatedClient?.assignedTo || users[0].name);
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
  
  const handleUpdateAttributes = () => {
    if (!client || !client.id) return;
    startUpdateTransition(async () => {
        const result = await updateClient(client.id, { 
            kilowatt: attributesState.kilowatt ? parseFloat(attributesState.kilowatt) : null,
            clientType: attributesState.clientType as ClientType,
            source: attributesState.source,
        });
        if (result !== null && !('error' in result)) {
            setClient(result);
            toast({ title: `Attributes Updated`, description: `Successfully saved attributes.` });
        } else {
            toast({ title: "Update Failed", description: result?.error || 'Unknown Error', variant: "destructive" });
        }
    });
  };

  const handleUpdateNotes = () => {
    if (!client || !client.id) return;
    startUpdateTransition(async () => {
        const result = await updateClient(client.id, { notes: notesState });
        if (result !== null && !('error' in result)) {
            setClient(result);
            toast({ title: `Notes Updated`, description: `Successfully saved notes.` });
        } else {
            toast({ title: "Update Failed", description: result?.error || 'Unknown Error', variant: "destructive" });
        }
    });
  };

  const handleUpdateAssignedTo = () => {
    if (!client || !client.id) return;
    startUpdateTransition(async () => {
        const result = await updateClient(client.id, { assignedTo: assignedToState });
        if (result !== null && !('error' in result)) {
            setClient(result);
            toast({ title: `Assignment Updated`, description: `Successfully saved assignment.` });
        } else {
            toast({ title: "Update Failed", description: result?.error || 'Unknown Error', variant: "destructive" });
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
        if (result !== null && !('error' in result)) {
            setClient(result);
            toast({
                title: `${key.charAt(0).toUpperCase() + key.slice(1)} Updated`,
                description: `Client ${key} set to "${value}".`,
            });
        } else {
            setClient(originalClient);
            toast({
                title: "Update Failed",
                description: `Could not update client ${key}, due to ${result?.error || 'Unknown Error '}`,
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
      if (result !== null && !('error' in result)) {
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
      if (result !==null && !('error' in result)) {
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

  const backToListUrl = () => {
      const base = client?.status === 'Inactive' ? '/inactive-clients' : '/clients-list';
      const query = searchParams.toString();
      return query ? `${base}?${query}` : base;
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
            <h2 className="text-2xl font-semibold mb-2">Client Not Found or Access Denied</h2>
            <p className="text-muted-foreground mb-6">
                The client you are looking for does not exist or you do not have permission to view it
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
    <div className="flex flex-col h-full -mx-5 sm:-mx-6 -mt-5 sm:-mt-6">
      {searchParams.get('from_task') && <TaskCompletionToast taskId={searchParams.get('from_task')!} />}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-xl font-semibold font-headline">Client Details</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(backToListUrl())}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to List
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateTo('prev')} disabled={currentIndex <= 0}>
                <ChevronsLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
             <Button variant="outline" size="sm" onClick={() => navigateTo('next')} disabled={currentIndex < 0 || currentIndex >= navigationIds.length - 1}>
                Next <ChevronsRight className="h-4 w-4 ml-1" />
            </Button>
        </div>
      </div>

      <div className="flex-grow flex flex-col bg-muted/20 overflow-hidden">
        
        {/* CORPORATE HEADER PANEL */}
        <div className="bg-card border-b shadow-sm px-6 py-4 shrink-0 z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            {/* Identity */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{client.name}</h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{client.status || 'Active'}</Badge>
                {client.priority && <Badge variant="outline" className="text-muted-foreground">{client.priority}</Badge>}
              </div>
              <div className="flex items-center gap-5 text-sm text-muted-foreground font-medium">
                {client.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {client.phone}</span>}
                {client.kilowatt && <span className="flex items-center gap-1.5"><i className="ri-flashlight-fill text-amber-500" /> {client.kilowatt} kW</span>}
                <span className="flex items-center gap-1.5"><i className="ri-calendar-line" /> Created {creationDateTime}</span>
              </div>
            </div>
            
            {/* Quick Stats & Assignment */}
            <div className="flex items-center gap-6 md:border-l border-border/50 md:pl-6">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Deal Value</p>
                <p className="text-lg font-bold flex items-center text-foreground"><IndianRupee className="h-3.5 w-3.5 mr-0.5 text-muted-foreground"/> {client.totalDealValue?.toLocaleString('en-IN') || 0}</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Created By</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Avatar className="h-6 w-6 border bg-muted"><AvatarFallback className="text-[10px] text-muted-foreground">{client.createdBy?.charAt(0) || 'S'}</AvatarFallback></Avatar>
                  <span className="text-sm font-semibold">{client.createdBy || 'System'}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Assigned To</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Avatar className="h-6 w-6 border bg-muted"><AvatarFallback className="text-[10px] text-muted-foreground">{client.assignedTo?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                  <Select value={client.assignedTo || ''} onValueChange={(value) => handleAttributeChange('assignedTo', value)} disabled={isUpdating}>
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
                      <Repeat className="mr-2 h-4 w-4" /> Quick Actions
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-3 border border-border shadow-xl rounded-xl flex flex-col gap-2 bg-card">
                    <div className="font-semibold text-[13px] mb-1 px-1">Quick Actions</div>
                    <Button variant="ghost" className="justify-start shadow-sm font-medium h-10" onClick={handleCreateNewProposal}>
                      <FileText className="mr-2 h-4 w-4" /> Create Proposal
                    </Button>
                    <Button variant="ghost" className="justify-start shadow-sm font-medium h-10" onClick={() => handleCreateNewDocument('Purchase Order')}>
                      <ShoppingCart className="mr-2 h-4 w-4" /> Create Purchase Order
                    </Button>
                    <Separator className="my-1"/>
                    {client.status !== 'Inactive' ? (
                       <Button variant="ghost" className="justify-start shadow-sm font-medium h-10 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleSetClientStatus('Inactive')} disabled={isStatusChanging}>
                        <UserX className="mr-2 h-4 w-4" /> Make Inactive
                      </Button>
                    ) : (
                      <Button variant="ghost" className="justify-start shadow-sm font-medium h-10" onClick={() => handleSetClientStatus('Fresher')} disabled={isStatusChanging}>
                        <UserCircle2 className="mr-2 h-4 w-4" /> Make Active
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="justify-start shadow-sm font-medium h-10" disabled={isConverting}>
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
                  </PopoverContent>
                </Popover>
            </div>
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div className="flex-grow overflow-hidden p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
            
            {/* LEFT COLUMN: Activity Logging & Form */}
            <div className="lg:col-span-5 h-full overflow-y-auto scrollbar-none pb-4">
              <Card className="shadow-sm border-border/50 h-full flex flex-col">
                <Tabs defaultValue="activity-followup" className="w-full h-full flex flex-col overflow-hidden">
                  <CardHeader className="pb-0 border-b px-2 pt-2 bg-muted/10 rounded-t-xl shrink-0">
                    <TabsList className="h-10 bg-transparent border-b-0 w-full justify-start overflow-x-auto rounded-none p-0">
                      <TabsTrigger value="activity-followup" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold text-[13px]">Activity & Follow-up</TabsTrigger>
                      <TabsTrigger value="client-details" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold text-[13px]">Client Details</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent className="p-0 flex-grow overflow-y-auto scrollbar-none relative">
                    
                    <TabsContent value="activity-followup" className="m-0 h-full">
                      <Tabs defaultValue="log" className="w-full p-5">
                        <TabsList className="w-full bg-muted/50 mb-4 h-9">
                          <TabsTrigger value="log" className="w-1/2 text-[12px] font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Log Activity</TabsTrigger>
                          <TabsTrigger value="task" className="w-1/2 text-[12px] font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Schedule Task</TabsTrigger>
                        </TabsList>
                        <div className="bg-muted/10 p-4 border border-border/40 rounded-lg">
                          
                          <TabsContent value="log" className="m-0 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="activityType" className="text-[11px] font-bold uppercase text-muted-foreground">Type</Label>
                                    <Select value={activityType} onValueChange={(val) => setActivityType(val as FollowUpType)}>
                                        <SelectTrigger id="activityType" className="h-9 mt-1 bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>{FOLLOW_UP_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="activityClientStage" className="text-[11px] font-bold uppercase text-muted-foreground">Stage Update</Label>
                                    <Select value={activityClientStage} onValueChange={(val) => setActivityClientStage(val as ClientStatusType)}><SelectTrigger id="activityClientStage" className="h-9 mt-1 bg-background"><SelectValue placeholder="Current stage" /></SelectTrigger><SelectContent>{statuses.map(stage => <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>)}</SelectContent></Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 items-end">
                                <div><Label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">Date</Label><Input type="date" className="h-9" value={activityDate} onChange={e => setActivityDate(e.target.value)} /></div>
                                <div><Label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">Time</Label><Input type="time" className="h-9" value={activityTime} onChange={e => setActivityTime(e.target.value)} /></div>
                            </div>
                            <div>
                              <Label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">Outcome / Notes</Label>
                              <Textarea placeholder="What was discussed?" value={activityComment} onChange={e => setActivityComment(e.target.value)} className="resize-none h-20 bg-background" />
                            </div>
                            <Button onClick={handleSaveActivity} className="w-full font-semibold shadow-sm" disabled={isFormPending}>
                              {isFormPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save Activity Log
                            </Button>
                          </TabsContent>

                          <TabsContent value="task" className="m-0 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="taskType" className="text-[11px] font-bold uppercase text-muted-foreground">Task Type</Label>
                                <Select value={activityType} onValueChange={(val) => setActivityType(val as FollowUpType)}>
                                    <SelectTrigger id="taskType" className="h-9 mt-1"><SelectValue /></SelectTrigger>
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

                    <TabsContent value="client-details" className="m-0">
                      <div className="px-5 pt-5 pb-5 space-y-5 relative">
                        {isUpdating && <span className="absolute top-2 right-5 text-[10px] text-muted-foreground flex items-center font-medium bg-muted px-2 py-1 rounded-md"><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Saving</span>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                              <Label htmlFor="client-source" className="text-xs font-semibold text-muted-foreground mb-1 block">Source</Label>
                              <Select value={attributesState.source} onValueChange={(value) => setAttributesState(s => ({...s, source: value}))} disabled={isUpdating}>
                                  <SelectTrigger id="client-source" className="h-8 text-sm bg-background">
                                      <SelectValue placeholder="Select source" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {sources.map(source => <SelectItem key={source.id} value={source.name} className="text-sm">{source.name}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <div>
                              <Label htmlFor="client-type" className="text-xs font-semibold text-muted-foreground mb-1 block">Customer Type</Label>
                              <Select value={attributesState.clientType} onValueChange={(value) => setAttributesState(s => ({...s, clientType: value}))} disabled={isUpdating}>
                                  <SelectTrigger id="client-type" className="h-8 text-sm bg-background">
                                      <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {CLIENT_TYPES.map(p => <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <div>
                              <Label htmlFor="client-kw" className="text-xs font-semibold text-muted-foreground mb-1 block">Capacity (kW)</Label>
                              <Input
                                  id="client-kw"
                                  key={`kw-${client.id}`}
                                  type="number"
                                  value={attributesState.kilowatt}
                                  onChange={(e) => setAttributesState(s => ({...s, kilowatt: e.target.value}))}
                                  className="h-8 text-sm bg-background"
                                  disabled={isUpdating}
                              />
                          </div>
                        </div>
                        
                        <div className="pt-2 flex justify-end">
                            <Button onClick={handleUpdateAttributes} disabled={isUpdating} className="font-semibold shadow-sm">
                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Update Attributes
                            </Button>
                        </div>
                        
                        <div className="pt-2 border-t border-border/50">
                          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Permanent Notes</Label>
                          <Textarea 
                            key={`notes-${client.id}`}
                            placeholder="Type notes here..." 
                            value={notesState}
                            onChange={(e) => setNotesState(e.target.value)}
                            disabled={isUpdating}
                            className="min-h-[100px] text-sm bg-yellow-50 dark:bg-yellow-900/20 focus-visible:ring-1 resize-none" 
                          />
                        </div>
                        
                        <div className="pt-2 flex justify-end">
                            <Button onClick={handleUpdateNotes} disabled={isUpdating} className="font-semibold shadow-sm">
                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Update Notes
                            </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>

            {/* RIGHT COLUMN: History & Records Tabs */}
            <div className="lg:col-span-7 h-full pb-4 flex flex-col">
              <Card className="shadow-sm border-border/50 h-full flex flex-col">
                <Tabs defaultValue="activity" className="w-full h-full flex flex-col overflow-hidden">
                  <CardHeader className="pb-0 border-b px-2 pt-2 bg-muted/10 rounded-t-xl shrink-0">
                    <TabsList className="h-10 bg-transparent border-b-0 w-full justify-start overflow-x-auto rounded-none p-0">
                      <TabsTrigger value="activity" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold text-[13px]">Activity History ({client.followupCount || 0})</TabsTrigger>
                      <TabsTrigger value="deals" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold text-[13px]">Deals History ({deals.length})</TabsTrigger>
                      <TabsTrigger value="proposals" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold text-[13px]">Proposals ({proposals.length})</TabsTrigger>
                      <TabsTrigger value="surveys" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold text-[13px]">Surveys ({surveys.length})</TabsTrigger>
                      <TabsTrigger value="bills" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 font-semibold text-[13px]">E-Bills ({client.electricityBillUrls?.length || 0})</TabsTrigger>
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
                                        <Badge className="bg-orange-100 text-orange-800 border-transparent hover:bg-orange-200 text-[9px] px-1.5 py-0 h-4">
                                          <LoaderPinwheel className="mr-1 h-2.5 w-2.5"/> Task For: {activity.taskForUser}
                                        </Badge>
                                      )
                                    ) : null}
                                    <span className="text-[9px] font-semibold text-muted-foreground uppercase ml-auto">By {activity.createdBy || 'System'}</span>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                            <MessageCircle className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">No activity history yet.</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Use the panel on the left to log your first call, message, or update for this client.</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Deals Tab */}
                    <TabsContent value="deals" className="p-5 m-0 h-full">
                       <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-semibold text-foreground">Deals History</h3>
                          <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setIsDealFormOpen(true)}>
                              <PlusCircle className="mr-2 h-3.5 w-3.5" /> Add Deal
                          </Button>
                      </div>
                      {deals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {deals.map(deal => (
                                <Link key={deal.id} href={`/deals/${deal.id}`} className="block h-full">
                                    <div className="p-3 border border-border/50 rounded-lg hover:border-primary/50 transition-colors bg-background shadow-sm h-full flex flex-col justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <Handshake className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate text-foreground">{deal.pipeline} - {deal.dealFor || deal.stage}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-muted">{deal.stage}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end mt-3 pt-3 border-t border-border/30">
                                            <div>
                                              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Deal Value</p>
                                              <p className="font-bold text-sm flex items-center text-foreground"><IndianRupee className="h-3 w-3 mr-0.5" />{deal.dealValue.toLocaleString('en-IN')}</p>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium">{format(parseISO(deal.poWoDate), 'dd MMM yyyy')}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
                           <Handshake className="h-8 w-8 text-muted-foreground mb-3" />
                           <p className="text-sm font-semibold text-foreground">No deals yet.</p>
                           <p className="text-xs text-muted-foreground mt-1 mb-4">Create a deal for this client.</p>
                           <Button variant="outline" size="sm" onClick={() => setIsDealFormOpen(true)}>
                                <PlusCircle className="mr-2 h-3.5 w-3.5" /> Add Deal
                            </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* Proposals Tab */}
                    <TabsContent value="proposals" className="p-5 m-0 h-full">
                       <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-semibold text-foreground">Proposals Generated</h3>
                          <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={handleCreateNewProposal}>
                              <PlusCircle className="mr-2 h-3.5 w-3.5" /> Generate New
                          </Button>
                      </div>
                      {proposals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {proposals.map(proposal => (
                                <div key={proposal.id} onClick={() => { setSelectedProposalForPreview(proposal); setIsPreviewOpen(true); }} className="p-3 border border-border/50 rounded-lg hover:border-primary/50 transition-colors bg-background shadow-sm cursor-pointer h-full flex flex-col justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate text-foreground">{proposal.proposalNumber}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-muted">{proposal.capacity} kW</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end mt-3 pt-3 border-t border-border/30">
                                        <div>
                                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Value</p>
                                          <p className="font-bold text-sm flex items-center text-foreground"><IndianRupee className="h-3 w-3 mr-0.5" />{proposal.finalAmount.toLocaleString('en-IN')}</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium">{format(parseISO(proposal.proposalDate), 'dd MMM yyyy')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
                           <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                           <p className="text-sm font-semibold text-foreground">No proposals created.</p>
                           <p className="text-xs text-muted-foreground mt-1 mb-4">Generate a customized proposal for this client.</p>
                           <Button variant="outline" size="sm" onClick={handleCreateNewProposal}>
                                <PlusCircle className="mr-2 h-3.5 w-3.5" /> Generate Proposal
                            </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* Surveys Tab */}
                    <TabsContent value="surveys" className="p-5 m-0 h-full">
                      {surveys.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
                           <ClipboardEdit className="h-8 w-8 text-muted-foreground mb-3" />
                           <p className="text-sm font-semibold text-foreground">No site surveys.</p>
                           <p className="text-xs text-muted-foreground mt-1 max-w-xs">Site surveys conducted for this client will appear here.</p>
                        </div>
                      ) : (
                          <Accordion type="single" collapsible className="w-full space-y-2">
                              {surveys.map(survey => (
                                  <AccordionItem value={survey.id} key={survey.id} className="border border-border/50 rounded-lg px-3 shadow-sm bg-background">
                                      <AccordionTrigger className="hover:no-underline py-3">
                                          <div className="flex justify-between items-center w-full pr-4">
                                              <div className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                                  <ClipboardEdit className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div className="text-left">
                                                  <p className="font-semibold text-sm text-foreground">Survey: {survey.surveyNumber.slice(-8)}</p>
                                                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{survey.consumerCategory}</p>
                                                </div>
                                              </div>
                                              <span className="text-xs font-medium text-muted-foreground">{format(parseISO(survey.date), 'dd MMM yyyy')}</span>
                                          </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="pt-2 pb-4">
                                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 pt-3 border-t border-border/30">
                                              <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Surveyor</p>
                                                <p className="text-sm font-medium">{survey.surveyorName}</p>
                                              </div>
                                              <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Roof Type</p>
                                                <p className="text-sm font-medium">{survey.roofType}</p>
                                              </div>
                                              <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Shadow-Free Area</p>
                                                <p className="text-sm font-medium">{survey.shadowFreeArea}</p>
                                              </div>
                                              <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">DISCOM</p>
                                                <p className="text-sm font-medium">{survey.discom}</p>
                                              </div>
                                              <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">No. of Meters</p>
                                                <p className="text-sm font-medium">{survey.numberOfMeters}</p>
                                              </div>
                                              <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Avg Bill</p>
                                                <p className="text-sm font-medium flex items-center"><IndianRupee className="h-3 w-3 mr-0.5"/>{survey.electricityAmount?.toLocaleString('en-IN') || 'N/A'}</p>
                                              </div>
                                          </div>
                                          {survey.remark && (
                                              <div className="mt-4 p-3 bg-muted/30 rounded-md border border-border/50">
                                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Remarks</p>
                                                  <p className="text-xs text-foreground">{survey.remark}</p>
                                              </div>
                                          )}
                                      </AccordionContent>
                                  </AccordionItem>
                              ))}
                          </Accordion>
                      )}
                    </TabsContent>

                    {/* Bills Tab */}
                    <TabsContent value="bills" className="p-5 m-0 h-full">
                       <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-semibold text-foreground">Electricity Bills</h3>
                          <Label htmlFor="bill-upload" className={cn(buttonVariants({variant: "outline", size: "sm"}), "h-8 shadow-sm cursor-pointer")}>
                              {isUploadingBill ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> : <UploadCloud className="mr-2 h-3.5 w-3.5"/>}
                              Upload Bill
                          </Label>
                          <Input id="bill-upload" type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleBillUpload} disabled={isUploadingBill}/>
                      </div>
                      
                      {client.electricityBillUrls && client.electricityBillUrls.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {client.electricityBillUrls.map((url, index) => (
                                <div key={url} className="flex items-center justify-between p-2 pl-3 border border-border/50 rounded-lg shadow-sm bg-background">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                          <i className="ri-flashlight-fill text-amber-500" />
                                      </div>
                                      <div className="min-w-0">
                                          <p className="font-semibold text-sm truncate text-foreground">Bill Document {index + 1}</p>
                                          <p className="text-[10px] text-muted-foreground truncate">{url.split('-').pop()}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => setBillToPreview(url)}>
                                        <Eye className="h-4 w-4 text-muted-foreground" /> 
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" disabled={isDeletingBill}>
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
                                </div>
                            ))}
                        </div>
                      ) : (
                         <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
                           <UploadCloud className="h-8 w-8 text-muted-foreground mb-3" />
                           <p className="text-sm font-semibold text-foreground">No electricity bills.</p>
                           <p className="text-xs text-muted-foreground mt-1 max-w-xs mb-4">Upload electricity bills to keep a record for this client.</p>
                            <Label htmlFor="bill-upload-center" className={cn(buttonVariants({variant: "outline", size: "sm"}), "shadow-sm cursor-pointer")}>
                                <UploadCloud className="mr-2 h-3.5 w-3.5"/> Upload Bill
                            </Label>
                            <Input id="bill-upload-center" type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleBillUpload} disabled={isUploadingBill}/>
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
  );
}
