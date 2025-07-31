
import type { LEAD_PRIORITY_OPTIONS, USER_OPTIONS, DROP_REASON_OPTIONS, CLIENT_TYPES, EXPENSE_CATEGORIES, FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES, MODULE_TYPES, DCR_STATUSES, MODULE_WATTAGE_OPTIONS, SURVEY_TYPE_OPTIONS, METER_PHASES, CONSUMER_LOAD_TYPES, ROOF_TYPES, DISCOM_OPTIONS, CLIENT_PRIORITY_OPTIONS, EXPENSE_STATUSES, DEAL_PIPELINES, ALL_DEAL_STAGES, TASK_PRIORITIES } from '@/lib/constants';

// Deriving types from the const arrays ensures type safety and single source of truth
export type LeadStatusType = string;
export type LeadSourceOptionType = string;
export type ClientStatusType = string;
export type DocumentType = string;
export type FinancialDocumentType = string;
export type UserRole = string;

export type LeadPriorityType = typeof LEAD_PRIORITY_OPTIONS[number];
export type UserOptionType = typeof USER_OPTIONS[number];
export type DropReasonType = typeof DROP_REASON_OPTIONS[number];
export type ClientType = typeof CLIENT_TYPES[number];
export type ModuleType = typeof MODULE_TYPES[number];
export type DCRStatus = typeof DCR_STATUSES[number];
export type ModuleWattage = typeof MODULE_WATTAGE_OPTIONS[number];
export type ClientPriorityType = typeof CLIENT_PRIORITY_OPTIONS[number];
export type ViewPermission = 'ALL' | 'ASSIGNED';


export type AnyStatusType = LeadStatusType | ClientStatusType;

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  viewPermission: ViewPermission;
  deviceId?: string | null;
}

export interface RolePermission {
  id: string;
  roleName: string;
  navPath: string;
}

export interface ElectricityBill {
  id: string;
  url: string;
  createdAt: string;
  leadId?: string | null;
  clientId?: string | null;
  droppedLeadId?: string | null;
  siteSurveyId?: string | null;
}

export interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: LeadStatusType;
  source?: LeadSourceOptionType | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  lastCommentText?: string | null;
  lastCommentDate?: string | null;
  nextFollowUpDate?: string | null;
  nextFollowUpTime?: string | null;
  kilowatt?: number | null;
  address?: string | null;
  notes?: string | null;
  priority?: LeadPriorityType | null;
  dropReason?: DropReasonType | "Not Dropped" | null;
  clientType?: ClientType | null;
  electricityBillUrls: string[];
  followupCount?: number;
  totalDealValue?: number | null;
}
export type CreateLeadData = Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'followupCount' | 'electricityBillUrls'> & {
  electricityBillUrls?: string[];
};

export interface DroppedLead extends Omit<Lead, 'status' | 'updatedAt'> {
  status: 'Lost';
  dropReason: DropReasonType;
  dropComment?: string | null;
  droppedAt: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: LeadSourceOptionType | null;
  status: ClientStatusType;
  priority?: ClientPriorityType | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  kilowatt?: number | null;
  address?: string | null;
  notes?: string | null;
  clientType?: ClientType | null;
  electricityBillUrls: string[];
  followupCount?: number;
  lastCommentText?: string | null;
  lastCommentDate?: string | null;
  nextFollowUpDate?: string | null;
  nextFollowUpTime?: string | null;
  totalDealValue?: number | null;
}
export type CreateClientData = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'followupCount' | 'lastCommentText' | 'lastCommentDate' | 'nextFollowUpDate' | 'nextFollowUpTime' | 'electricityBillUrls' | 'totalDealValue'> & {
    electricityBillUrls?: string[];
    totalDealValue?: number;
};


export interface Proposal {
  id: string;
  proposalNumber: string;
  clientId?: string | null;
  leadId?: string | null;
  droppedLeadId?: string | null;
  templateId?: string;
  name: string;
  clientType: ClientType;
  contactPerson: string;
  location: string;
  phone?: string | null;
  email?: string | null;
  capacity: number;
  moduleType: ModuleType;
  moduleWattage: ModuleWattage;
  dcrStatus: DCRStatus;
  inverterRating: number;
  inverterQty: number;
  ratePerWatt: number;
  proposalDate: string;
  baseAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  subtotalAmount: number;
  finalAmount: number;
  subsidyAmount: number;
  createdAt: string;
  updatedAt?: string;
  pdfUrl?: string | null;
  docxUrl?: string | null;

  // Additional Fields
  requiredSpace?: number;
  generationPerDay?: number;
  generationPerYear?: number;
  unitRate?: number;
  savingsPerYear?: number;
  laKitQty?: number;
  acdbDcdbQty?: number;
  earthingKitQty?: number;
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  relatedLeadId?: string;
  relatedClientId?: string;
  relatedProposalId?: string;
  createdAt: string;
  filePath?: string;
}

export interface GeneratedDocument {
  id: string;
  clientName: string;
  documentType: string;
  pdfUrl: string;
  docxUrl: string;
  templateId: string;
  formData: string; // JSON string
  createdAt: string;
}

export type FinancialDocumentStatus = 'Pending' | 'Approved' | 'Rejected';

export interface FinancialDocument {
  id: string;
  clientName: string;
  documentType: string;
  pdfUrl: string;
  docxUrl: string;
  templateId: string;
  formData: string; // JSON string
  status: FinancialDocumentStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewedBy?: User | null;
}

export interface Communication {
  id: string;
  leadId?: string;
  clientId?: string;
  type: 'Email' | 'Call' | 'SMS' | 'Meeting' | 'System Alert';
  subject?: string;
  content: string;
  direction: 'Incoming' | 'Outgoing';
  timestamp: string;
  recordedBy?: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  children?: NavItem[];
}

export interface StatusFilterItem {
  label: string;
  count: number;
  value: string;
}

export interface ClientStatusFilterItem {
  label: string;
  count: number;
  value: string;
}

export interface DropReasonFilterItem {
  label: DropReasonType | 'Show all';
  count: number;
  value: DropReasonType | 'all';
}

export type Item = Lead | Client | DroppedLead;
export type GenericSortConfig<T extends Item> = { key: keyof T; direction: 'ascending' | 'descending' };
export type LeadSortConfig = GenericSortConfig<Lead>;
export type ClientSortConfig = GenericSortConfig<Client>;
export type DroppedLeadSortConfig = GenericSortConfig<DroppedLead>;


export type FollowUpType = typeof FOLLOW_UP_TYPES[number];
export type FollowUpStatus = typeof FOLLOW_UP_STATUSES[number];

export interface FollowUp {
  id: string;
  leadId?: string | null;
  clientId?: string | null;
  dealId?: string | null;
  droppedLeadId?: string;
  type: FollowUpType;
  date: string;
  time?: string;
  status: FollowUpStatus;
  leadStageAtTimeOfFollowUp?: AnyStatusType;
  comment?: string;
  createdBy?: string;
  createdById: string;
  createdAt: string;
  followupOrTask: 'Followup' | 'Task';
  taskForUser?: string;
  taskDate?: string;
  taskTime?: string;
  taskStatus?: 'Open' | 'Closed'; // Added for task tracking
  lead?: { name: string, phone: string, clientType: ClientType | null } | null;
  client?: { name: string, phone: string, clientType: ClientType | null } | null;
  deal?: { id: string, clientName: string, phone: string, clientType: ClientType | null } | null;
}

export type AddActivityData = Omit<FollowUp, 'id' | 'createdAt' | 'droppedLeadId' | 'createdBy' | 'createdById' | 'lead' | 'client' | 'deal'> & {
  priority?: LeadPriorityType | ClientPriorityType;
};


export interface Task {
  id: string;
  entityId: string;
  entityType: 'lead' | 'client';
  assignedTo: UserOptionType;
  dueDate: string;
  dueTime: string;
  description: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  createdAt: string;
}

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export type ExpenseStatus = typeof EXPENSE_STATUSES[number];

export interface Expense {
  id: string;
  userId: string;
  userName: string;
  date: string; // ISO string
  endDate?: string | null; // ISO string
  category: ExpenseCategory;
  amount: number;
  description: string;
  receiptUrl?: string | null;
  status: ExpenseStatus;
  submittedAt: string; // ISO string
  reviewedById?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export type CreateExpenseData = Omit<Expense, 'id' | 'userName' | 'submittedAt' | 'reviewedById' | 'reviewedBy' | 'reviewedAt' | 'status'>;

export type SurveyStatusType = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'On Hold';
export type SurveyTypeOption = typeof SURVEY_TYPE_OPTIONS[number];
export type ConsumerCategoryType = typeof CLIENT_TYPES[number];
export type MeterPhaseType = typeof METER_PHASES[number];
export type ConsumerLoadType = typeof CONSUMER_LOAD_TYPES[number];
export type RoofType = typeof ROOF_TYPES[number];
export type DiscomType = typeof DISCOM_OPTIONS[number];


export interface SiteSurvey {
  id: string;
  surveyNumber: string;
  consumerName: string;
  date: string;
  consumerCategory: ConsumerCategoryType;
  location: string;
  numberOfMeters: number;
  meterRating?: string;
  meterPhase?: MeterPhaseType;
  electricityAmount?: number;
  consumerLoadType: ConsumerLoadType;
  roofType: RoofType;
  buildingHeight: string;
  shadowFreeArea: string;
  discom: DiscomType;
  sanctionedLoad?: string;
  remark?: string;
  electricityBillFiles: string[];
  createdAt: string;
  updatedAt: string;
  leadId?: string | null;
  clientId?: string | null;
  droppedLeadId?: string | null;
  surveyorName: string;
  surveyorId: string;
}

export type CreateSiteSurveyData = Omit<SiteSurvey, 'id' | 'surveyNumber' | 'createdAt' | 'updatedAt' | 'surveyorName' | 'consumerName' | 'location' | 'electricityBills'> & {
  leadId?: string | null;
  clientId?: string | null;
  surveyorId: string;
  consumerName: string;
  location: string;
  consumerCategoryOther?: string;
  roofTypeOther?: string;
  discomOther?: string;
};


export interface SiteSurveyFormValues extends Omit<SiteSurvey, 'id' | 'surveyNumber' | 'createdAt' | 'updatedAt' | 'surveyorName' | 'electricityBillFiles' | 'surveyorId'> {
  electricityBillFiles?: FileList | null;
  surveyorName: UserOptionType;
  leadId?: string;
  clientId?: string;
};


export interface SurveySortConfig {
  key: keyof SiteSurvey;
  direction: 'ascending' | 'descending';
}

export interface SurveyStatusFilterItem {
  label: SurveyStatusType | 'all';
  count: number;
  value: SurveyStatusType | 'all';
}

export type AnyDocument = (GeneratedDocument & { docCategory?: 'standard' }) | (FinancialDocument & { docCategory?: 'financial' });

export type ProposalOrDocumentType = 'Proposal' | DocumentType | FinancialDocumentType;

export interface Template {
  id: string;
  name: string;
  type: ProposalOrDocumentType;
  originalDocxPath: string;
  placeholdersJson?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateTemplateData = Omit<Template, 'id' | 'createdAt' | 'updatedAt'>;

export type SettingType = 'LEAD_STATUS' | 'LEAD_SOURCE' | 'CLIENT_STATUS' | 'DOCUMENT_TYPE' | 'FINANCIAL_DOCUMENT_TYPE' |'USER_ROLE';

export interface CustomSetting {
    id: string;
    type: SettingType;
    name: string;
    createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  punchInTime: string;
  punchOutTime?: string | null;
  workDuration?: string | null; // e.g., "8h 30m"
}

export type DealPipelineType = keyof typeof DEAL_PIPELINES;
export type DealStage = typeof ALL_DEAL_STAGES[number];


export interface Deal {
  id: string;
  clientName: string;
  clientId?: string | null;
  contactPerson: string;
  dealFor?: string | null;
  source?: LeadSourceOptionType | null;
  email?: string | null;
  phone?: string | null;
  pipeline: DealPipelineType;
  stage: DealStage;
  dealValue: number;
  assignedTo?: string | null;
  poWoDate: string; // ISO string
  createdAt: string;
  updatedAt: string;
  amcDurationInMonths?: number | null;
  amcEffectiveDate?: string | null;
  notes?: string | null;
}

export type TaskNotification = {
    id: string;
    comment: string;
    time: string;
    customerName: string;
    customerPhone: string | null;
    status: 'Open' | 'Closed';
    link: string;
};

export type GeneralTaskPriority = typeof TASK_PRIORITIES[number];
export type GeneralTaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Failed';

export interface GeneralTask {
    id: string;
    comment: string;
    taskDate: Date;
    priority: GeneralTaskPriority;
    status: GeneralTaskStatus;
    reason?: string | null;
    createdAt: Date;
    updatedAt: Date;
    assignedToId: string;
    assignedTo: { id: string; name: string; };
    createdById: string | null;
    createdBy: { id: string; name: string; } | null;
    amcTaskId?: string | null;
    dealId?: string | null;
}

export type CreateGeneralTaskData = {
    assignedToId: string;
    taskDate: Date;
    priority: GeneralTaskPriority;
    comment: string;
    amcTaskId?: string;
    dealId?: string;
}

export type TicketStatus = 'Open' | 'On Hold' | 'Closed';
export type TicketPriority = 'High' | 'Medium' | 'Low';

export interface Tickets {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  dueDate: string;
  ticketFor?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;

  // Client Snapshot Data
  clientName: string;
  mobileNo: string;
  email?: string | null;
  address: string;

  // Relations
  clientId: string;
  client: Client;
  dealId?: string | null;
  deal?: Deal | null;
  createdById: string;
  createdBy: User;
  assignedToId?: string | null;
  assignedTo?: User | null;
}

export type CreateTicketData = {
  clientId: string;
  clientName: string;
  mobileNo: string;
  email?: string;
  address: string;
  dealId?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  dueDate: string;
  ticketFor?: string;
  assignedToId?: string;
};
