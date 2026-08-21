'use client';

import type { Proposal, Client, Lead, ClientType, ModuleType, DCRStatus, ModuleWattage, User, CustomSetting, CreateLeadData } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { CLIENT_TYPES, MODULE_TYPES, DCR_STATUSES, MODULE_WATTAGE_OPTIONS } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, IndianRupee, ChevronsUpDown, Check, X, Loader2, PlusCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { LeadForm } from '@/app/(app)/leads/lead-form';
import { getLeads, createLead } from '@/app/(app)/leads-list/actions';
import { getUsers } from '@/app/(app)/users/actions';
import { getLeadStatuses, getLeadSources } from '@/app/(app)/settings/actions';
import { calculateProposalValues } from '@/lib/proposal-calculations';
import { QuickCustomSelect } from '@/components/quick-custom-select';

export const proposalSchema = z.object({
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  templateId: z.string().optional(),
  proposalNumber: z.string().min(3, { message: 'Proposal number must be at least 3 characters.' }),
  proposalDate: z.string({ required_error: "Proposal date is required." }).refine(val => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  name: z.string().min(2, { message: 'Client/Company name must be at least 2 characters.' }),
  clientType: z.string({ required_error: "Client type is required."}),
  contactPerson: z.string().min(2, { message: 'Contact person must be at least 2 characters.' }),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().min(3, { message: 'Location must be at least 3 characters.' }),
  cityArea: z.string().optional(),
  capacity: z.coerce.number().positive({ message: 'Capacity (kW) must be a positive number.' }),
  moduleType: z.string({ required_error: "Module type is required."}),
  moduleWattage: z.string().min(1, { message: "Module wattage is required." }),
  dcrStatus: z.string({ required_error: "DCR/Non-DCR status is required."}),
  inverterRating: z.coerce.number().positive({ message: 'Inverter rating (kW) must be a positive number.' }),
  inverterQty: z.coerce.number().int().positive({ message: 'Inverter quantity must be a positive integer.' }),
  ratePerWatt: z.coerce.number().min(0, { message: 'Rate per Watt must be a valid number.' }),
  subsidyAmount: z.coerce.number().min(0, { message: 'Subsidy amount cannot be negative.' }).optional(),
  additionalSubsidy: z.coerce.number().min(0, { message: 'Additional subsidy cannot be negative.' }).optional(),
  
  unitRate: z.coerce.number().optional(),
  requiredSpace: z.coerce.number().optional(),
  generationPerDay: z.coerce.number().optional(),
  generationPerYear: z.coerce.number().optional(),
  savingsPerYear: z.coerce.number().optional(),
  laKitQty: z.coerce.number().optional(),
  acdbDcdbQty: z.coerce.number().optional(),
  earthingKitQty: z.coerce.number().optional(),
  validityDays: z.coerce.number().positive().default(15).optional(),
  mountingStructure: z.string().optional(),
  paymentTerms: z.string().optional(),
  moduleSpec: z.string().optional(),
  inverterSpec: z.string().optional(),
  createdBy: z.string().optional(),

  bosModuleDetails:      z.string().optional(),
  bosModuleQty:          z.string().optional(),
  bosModuleSpec:         z.string().optional(),
  bosInverterDetails:    z.string().optional(),
  bosInverterQty:        z.string().optional(),
  bosInverterSpec:       z.string().optional(),
  bosMountingDetails:    z.string().optional(),
  bosMountingQty:        z.string().optional(),
  bosMountingSpec:       z.string().optional(),
  bosDcCableDetails:     z.string().optional(),
  bosDcCableQty:         z.string().optional(),
  bosDcCableSpec:        z.string().optional(),
  bosAcCableDetails:     z.string().optional(),
  bosAcCableQty:         z.string().optional(),
  bosAcCableSpec:        z.string().optional(),
  bosDcdbDetails:        z.string().optional(),
  bosDcdbQty:            z.string().optional(),
  bosDcdbSpec:           z.string().optional(),
  bosAcdbDetails:        z.string().optional(),
  bosAcdbQty:            z.string().optional(),
  bosAcdbSpec:           z.string().optional(),
  bosEarthingDetails:    z.string().optional(),
  bosEarthingQty:        z.string().optional(),
  bosEarthingSpec:       z.string().optional(),
  bosLaDetails:          z.string().optional(),
  bosLaQty:              z.string().optional(),
  bosLaSpec:             z.string().optional(),
  bosConnectorsDetails:  z.string().optional(),
  bosConnectorsQty:      z.string().optional(),
  bosConnectorsSpec:     z.string().optional(),
  bosMonitoringDetails:  z.string().optional(),
  bosMonitoringQty:      z.string().optional(),
  bosMonitoringSpec:     z.string().optional(),
  bosTagsDetails:        z.string().optional(),
  bosTagsQty:            z.string().optional(),
  bosTagsSpec:           z.string().optional(),
  bosFireExtDetails:     z.string().optional(),
  bosFireExtQty:         z.string().optional(),
  bosFireExtSpec:        z.string().optional(),

}).refine(data => !(data.clientId && data.leadId), {
    message: "A proposal can be linked to either a Client or a Lead, but not both.",
    path: ["leadId"],
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

interface ProposalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Proposal>) => void;
  proposal?: Proposal | null;
  templateId?: string | null;
  clients: Client[];
  leads: Lead[];
}

const initialFormStateForUseForm: ProposalFormValues = {
  proposalNumber: "",
  proposalDate: format(new Date(), 'yyyy-MM-dd'),
  name: "",
  clientType: "Residential",
  contactPerson: "",
  email: "",
  phone: "",
  location: "",
  cityArea: "",
  capacity: 0,
  moduleType: "Topcon Bifacial",
  moduleWattage: "600",
  dcrStatus: "DCR",
  inverterRating: 0,
  inverterQty: 1,
  ratePerWatt: 0,
  subsidyAmount: 0,
  additionalSubsidy: 0,
  unitRate: 19,
  requiredSpace: 0,
  generationPerDay: 0,
  generationPerYear: 0,
  savingsPerYear: 0,
  laKitQty: 1,
  acdbDcdbQty: 1,
  earthingKitQty: 3,
  validityDays: 15,
  mountingStructure: "RCC Rooftop",
  paymentTerms: "10% Advance, 80% Delivery, 10% Commissioning",
  moduleSpec: "Rayzon Solar Topcon Bifacial DCR 600 Wp",
  inverterSpec: "Growatt/Sungrow 8 kW",
  bosModuleDetails: "",
  bosModuleQty: "",
  bosModuleSpec: "",
  bosInverterDetails: "",
  bosInverterQty: "",
  bosInverterSpec: "",
  bosMountingDetails: "",
  bosMountingQty: "",
  bosMountingSpec: "",
  bosDcCableDetails: "",
  bosDcCableQty: "",
  bosDcCableSpec: "",
  bosAcCableDetails: "",
  bosAcCableQty: "",
  bosAcCableSpec: "",
  bosDcdbDetails: "",
  bosDcdbQty: "",
  bosDcdbSpec: "",
  bosAcdbDetails: "",
  bosAcdbQty: "",
  bosAcdbSpec: "",
  bosEarthingDetails: "",
  bosEarthingQty: "",
  bosEarthingSpec: "",
  bosLaDetails: "",
  bosLaQty: "",
  bosLaSpec: "",
  bosConnectorsDetails: "",
  bosConnectorsQty: "",
  bosConnectorsSpec: "",
  bosMonitoringDetails: "",
  bosMonitoringQty: "",
  bosMonitoringSpec: "",
  bosTagsDetails: "",
  bosTagsQty: "",
  bosTagsSpec: "",
  bosFireExtDetails: "",
  bosFireExtQty: "",
  bosFireExtSpec: "",
};

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Math.round(val * 100) / 100);
}

export function ProposalForm({
  isOpen,
  onClose,
  onSubmit,
  proposal,
  templateId,
  clients = [],
  leads = [],
}: ProposalFormProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [users, setUsers] = useState<User[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<CustomSetting[]>([]);
  const [leadSources, setLeadSources] = useState<CustomSetting[]>([]);
  const [isGenerating, startGenerationTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: initialFormStateForUseForm,
  });

  const watchedCapacity = form.watch("capacity");
  const watchedRatePerWatt = form.watch("ratePerWatt");
  const watchedUnitRate = form.watch("unitRate");
  const watchedClientType = form.watch("clientType");
  const watchedDcrStatus = form.watch("dcrStatus");
  const watchedInverterQty = form.watch("inverterQty");
  const watchedInverterRating = form.watch("inverterRating");
  const watchedSubsidyAmount = form.watch("subsidyAmount");
  const watchedAdditionalSubsidy = form.watch("additionalSubsidy");
  const watchedModuleType = form.watch("moduleType");
  const watchedModuleWattage = form.watch("moduleWattage");

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  useEffect(() => {
    async function loadLeadFormData() {
      try {
        const [usersData, statusesData, sourcesData] = await Promise.all([
          getUsers(),
          getLeadStatuses(),
          getLeadSources(),
        ]);
        setUsers(usersData);
        setLeadStatuses(statusesData);
        setLeadSources(sourcesData);
      } catch (e) {
        console.error("Failed to load auxiliary lead form data:", e);
      }
    }
    loadLeadFormData();
  }, []);

  const handleClientSelect = (client: Client) => {
    setSelectedClientId(client.id);
    setSelectedLeadId(null);
    form.setValue("clientId", client.id);
    form.setValue("leadId", undefined);
    form.setValue("name", client.name);
    form.setValue("clientType", client.clientType || 'Other');
    form.setValue("contactPerson", client.name);
    form.setValue("email", client.email || "");
    form.setValue("phone", client.phone || "");
    form.setValue("location", client.address || "");
    form.setValue("cityArea", client.cityArea || "");
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setSelectedClientId(null);
    form.setValue("leadId", lead.id);
    form.setValue("clientId", undefined);
    form.setValue("name", lead.name);
    form.setValue("clientType", lead.clientType || 'Other');
    form.setValue("contactPerson", lead.name);
    form.setValue("email", lead.email || "");
    form.setValue("phone", lead.phone || "");
    form.setValue("location", lead.address || "");
    form.setValue("cityArea", lead.cityArea || "");
    if (lead.kilowatt) {
      form.setValue("capacity", lead.kilowatt);
    }
  };

  const handleLeadFormSubmit = async (data: CreateLeadData) => {
    try {
      const newLead = await createLead(data);
      if (newLead && !('error' in newLead)) {
        const validLead = newLead as Lead;
        setLocalLeads((prev) => [validLead, ...prev]);
        handleLeadSelect(validLead);
        setIsLeadFormOpen(false);
        toast({
          title: "Lead Created",
          description: `Lead ${validLead.name} created and selected for proposal.`,
        });
      } else if (newLead && 'error' in newLead) {
        toast({
          title: "Error Creating Lead",
          description: (newLead as any).error || "Failed to create lead",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error Creating Lead",
        description: e.message || "Failed to create lead",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (proposal) {
        const pAny = proposal as any;
        form.reset({
          proposalNumber: proposal.proposalNumber || "",
          proposalDate: proposal.proposalDate ? format(new Date(proposal.proposalDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          name: proposal.name || "",
          clientType: proposal.clientType || "Residential",
          contactPerson: proposal.contactPerson || "",
          email: proposal.email || "",
          phone: proposal.phone || "",
          location: proposal.location || "",
          cityArea: proposal.cityArea || "",
          capacity: proposal.capacity || 0,
          moduleType: proposal.moduleType || "Topcon Bifacial",
          moduleWattage: String(proposal.moduleWattage || "600"),
          dcrStatus: proposal.dcrStatus || "DCR",
          inverterRating: proposal.inverterRating || proposal.capacity || 0,
          inverterQty: proposal.inverterQty || 1,
          ratePerWatt: proposal.ratePerWatt || 0,
          subsidyAmount: proposal.subsidyAmount || 0,
          additionalSubsidy: proposal.additionalSubsidy || 0,
          unitRate: proposal.unitRate || 19,
          requiredSpace: proposal.requiredSpace || 0,
          generationPerDay: proposal.generationPerDay || 0,
          generationPerYear: proposal.generationPerYear || 0,
          savingsPerYear: proposal.savingsPerYear || 0,
          laKitQty: proposal.laKitQty || 1,
          acdbDcdbQty: proposal.acdbDcdbQty || 1,
          earthingKitQty: proposal.earthingKitQty || 3,
          validityDays: proposal.validityDays || 15,
          mountingStructure: proposal.mountingStructure || "RCC Rooftop",
          paymentTerms: proposal.paymentTerms || "10% Advance, 80% Delivery, 10% Commissioning",
          moduleSpec: proposal.moduleSpec || "Rayzon Solar Topcon Bifacial DCR 600 Wp",
          inverterSpec: proposal.inverterSpec || `Growatt/Sungrow ${proposal.capacity || 8} kW`,
          bosModuleDetails: pAny.bosModuleDetails || "",
          bosModuleQty: pAny.bosModuleQty || "",
          bosModuleSpec: pAny.bosModuleSpec || "",
          bosInverterDetails: pAny.bosInverterDetails || "",
          bosInverterQty: pAny.bosInverterQty || "",
          bosInverterSpec: pAny.bosInverterSpec || "",
          bosMountingDetails: pAny.bosMountingDetails || "",
          bosMountingQty: pAny.bosMountingQty || "",
          bosMountingSpec: pAny.bosMountingSpec || "",
          bosDcCableDetails: pAny.bosDcCableDetails || "",
          bosDcCableQty: pAny.bosDcCableQty || "",
          bosDcCableSpec: pAny.bosDcCableSpec || "",
          bosAcCableDetails: pAny.bosAcCableDetails || "",
          bosAcCableQty: pAny.bosAcCableQty || "",
          bosAcCableSpec: pAny.bosAcCableSpec || "",
          bosDcdbDetails: pAny.bosDcdbDetails || "",
          bosDcdbQty: pAny.bosDcdbQty || "",
          bosDcdbSpec: pAny.bosDcdbSpec || "",
          bosAcdbDetails: pAny.bosAcdbDetails || "",
          bosAcdbQty: pAny.bosAcdbQty || "",
          bosAcdbSpec: pAny.bosAcdbSpec || "",
          bosEarthingDetails: pAny.bosEarthingDetails || "",
          bosEarthingQty: pAny.bosEarthingQty || "",
          bosEarthingSpec: pAny.bosEarthingSpec || "",
          bosLaDetails: pAny.bosLaDetails || "",
          bosLaQty: pAny.bosLaQty || "",
          bosLaSpec: pAny.bosLaSpec || "",
          bosConnectorsDetails: pAny.bosConnectorsDetails || "",
          bosConnectorsQty: pAny.bosConnectorsQty || "",
          bosConnectorsSpec: pAny.bosConnectorsSpec || "",
          bosMonitoringDetails: pAny.bosMonitoringDetails || "",
          bosMonitoringQty: pAny.bosMonitoringQty || "",
          bosMonitoringSpec: pAny.bosMonitoringSpec || "",
          bosTagsDetails: pAny.bosTagsDetails || "",
          bosTagsQty: pAny.bosTagsQty || "",
          bosTagsSpec: pAny.bosTagsSpec || "",
          bosFireExtDetails: pAny.bosFireExtDetails || "",
          bosFireExtQty: pAny.bosFireExtQty || "",
          bosFireExtSpec: pAny.bosFireExtSpec || "",
        });
        setSelectedClientId(proposal.clientId || null);
        setSelectedLeadId(proposal.leadId || null);
      } else {
        const nextProposalNum = `P-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`;
        form.reset({
          ...initialFormStateForUseForm,
          proposalNumber: nextProposalNum,
        });

        if (clients.length === 1 && leads.length === 0) {
            setSelectedClientId(clients[0].id);
            setSelectedLeadId(null);
            form.setValue("clientId", clients[0].id);
            form.setValue("name", clients[0].name);
            form.setValue("clientType", clients[0].clientType || 'Other');
            form.setValue("contactPerson", clients[0].name);
            form.setValue("email", clients[0].email || "");
            form.setValue("phone", clients[0].phone || "");
            form.setValue("location", clients[0].address || "");
            form.setValue("cityArea", clients[0].cityArea || "");
        } else if (leads.length === 1 && clients.length === 0) {
            setSelectedLeadId(leads[0].id);
            setSelectedClientId(null);
            form.setValue("leadId", leads[0].id);
            form.setValue("name", leads[0].name);
            form.setValue("clientType", leads[0].clientType || 'Other');
            form.setValue("contactPerson", leads[0].name);
            form.setValue("email", leads[0].email || "");
            form.setValue("phone", leads[0].phone || "");
            form.setValue("location", leads[0].address || "");
            form.setValue("cityArea", leads[0].cityArea || "");
            form.setValue("capacity", leads[0].kilowatt || 0);
            if (leads[0].kilowatt) {
              form.setValue("inverterRating", leads[0].kilowatt);
            }
        } else {
            setSelectedClientId(null);
            setSelectedLeadId(null);
        }
      }
    }
  }, [isOpen, proposal, form]);

  useEffect(() => {
     const currentCapacity = parseFloat(watchedCapacity as any) || 0;
     const currentInverterRating = parseFloat(form.getValues('inverterRating') as any) || 0;
     if (currentCapacity > 0 && currentInverterRating === 0) {
        form.setValue('inverterRating', currentCapacity, { shouldValidate: true });
     }
  }, [watchedCapacity, form, isOpen]);

  useEffect(() => {
     const invRating = parseFloat(watchedInverterRating as any) || parseFloat(watchedCapacity as any) || 0;
     const kw = invRating > 0 ? invRating : 8;
     form.setValue('inverterSpec', `Growatt/Sungrow ${kw} kW`, { shouldValidate: true });
  }, [watchedInverterRating, watchedCapacity, form]);

  useEffect(() => {
     const mType = watchedModuleType || "Topcon Bifacial";
     const dcr = watchedDcrStatus || "DCR";
     const watt = watchedModuleWattage || "600";
     form.setValue('moduleSpec', `Rayzon Solar ${mType} ${dcr} ${watt} Wp`, { shouldValidate: true });
  }, [watchedModuleType, watchedDcrStatus, watchedModuleWattage, form]);

  useEffect(() => {
    if (watchedClientType === 'Commercial' || watchedClientType === 'Industrial') {
      form.setValue('unitRate', 10);
    } else {
      form.setValue('unitRate', 19);
    }
  }, [watchedClientType, form]);

  const calculatedValues = useMemo(() => {
    return calculateProposalValues({
      capacity: parseFloat(String(watchedCapacity)) || 0,
      ratePerWatt: parseFloat(String(watchedRatePerWatt)) || 0,
      unitRate: parseFloat(String(watchedUnitRate)) || 0,
      clientType: String(watchedClientType),
      dcrStatus: String(watchedDcrStatus),
      inverterQty: parseInt(String(watchedInverterQty), 10) || 1,
    });
  }, [watchedCapacity, watchedRatePerWatt, watchedUnitRate, watchedClientType, watchedDcrStatus, watchedInverterQty]);

  const effectiveSubsidy = parseFloat(String(watchedSubsidyAmount)) || 0;
  const effectiveAdditionalSubsidy = parseFloat(String(watchedAdditionalSubsidy)) || 0;
  const effectiveTotalSubsidy = effectiveSubsidy + effectiveAdditionalSubsidy;
  
  const netInvestmentValue = Math.max(
    0,
    calculatedValues.finalAmount - effectiveTotalSubsidy - calculatedValues.totalAdBenefit
  );

  useEffect(() => {
    const newSubsidy = calculatedValues.subsidyAmount;
    form.setValue('subsidyAmount', newSubsidy, { shouldValidate: true });

    const newReqSpace = calculatedValues.requiredSpace;
    form.setValue('requiredSpace', newReqSpace, { shouldValidate: true });

    const newGenDay = calculatedValues.generationPerDay;
    form.setValue('generationPerDay', newGenDay, { shouldValidate: true });

    const newGenYear = calculatedValues.generationPerYear;
    form.setValue('generationPerYear', newGenYear, { shouldValidate: true });

    const newSavings = calculatedValues.savingsPerYear;
    form.setValue('savingsPerYear', newSavings, { shouldValidate: true });

    form.setValue('laKitQty', calculatedValues.laKitQty);
    form.setValue('acdbDcdbQty', calculatedValues.acdbDcdbQty);
    form.setValue('earthingKitQty', calculatedValues.earthingKitQty);
  }, [watchedCapacity, watchedClientType, watchedDcrStatus, watchedUnitRate, watchedInverterQty]);

  const handleFormSubmit = (values: ProposalFormValues) => {
    startGenerationTransition(async () => {
      const currentTemplateId = proposal?.templateId || templateId || '';
      
      const allValues = { ...values };

      const submissionData: any = {
        ...allValues,
        templateId: currentTemplateId,
        capacity: parseFloat(allValues.capacity as any) || 0,
        ratePerWatt: parseFloat(allValues.ratePerWatt as any) || 0,
        inverterRating: Number(allValues.inverterRating) || 0,
        inverterQty: Number(allValues.inverterQty) || 1,
        baseAmount: calculatedValues.baseAmount,
        cgstAmount: calculatedValues.cgstAmount,
        sgstAmount: calculatedValues.sgstAmount,
        subtotalAmount: calculatedValues.baseAmount + calculatedValues.cgstAmount + calculatedValues.sgstAmount,
        finalAmount: calculatedValues.finalAmount,
        subsidyAmount: parseFloat(allValues.subsidyAmount as any) || 0,
        additionalSubsidy: parseFloat(allValues.additionalSubsidy as any) || 0,
        unitRate: allValues.unitRate,
        requiredSpace: parseFloat(allValues.requiredSpace as any) || 0,
        generationPerDay: parseFloat(allValues.generationPerDay as any) || 0,
        generationPerYear: parseFloat(allValues.generationPerYear as any) || 0,
        savingsPerYear: parseFloat(allValues.savingsPerYear as any) || 0,
        laKitQty: Number(allValues.laKitQty) || 0,
        acdbDcdbQty: Number(allValues.acdbDcdbQty) || 0,
        earthingKitQty: Number(allValues.earthingKitQty) || 0,
        calculatedValues: calculatedValues,
        bosModuleDetails: allValues.bosModuleDetails,
        bosModuleQty: allValues.bosModuleQty,
        bosModuleSpec: allValues.bosModuleSpec,
        bosInverterDetails: allValues.bosInverterDetails,
        bosInverterQty: allValues.bosInverterQty,
        bosInverterSpec: allValues.bosInverterSpec,
        bosMountingDetails: allValues.bosMountingDetails,
        bosMountingQty: allValues.bosMountingQty,
        bosMountingSpec: allValues.bosMountingSpec,
        bosDcCableDetails: allValues.bosDcCableDetails,
        bosDcCableQty: allValues.bosDcCableQty,
        bosDcCableSpec: allValues.bosDcCableSpec,
        bosAcCableDetails: allValues.bosAcCableDetails,
        bosAcCableQty: allValues.bosAcCableQty,
        bosAcCableSpec: allValues.bosAcCableSpec,
        bosDcdbDetails: allValues.bosDcdbDetails,
        bosDcdbQty: allValues.bosDcdbQty,
        bosDcdbSpec: allValues.bosDcdbSpec,
        bosAcdbDetails: allValues.bosAcdbDetails,
        bosAcdbQty: allValues.bosAcdbQty,
        bosAcdbSpec: allValues.bosAcdbSpec,
        bosEarthingDetails: allValues.bosEarthingDetails,
        bosEarthingQty: allValues.bosEarthingQty,
        bosEarthingSpec: allValues.bosEarthingSpec,
        bosLaDetails: allValues.bosLaDetails,
        bosLaQty: allValues.bosLaQty,
        bosLaSpec: allValues.bosLaSpec,
        bosConnectorsDetails: allValues.bosConnectorsDetails,
        bosConnectorsQty: allValues.bosConnectorsQty,
        bosConnectorsSpec: allValues.bosConnectorsSpec,
        bosMonitoringDetails: allValues.bosMonitoringDetails,
        bosMonitoringQty: allValues.bosMonitoringQty,
        bosMonitoringSpec: allValues.bosMonitoringSpec,
        bosTagsDetails: allValues.bosTagsDetails,
        bosTagsQty: allValues.bosTagsQty,
        bosTagsSpec: allValues.bosTagsSpec,
        bosFireExtDetails: allValues.bosFireExtDetails,
        bosFireExtQty: allValues.bosFireExtQty,
        bosFireExtSpec: allValues.bosFireExtSpec,
      };

      if (proposal?.id) {
        submissionData.id = proposal.id;
      }
      
      try {
        const response = await fetch('/api/proposals/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: currentTemplateId, data: submissionData }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || 'Failed to generate proposal.');
        }
        
        const finalSubmissionData = {
            ...submissionData,
            pdfUrl: result.pdfUrl,
            docxUrl: result.docxUrl
        };
        onSubmit(finalSubmissionData);

      } catch (error) {
        console.error("Failed to generate proposal:", error);
        toast({ title: "Error Generating Proposal", description: (error as Error).message, variant: "destructive"});
      }
    });
  };
  
  const isCustomerSelected = !!selectedClientId || !!selectedLeadId;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] lg:max-w-[1400px] max-h-[96vh] overflow-y-auto p-5">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-xl font-bold">{proposal ? 'Edit Proposal' : 'Create New Proposal'}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {proposal ? "Update the proposal's information." : 'Select an existing customer or create a new lead to begin.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
            
            {/* Top Customer Selection Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-muted/30 p-3 rounded-lg border">
              <div className="md:col-span-5">
                <CustomerCombobox
                    label="Select Client"
                    customers={clients}
                    selectedId={selectedClientId}
                    onSelect={(customer) => handleClientSelect(customer as Client)}
                    onClear={() => setSelectedClientId(null)}
                    disabled={!!selectedLeadId || (!!proposal && !!proposal.leadId)}
                />
              </div>
              <div className="md:col-span-5">
                <CustomerCombobox
                    label="Select Lead"
                    customers={localLeads}
                    selectedId={selectedLeadId}
                    onSelect={(customer) => handleLeadSelect(customer as Lead)}
                    onClear={() => setSelectedLeadId(null)}
                    disabled={!!selectedClientId || (!!proposal && !!proposal.clientId)}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="button" variant="outline" className="w-full text-xs font-semibold h-10" onClick={() => setIsLeadFormOpen(true)}>
                    <PlusCircle className="mr-1.5 h-4 w-4" /> New Lead
                </Button>
              </div>
            </div>

            {!isCustomerSelected && (
                <div className="p-4 text-center bg-muted/40 rounded-lg text-muted-foreground border border-dashed text-sm">
                    <p className="font-medium">Please select an existing customer or create a new lead to continue.</p>
                </div>
            )}

            <fieldset disabled={!isCustomerSelected} className="space-y-4">
              
              {/* 2-Column Wide Grid for All Sections in One View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* ── LEFT COLUMN: Customer Details & Additional Details ── */}
                <div className="space-y-4 flex flex-col justify-between">
                  
                  {/* Customer Details Section */}
                  <div className="p-3.5 border rounded-lg bg-card space-y-3 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center border-b pb-1.5">
                      Customer Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField name="proposalNumber" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Proposal Number</FormLabel><FormControl><Input placeholder="e.g., P-2026-001" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <Controller name="proposalDate" control={form.control} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className="text-xs">Proposal Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-9 text-sm",!field.value && "text-muted-foreground")}>{field.value ? (format(parseISO(field.value), "MMMM do, yyyy")) : (<span>Pick a date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField name="name" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Client/Company Name</FormLabel><FormControl><Input placeholder="Enter name" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField
                        name="clientType"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Client Type</FormLabel>
                            <FormControl>
                              <QuickCustomSelect
                                settingType="CLIENT_TYPE"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select client type"
                                defaultOptions={Array.from(CLIENT_TYPES)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField name="contactPerson" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Contact Person</FormLabel><FormControl><Input placeholder="Enter contact person" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField name="cityArea" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">City / Area</FormLabel><FormControl><Input placeholder="Enter city or area" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>

                    <FormField name="location" control={form.control} render={({ field }) => ( 
                      <FormItem>
                        <FormLabel className="text-xs">Location / Site Address</FormLabel>
                        <FormControl><Textarea placeholder="Enter full site address" rows={2} className="text-sm resize-none" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem> 
                    )}/>
                  </div>

                  {/* Additional Details Section */}
                  <div className="p-3.5 border rounded-lg bg-card space-y-3 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center border-b pb-1.5">
                      Additional Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField name="requiredSpace" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Required Space (Sq. Ft.)</FormLabel><FormControl><Input type="number" step="0.01" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField name="generationPerDay" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Generation/Day (Units)</FormLabel><FormControl><Input type="number" step="0.01" className="h-9 text-sm" {...field} onChange={(e) => { field.onChange(e); const val = parseFloat(e.target.value) || 0; form.setValue('generationPerYear', parseFloat((val * 365).toFixed(2)), { shouldValidate: true, shouldDirty: true }); }} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField name="generationPerYear" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Generation/Year (Units)</FormLabel><FormControl><Input type="number" step="0.01" className="h-9 text-sm" {...field} onChange={(e) => { field.onChange(e); const val = parseFloat(e.target.value) || 0; form.setValue('generationPerDay', parseFloat((val / 365).toFixed(2)), { shouldValidate: true, shouldDirty: true }); }} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField name="unitRate" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Unit Rate (₹)</FormLabel><FormControl><Input type="number" step="0.01" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField name="savingsPerYear" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Savings/Year (₹)</FormLabel><FormControl><Input type="number" step="0.01" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField name="laKitQty" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">LA Kit Qty</FormLabel><FormControl><Input type="number" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField name="acdbDcdbQty" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">ACDB/DCDB Qty</FormLabel><FormControl><Input type="number" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField name="earthingKitQty" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Earthing Kit Qty</FormLabel><FormControl><Input type="number" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                  </div>

                </div>

                {/* ── RIGHT COLUMN: System Details & Financials ── */}
                <div className="space-y-4 flex flex-col justify-between">
                  
                  {/* System Details Section */}
                  <div className="p-3.5 border rounded-lg bg-card space-y-3 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center border-b pb-1.5">
                      System Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField name="capacity" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Capacity (kW)</FormLabel><FormControl><Input type="number" placeholder="e.g., 10" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField
                        name="moduleType"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Module Type</FormLabel>
                            <FormControl>
                              <QuickCustomSelect
                                settingType="MODULE_TYPE"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select module type"
                                defaultOptions={Array.from(MODULE_TYPES)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name="moduleWattage"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Module Wattage (W)</FormLabel>
                            <FormControl>
                              <QuickCustomSelect
                                settingType="MODULE_WATTAGE"
                                value={String(field.value)}
                                onChange={(val) => field.onChange(val)}
                                placeholder="Select Wattage"
                                defaultOptions={Array.from(MODULE_WATTAGE_OPTIONS)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField
                        name="dcrStatus"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">DCR/Non-DCR</FormLabel>
                            <FormControl>
                              <QuickCustomSelect
                                settingType="DCR_STATUS"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select DCR status"
                                defaultOptions={Array.from(DCR_STATUSES)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField name="inverterRating" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Inverter Rating (kW)</FormLabel><FormControl><Input type="number" placeholder="e.g., 10" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField name="inverterQty" control={form.control} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Inverter Qty</FormLabel><FormControl><Input type="number" placeholder="e.g., 1" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField name="moduleSpec" control={form.control} render={({ field }) => ( 
                        <FormItem>
                          <FormLabel className="text-xs">Solar Module Specification</FormLabel>
                          <FormControl><Input placeholder="Rayzon Solar Topcon Bifacial DCR 600 Wp" className="h-9 text-xs" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem> 
                      )}/>
                      <FormField name="inverterSpec" control={form.control} render={({ field }) => ( 
                        <FormItem>
                          <FormLabel className="text-xs">Inverter Specification</FormLabel>
                          <FormControl><Input placeholder="Growatt/Sungrow 8 kW" className="h-9 text-xs" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem> 
                      )}/>
                    </div>
                  </div>

                  {/* Financials Section */}
                  <div className="p-3.5 border rounded-lg bg-card space-y-3 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center border-b pb-1.5">
                      Financials
                    </h3>

                    <FormField name="ratePerWatt" control={form.control} render={({ field }) => ( 
                      <FormItem>
                        <FormLabel className="text-xs">Rate per Watt (₹)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 40" className="h-9 text-sm" {...field} step="0.01" /></FormControl>
                        <FormMessage />
                      </FormItem> 
                    )}/>

                    <div className="grid grid-cols-4 gap-2 p-2.5 border rounded bg-muted/40 text-center">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Base Amount</p>
                        <p className="font-semibold text-xs flex items-center justify-center mt-0.5"><IndianRupee className="h-3 w-3 mr-0.5"/>{formatINR(calculatedValues.baseAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">CGST (4.45%)</p>
                        <p className="text-xs flex items-center justify-center mt-0.5"><IndianRupee className="h-3 w-3 mr-0.5"/>{formatINR(calculatedValues.cgstAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">SGST (4.45%)</p>
                        <p className="text-xs flex items-center justify-center mt-0.5"><IndianRupee className="h-3 w-3 mr-0.5"/>{formatINR(calculatedValues.sgstAmount)}</p>
                      </div>
                      <div className="text-primary">
                        <p className="text-[11px] font-bold">Final Pre-Subsidy</p>
                        <p className="font-bold text-xs flex items-center justify-center mt-0.5"><IndianRupee className="h-3.5 w-3.5 mr-0.5"/>{formatINR(calculatedValues.finalAmount)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField name="subsidyAmount" control={form.control} render={({ field }) => {
                        const isBiz = watchedClientType === 'Commercial' || watchedClientType === 'Industrial';
                        return (
                          <FormItem>
                            <FormLabel className="text-xs">{isBiz ? "AD Benefits (₹)" : "Subsidy Amount (₹)"}</FormLabel>
                            <FormControl>
                              <Input type="number" className="h-9 text-sm" placeholder={isBiz ? "AD Benefits" : "Subsidy amount"} {...field} value={field.value ?? 0} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}/>
                      <FormField name="additionalSubsidy" control={form.control} render={({ field }) => ( 
                        <FormItem>
                          <FormLabel className="text-xs">Additional Subsidy / AD Top-up (₹)</FormLabel>
                          <FormControl><Input type="number" className="h-9 text-sm" placeholder="Additional subsidy" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                          <FormMessage />
                        </FormItem> 
                      )}/>
                    </div>

                    <div className="p-2.5 border border-emerald-500/30 rounded bg-emerald-50/50 dark:bg-emerald-950/20 flex justify-between items-center text-emerald-700 dark:text-emerald-300">
                      <div>
                        <p className="font-bold text-xs">Net Investment (After Subsidy / AD Benefits)</p>
                        <p className="text-[10.5px] text-muted-foreground mt-0.5">
                          {watchedClientType === 'Commercial' || watchedClientType === 'Industrial'
                            ? `Total (${formatINR(calculatedValues.finalAmount)}) - AD Benefits (${formatINR(effectiveSubsidy)}) - Top-up (${formatINR(effectiveAdditionalSubsidy)})`
                            : `Total (${formatINR(calculatedValues.finalAmount)}) - Subsidy (${formatINR(effectiveSubsidy)}) - Top-up (${formatINR(effectiveAdditionalSubsidy)})`
                          }
                        </p>
                      </div>
                      <span className="font-bold text-base flex items-center">
                        <IndianRupee className="h-4 w-4 mr-0.5"/>
                        {formatINR(netInvestmentValue)}
                      </span>
                    </div>
                  </div>

                </div>

              </div>

            </fieldset>

            <DialogFooter className="pt-3 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isGenerating}>Cancel</Button>
              <Button type="submit" disabled={isGenerating || !isCustomerSelected} className="px-6 font-semibold">
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {proposal ? 'Save & Regenerate' : 'Generate Proposal PDF'}
              </Button>
            </DialogFooter>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
    {isLeadFormOpen && (
        <LeadForm
            isOpen={isLeadFormOpen}
            onClose={() => setIsLeadFormOpen(false)}
            onSubmit={handleLeadFormSubmit}
            users={users}
            statuses={leadStatuses}
            sources={leadSources}
        />
    )}
    </>
  );
}

interface CustomerComboboxProps {
    label: string;
    customers: (Client | Lead)[];
    selectedId: string | null;
    onSelect: (customer: Client | Lead) => void;
    onClear: () => void;
    disabled?: boolean;
}

function CustomerCombobox({ label, customers, selectedId, onSelect, onClear, disabled }: CustomerComboboxProps) {
    const [open, setOpen] = useState(false);
    const selectedCustomer = customers.find(c => c.id === selectedId);

    return (
        <FormItem>
            <FormLabel className="text-xs">{label}</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
                <div className="relative">
                    <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-10 text-sm" disabled={disabled}>
                                <span className="truncate">{selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone || 'No phone'})` : `Select a ${label.split(' ')[1].toLowerCase()}...`}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                    </PopoverTrigger>
                    {selectedId && !disabled && (
                        <Button variant="ghost" size="icon" className="absolute right-10 top-1/2 -translate-y-1/2 h-6 w-6" onClick={onClear}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <PopoverContent className="w-[320px] p-0">
                    <Command>
                        <CommandInput placeholder={`Search ${label.split(' ')[1].toLowerCase()}...`} />
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                            {customers.map((customer) => (
                                <CommandItem
                                    key={customer.id}
                                    value={`${customer.name} ${customer.phone || ''} ${customer.id}`}
                                    onSelect={() => {
                                        onSelect(customer);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", selectedId === customer.id ? "opacity-100" : "opacity-0")} />
                                    <div>
                                        <p className="font-semibold text-sm">{customer.name}</p>
                                        <p className="text-xs text-muted-foreground">{customer.phone || "No phone number"}</p>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </FormItem>
    );
}