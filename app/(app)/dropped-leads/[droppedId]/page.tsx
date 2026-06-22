
'use client';

import { useEffect, useState, useTransition, ChangeEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CLIENT_TYPES } from '@/lib/constants';
import type { DroppedLead, FollowUp, SiteSurvey, Proposal, LeadSourceOptionType, ClientType, CustomSetting } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { ChevronLeft, ChevronsLeft, ChevronsRight,UserCircle2, Loader2, Lock, Send, Video, Building, Repeat, CalendarX2, Phone, MessageSquare, Mail, ClipboardEdit, Eye, UploadCloud, FileText, IndianRupee } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getDroppedLeadById, getActivitiesForDroppedLead, reactivateLead, getSurveysForDroppedLead, getProposalsForDroppedLead, updateDroppedLead } from '@/app/(app)/dropped-leads-list/actions';
import { getLeadSources } from '@/app/(app)/settings/actions';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ProposalPreviewDialog } from '@/app/(app)/proposals/proposal-preview-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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


export default function DroppedLeadDetailsPage() {
  const router = useRouter();
  const session = useSession();
  const isMobile = useIsMobile();
  const params = useParams();
  const droppedId = typeof params.droppedId === 'string' ? params.droppedId : null;
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [droppedLead, setDroppedLead] = useState<DroppedLead | null | undefined>(undefined);
  const [leadSources, setLeadSources] = useState<CustomSetting[]>([]);
  const [isReactivating, startReactivationTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [activities, setActivities] = useState<FollowUp[]>([]);
  const [isActivitiesLoading, setActivitiesLoading] = useState(true);
  const [surveys, setSurveys] = useState<SiteSurvey[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isUploadingBill, startBillUploadTransition] = useTransition();
  const [billToPreview, setBillToPreview] = useState<string|null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedProposalForPreview, setSelectedProposalForPreview] = useState<Proposal | null>(null);

    const [navigationIds, setNavigationIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    try {
        const storedIds = sessionStorage.getItem('navigation_ids');
        if (storedIds) {
            const ids = JSON.parse(storedIds);
            setNavigationIds(ids);
            if (droppedId) {
                setCurrentIndex(ids.indexOf(droppedId));
            }
        }
    } catch (e) {
        console.error("Failed to parse navigation IDs from sessionStorage", e);
    }
  }, [droppedId]);

  const navigateTo = (direction: 'next' | 'prev') => {
    if(currentIndex === -1) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if(navigationIds[nextIndex]) {
      router.push(`/dropped-leads/${navigationIds[nextIndex]}?${searchParams.toString()}`);
    }
  };

  useEffect(() => {
    if (droppedId) {
      const fetchDetails = async () => {
        setDroppedLead(undefined);
        setActivitiesLoading(true);
        try {
          const [fetchedLead, fetchedActivities, fetchedSurveys, fetchedProposals, fetchedSources] = await Promise.all([
            getDroppedLeadById(droppedId),
            getActivitiesForDroppedLead(droppedId),
            getSurveysForDroppedLead(droppedId),
            getProposalsForDroppedLead(droppedId),
            getLeadSources(),
          ]);
          setDroppedLead(fetchedLead);
          setActivities(fetchedActivities);
          setSurveys(fetchedSurveys);
          setProposals(fetchedProposals);
          setLeadSources(fetchedSources);
        } catch (error) {
          console.error("Failed to fetch dropped lead details:", error);
          setDroppedLead(null);
          toast({
            title: "Error",
            description: "Could not load dropped lead details.",
            variant: "destructive",
          });
        } finally {
          setActivitiesLoading(false);
        }
      };
      fetchDetails();
    } else {
      setDroppedLead(null);
    }
  }, [droppedId, toast]);

  useEffect(() => {
      if (session && droppedLead && session.viewPermission === 'ASSIGNED' && droppedLead.assignedTo !== session.name) {
        setDroppedLead(null); // This will trigger the "Not Found" view
        toast({
          title: "Access Denied",
          description: "You do not have permission to view this client.",
          variant: "destructive",
        });
      }
    }, [session, droppedLead, toast]);
  
  const handleBillUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !droppedLead) return;

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

        const updatedLead = await updateDroppedLead(droppedLead.id, { 
            electricityBillUrls: [...(droppedLead.electricityBillUrls || []), ...newUrls] 
        });
        
        if (updatedLead) {
          setDroppedLead(updatedLead);
          toast({ title: "E-Bills Uploaded", description: `${newUrls.length} bill(s) have been successfully attached.` });
        } else {
          throw new Error("Failed to save the bill URLs to the lead.");
        }
      } catch (error) {
        toast({ title: "Upload Failed", description: (error as Error).message, variant: "destructive" });
      }
    });
  };

  const handleReactivateLead = () => {
    if (!droppedLead) return;
    startReactivationTransition(async () => {
        const result = await reactivateLead(droppedLead.id);
        if (result.success && result.newLeadId) {
            toast({
                title: "Lead Reactivated",
                description: `${droppedLead.name} has been moved back to the active leads list.`
            });
            router.push(`/leads/${result.newLeadId}`);
        } else {
             toast({
                title: "Reactivation Failed",
                description: result.message || "Could not reactivate the lead.",
                variant: "destructive",
            });
        }
    });
  };

  const CallButton = () => {
    if (!droppedLead?.phone) {
      return (
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled>
          <Phone className="h-5 w-5" />
        </Button>
      );
    }
    if (isMobile) {
      return (
        <a href={`tel:${droppedLead.phone}`}>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Phone className="h-5 w-5" />
          </Button>
        </a>
      );
    }
    return (
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled>
        <Phone className="h-5 w-5" />
      </Button>
    );
  };

const backToListUrl = `/dropped-leads-list?${searchParams.toString()}`;

  if (droppedLead === undefined) {
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading Dropped Lead Details...</p>
        </div>
    );
  }

  if (droppedLead === null) {
    return (
        <div className="flex flex-col flex-1 items-center justify-center h-full p-8 text-center">
            <UserCircle2 className="h-16 w-16 mb-4 text-destructive" />
            <h2 className="text-2xl font-semibold mb-2">Dropped Lead Not Found or Access Denied</h2>
            <p className="text-muted-foreground mb-6">
                The dropped lead you are looking for does not exist or you do not have the permission to view it.
            </p>
            <Button onClick={() => router.push('/dropped-leads-list')}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dropped Leads List
            </Button>
        </div>
    );
  }

  const creationDateTime = droppedLead.createdAt && isValid(parseISO(droppedLead.createdAt)) ? format(parseISO(droppedLead.createdAt), 'dd-MM-yyyy HH:mm') : 'N/A';
  const droppedDateTime = droppedLead.droppedAt && isValid(parseISO(droppedLead.droppedAt)) ? format(parseISO(droppedLead.droppedAt), 'dd-MM-yyyy HH:mm') : 'N/A';

  return (
    <>
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b bg-card sticky top-0 z-10">
        <h1 className="text-xl font-semibold font-headline">{droppedLead.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(backToListUrl)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
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
        <Card className="mb-6 bg-destructive/10 border-destructive/30">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <CalendarX2 className="h-6 w-6 text-destructive"/>
                    <CardTitle className="text-destructive">Lead Dropped</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <p><span className="font-semibold">Reason:</span> {droppedLead.dropReason}</p>
                {droppedLead.dropComment && <p><span className="font-semibold">Comment:</span> {droppedLead.dropComment}</p>}
                <p className="text-xs text-muted-foreground mt-2">Dropped on: {droppedDateTime}</p>
            </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Lead Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xl font-bold text-primary">{droppedLead.name}</p>
                <p className="text-sm text-muted-foreground">{droppedLead.phone || 'No phone number'}</p>
                 <p className="text-sm text-muted-foreground">{droppedLead.email || 'No email'}</p>
                <p className="text-xs text-muted-foreground">Originally Created: {creationDateTime}</p>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Stage at Drop</Label>
                  <p className="text-sm p-2 bg-muted rounded-md">{droppedLead.status}</p>
                </div>
                 <div className="space-y-1">
                  <Label className="text-xs font-medium">Priority at Drop</Label>
                  <p className="text-sm p-2 bg-muted rounded-md">{droppedLead.priority || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="outline" size="sm" disabled={isReactivating}>
                      <Repeat className="mr-2 h-4 w-4" /> Reactivate Lead
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reactivate Lead?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will move "{droppedLead.name}" and all its history back to the active leads list. Are you sure?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReactivateLead} disabled={isReactivating}>
                        {isReactivating ? "Reactivating..." : "Yes, Reactivate"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-md">Attributes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="lead-source" className="text-xs font-medium">Source</Label>
                        <Select value={droppedLead.source || ''} disabled>
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
                            key={droppedLead.id}
                            type="number"
                            defaultValue={droppedLead.kilowatt || ''}
                            className="h-8 text-xs"
                            disabled
                        />
                    </div>
                    <div>
                        <Label htmlFor="lead-client-type" className="text-xs font-medium">Customer Type</Label>
                        <Select value={droppedLead.clientType || ''} disabled>
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

          </div>

          <div className="lg:col-span-6 space-y-6">
            <Card>
              <CardHeader><CardTitle>Activity History ({droppedLead.followupCount || 0})</CardTitle></CardHeader>
              <CardContent>
                {isActivitiesLoading ? (
                   <div className="flex items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : activities.length > 0 ? (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
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
                                <Badge className="bg-primary text-white border-transparent hover:bg-primary/90">
                                  Task Due: {activity.taskDate ? format(parseISO(activity.taskDate), 'dd-MM-yyyy') : ''} {activity.taskTime || ''}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-slate-800 text-white border-transparent hover:bg-slate-700">Followup</Badge>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-center text-muted-foreground py-6">No activity history found.</p>
                )}
              </CardContent>
            </Card>
<Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ClipboardEdit className="h-5 w-5 text-primary" />
                        Site Survey History
                    </CardTitle>
                    <CardDescription>All surveys conducted for this lead.</CardDescription>
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
                   <Avatar className="h-8 w-8"><AvatarImage src={`https://placehold.co/40x40.png?text=${droppedLead.assignedTo?.charAt(0) || 'U'}`} data-ai-hint="user avatar" /><AvatarFallback>{droppedLead.assignedTo?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                   <p className="text-sm font-medium flex-grow bg-muted px-3 py-2 rounded-md h-9 flex items-center">{droppedLead.assignedTo || 'Unassigned'}</p>
                </div>
                <p className="text-xs text-muted-foreground ml-10">Assigned to</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-1">
                 <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8"><AvatarImage src={`https://placehold.co/40x40.png?text=${droppedLead.createdBy?.charAt(0) || 'S'}`} data-ai-hint="user avatar"/><AvatarFallback>{droppedLead.createdBy?.charAt(0) || 'S'}</AvatarFallback></Avatar>
                  <p className="text-sm font-medium flex-grow bg-muted px-3 py-2 rounded-md h-9 flex items-center">{droppedLead.createdBy || 'System'}</p>
                </div>
                <p className="text-xs text-muted-foreground ml-10">Created by</p>
              </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2 pt-4"><CardTitle className="text-md">E-Bills ({droppedLead.electricityBillUrls?.length || 0})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {droppedLead.electricityBillUrls && droppedLead.electricityBillUrls.length > 0 ? (
                       <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {droppedLead.electricityBillUrls.map((url, index) => (
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
                            {droppedLead.electricityBillUrls?.length ? 'Upload More Bills' : 'Upload Bills'}
                        </Label>
                        <Input id="bill-upload" type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleBillUpload} disabled={isUploadingBill}/>
                    </div>
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
                   <p className="text-sm text-center text-muted-foreground py-6">No proposals created for this lead.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    {billToPreview && (
      <ProposalPreviewDialog
          isOpen={!!billToPreview}
          onClose={() => setBillToPreview(null)}
          pdfUrl={billToPreview}
          docxUrl={null}
      />
    )}
    {isPreviewOpen && selectedProposalForPreview && (
      <ProposalPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfUrl={selectedProposalForPreview.pdfUrl || null}
        docxUrl={selectedProposalForPreview.docxUrl || null}
      />
    )}
    </>
  );
}
