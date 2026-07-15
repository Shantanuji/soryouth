
import type { NavItem, Lead, Client, Proposal, Document, Communication, DocumentType, ClientType, LeadPriorityType, ClientPriorityType, UserOptionType, DropReasonType, Expense, UserRole, Template, ProposalOrDocumentType, SiteSurvey, Tickets } from '@/types';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  UsersRound,
  FileText,
  Files,
  MessageSquareText,
  WandSparkles,
  TerminalSquare,
  CheckSquare,
  Award,
  Edit,
  Eye,
  FileSignature,
  Briefcase,
  UserX,
  Rows,
  CalendarDays,
  ListChecks,
  Receipt,
  Notebook,
  ClipboardList,
  ClipboardEdit,
  MapPinnedIcon,
  BarChart3,
  Archive,
  Users,
  ClipboardPaste,
  ClipboardCheck,
  Handshake,
  Ticket,
  IndianRupee,
  Database,
  Mail,
} from 'lucide-react';
import { format, parseISO, addDays, subDays } from 'date-fns';

export const APP_NAME = "Soryouth";

// The super admin account is protected — it can never be deleted via the UI.
export const SUPER_ADMIN_EMAIL = "admin@soryouth.com";

// Primary CRM Navigation for the main sidebar
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads-list', label: 'Leads', icon: UsersRound },
  { href: '/clients-list', label: 'Clients', icon: Briefcase },
  { href: '/deals', label: 'Deals', icon: Handshake },
  { href: '/proposals', label: 'Proposals', icon: FileText },
  { href: '/dropped-leads-list', label: 'Dropped Leads', icon: UserX },
  { href: '/inactive-clients', label: 'Inactive Clients', icon: Archive },
  { href: '/tasks', label: 'Tasks', icon: ClipboardCheck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/users', label: 'Manage Users', icon: Users },
  { href: '/manage-templates', label: 'Manage Templates', icon: ClipboardPaste },
  { href: '/database-backup', label: 'Database Backup', icon: Database },
  { href: '/mailer-settings', label: 'Mailer Settings', icon: Mail },
];

// Secondary Navigation for tools/other sections, in user profile dropdown
export const TOOLS_NAV_ITEMS: NavItem[] = [
  { href: '/survey-list', label: 'Survey List', icon: ClipboardList },
  { href: '/site-survey', label: 'Survey Form', icon: MapPinnedIcon},
  { href: '/attendance', label: 'Attendance', icon: CheckSquare },
  { href: '/survey-reports', label: 'Survey Reports', icon: MapPinnedIcon },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/documents', label: 'Documents', icon: Files },
];

export const DEAL_STAGES_SOLAR = ['Deal Done', 'Procurement', 'Installation', 'Commissioning', 'Handover', 'Completed'] as const;
export const DEAL_STAGES_AMC = ['New AMC', 'Quoted', 'Agreement', 'Active', 'Expired'] as const;

export const ALL_DEAL_STAGES = [...DEAL_STAGES_SOLAR, ...DEAL_STAGES_AMC] as const;

export const DEAL_PIPELINES = {
    'Solar PV Plant': DEAL_STAGES_SOLAR,
    'AMC': DEAL_STAGES_AMC,
} as const;

export type DealPipelineType = keyof typeof DEAL_PIPELINES;
export type DealStage = typeof ALL_DEAL_STAGES[number];

export const USER_ROLES = ['Admin', 'TechnoSales', 'Designing', 'Procurement', 'ProjectManager', 'LiasoningExecutive', 'OperationAndMaintainance'] as const;
export const CLIENT_TYPES = ['Individual/Bungalow', 'Housing Society', 'Commercial', 'Industrial', 'Amc', 'Other'] as const;
export const LEAD_PRIORITY_OPTIONS = ['Hot', 'High', 'Medium', 'Average', 'Low'] as const;
export const CLIENT_PRIORITY_OPTIONS = ['Hot', 'Average'] as const;
export const USER_OPTIONS = ['Mayur', 'Sales Rep A', 'Sales Rep B', 'Admin', 'System', 'Kanchan Nikam', 'tejas', 'MAYUR', 'Prasad mudholkar', 'Ritesh'] as const;
export const DROP_REASON_OPTIONS = [
    'Duplicate lead', 'Fake Lead', 'Not Feasible', 'Not Interested',
    'Requirement fullfilled', 'below 3kw', 'out of coverage area',
    'out of maharashtra', 'price issue', 'want in balcony', 'Other'
] as const;

export const FOLLOW_UP_TYPES = ['Call', 'SMS', 'Email', 'Meeting', 'Visit'] as const;
export const FOLLOW_UP_STATUSES = ['Answered', 'No reply', 'Rejected', 'Not connected'] as const;
export const MODULE_TYPES = ['Mono PERC', 'TOPCon'] as const;
export const DCR_STATUSES = ['DCR', 'Non-DCR'] as const;
export const MODULE_WATTAGE_OPTIONS = ["540", "545", "550", "585", "590"] as const;
export const TASK_PRIORITIES = ['High', 'Medium', 'Low'] as const;

export const MOCK_LEADS: Lead[] = [
  {
    id: 'lead1', name: 'Pramod Agrawal', email: 'pramod.agrawal@example.com', phone: '6263537508',
    status: 'Fresher', source: 'Facebook', createdAt: subDays(new Date(),5).toISOString(), updatedAt: new Date().toISOString(),
    lastCommentText: 'lb 8000/-', lastCommentDate: format(subDays(new Date(), 2), 'dd-MM-yyyy'),
    kilowatt: 10, clientType: 'Commercial', nextFollowUpDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'), nextFollowUpTime: '10:00',
    address: '123 Main St, Nagpur', priority: 'High', assignedTo: 'Mayur', createdBy: 'Admin', electricityBillUrls: [], followupCount: 3,
  },
  {
    id: 'lead2', name: 'sir (Jane Smith)', email: 'jane.smith.lead@example.com', phone: '7001173134',
    status: 'Requirement', source: 'Facebook', assignedTo: 'Sales Rep A', createdBy: 'Mayur',
    createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(),
    lastCommentText: 'Not answering', lastCommentDate: format(subDays(new Date(), 1), 'dd-MM-yyyy'),
    kilowatt: 5, clientType: 'Individual/Bungalow', nextFollowUpDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'), nextFollowUpTime: '14:30',
    address: '456 Oak Ave, Mumbai', priority: 'Medium', electricityBillUrls: [], followupCount: 5,
  },
];

export const MOCK_CLIENTS: Client[] = [
   {
    id: 'client1', name: 'Green Valley Society', status: 'Deal Done', clientType: 'Housing Society', phone: '9876543210', assignedTo: 'Mayur',
    createdAt: subDays(new Date(), 100).toISOString(), updatedAt: subDays(new Date(), 10).toISOString(), electricityBillUrls: [], followupCount: 12
  },
  {
    id: 'client2', name: 'Mr. Anil Patel (Bungalow)', status: 'Deal Done', clientType: 'Individual/Bungalow', phone: '9876543211', assignedTo: 'Sales Rep A',
    createdAt: subDays(new Date(), 120).toISOString(), updatedAt: subDays(new Date(), 5).toISOString(), followupCount: 8, electricityBillUrls: [],
  },
  {
    id: 'client3', name: 'FutureTech Industries', status: 'Installer', clientType: 'Commercial', phone: '9876543212', assignedTo: 'Sales Rep B',
    createdAt: subDays(new Date(), 80).toISOString(), updatedAt: subDays(new Date(), 1).toISOString(), followupCount: 15, electricityBillUrls: [],
  },
];

export const DOCUMENT_TYPES_CONFIG: Array<{ type: DocumentType; icon: React.ComponentType<{ className?: string }>; description: string }> = [];

export const MOCK_DOCUMENTS: Document[] = [];
export const MOCK_COMMUNICATIONS: Communication[] = [];
export const EXPENSE_CATEGORIES = ['Travel', 'Food', 'Supplies', 'Utilities', 'Software', 'Training', 'Marketing', 'Incentive' ,'Other'] as const;
export const EXPENSE_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export const MOCK_EXPENSES: Expense[] = [];
export const SURVEY_TYPE_OPTIONS = ['Commercial', 'Residential', 'Industrial', 'Agricultural', 'Other'] as const;
export const CONSUMER_CATEGORIES_OPTIONS = CLIENT_TYPES;
export const METER_PHASES = ['Single Phase', 'Three Phase', 'Not Applicable'] as const;
export const CONSUMER_LOAD_TYPES = ['LT', 'HT'] as const;
export const ROOF_TYPES = ['Metal', 'RCC', 'Asbestos', 'Other'] as const;
export const DISCOM_OPTIONS = ['MSEDCL', 'Adani Electricity', 'Tata Power', 'Torrent Power', 'Other'] as const;

type PlaceholderDef = { placeholder: string; description: string; };
type PlaceholderGroup = { [groupName: string]: PlaceholderDef[] };

export const PLACEHOLDER_DEFINITIONS_PROPOSAL: PlaceholderGroup = {
  'Client Details': [
    { placeholder: '{{name}}', description: 'The full name of the client or company.' },
    { placeholder: '{{contact_person}}', description: 'The name of the main contact person.' },
    { placeholder: '{{email}}', description: 'The email address of the client.' },
    { placeholder: '{{phone}}', description: 'The phone/contact number of the client.' },
    { placeholder: '{{location}}', description: 'The primary address of the client/site.' },
    { placeholder: '{{city_area}}', description: 'The city or area of the client.' },
    { placeholder: '{{client_type}}', description: 'Type of client (e.g., Residential).' },
  ],
  'Proposal Details': [
    { placeholder: '{{proposal_number}}', description: 'The unique identification number for the proposal.' },
    { placeholder: '{{proposal_date}}', description: 'The date the proposal was created (e.g., 27 Jun, 2024).' },
    { placeholder: '{{created_by}}', description: 'The name of the user who created the proposal.' },
    { placeholder: '{{capacity}}', description: 'The system capacity in kilowatts (kW).' },
    { placeholder: '{{module_type}}', description: 'The type of solar module used (e.g., Mono PERC).' },
    { placeholder: '{{module_wattage}}', description: 'The wattage of a single module (e.g., 545 W).' },
    { placeholder: '{{inverter_rating}}', description: 'The rating of the inverter in kW.' },
    { placeholder: '{{inverter_qty}}', description: 'The quantity of inverters.' },
    { placeholder: '{{dcr_status}}', description: 'Indicates if the components are DCR or Non-DCR.' },
  ],
  'Financials': [
    { placeholder: '{{rate_per_watt}}', description: 'The cost per watt in rupees.' },
    { placeholder: '{{base_amount}}', description: 'The total amount before taxes (e.g., 2,00,000.00).' },
    { placeholder: '{{cgst_amount}}', description: 'The calculated CGST amount.' },
    { placeholder: '{{sgst_amount}}', description: 'The calculated SGST amount.' },
    { placeholder: '{{final_amount}}', description: 'The total final amount including taxes.' },
    { placeholder: '{{subsidy_amount}}', description: 'The applicable subsidy amount.' },
  ],
  'System Output & Savings': [
    { placeholder: '{{required_space}}', description: 'Calculated required area in Sq. Ft. (Capacity x 80).' },
    { placeholder: '{{generation_per_day}}', description: 'Estimated daily power generation in Units (Capacity x 4).' },
    { placeholder: '{{generation_per_year}}', description: 'Estimated yearly power generation in Units.' },
    { placeholder: '{{unit_rate}}', description: 'The rate per unit of electricity (₹).' },
    { placeholder: '{{savings_per_year}}', description: 'Estimated yearly savings in rupees.' },
  ],
  'Quantities': [
    { placeholder: '{{la_kit_qty}}', description: 'Quantity of Lightning Arrester kits.' },
    { placeholder: '{{acdb_dcdb_qty}}', description: 'Quantity of ACDB/DCDB boxes.' },
    { placeholder: '{{earthing_kit_qty}}', description: 'Quantity of Earthing kits.' },
  ],
  'Charts & Graphs (Add to your template)': [
    { placeholder: '{{monthly_generation_chart}}', description: 'A bar chart showing estimated monthly energy production for the year.' },
    { placeholder: '{{yearly_savings_chart}}', description: 'A line chart projecting yearly savings over 30 years.' },
    { placeholder: '{{capex_evaluation_sheet}}', description: 'Full Capex Model Evaluation Sheet — includes Project Specification, Plant Performance, O&M Cost, Accelerated Depreciation Benefits, ROI Calculation, and a complete 25-year Savings Projection table.' },
  ],
  'Date & Time': [
     { placeholder: '{{date_today}}', description: 'The current date when the document is generated.' },
  ],
};

const commonPlaceholders: PlaceholderGroup = {
  'Client Info': [
    { placeholder: '{{client_name}}', description: 'Full name of the client/company.' },
    { placeholder: '{{client_address}}', description: 'Address of the client/site.' },
  ],
   'Date': [
     { placeholder: '{{date_today}}', description: 'The current date (e.g., 28 Jun, 2024).' },
  ],
};

export const PLACEHOLDER_DEFINITIONS_DOCUMENTS: Record<DocumentType, PlaceholderGroup> = {
  'Purchase Order': {
    ...commonPlaceholders,
    'PO Details': [
      { placeholder: '{{po_date}}', description: 'Date of the Purchase Order.' },
      { placeholder: '{{capacity}}', description: 'System capacity in kW.' },
      { placeholder: '{{rate_per_watt}}', description: 'Agreed rate per watt.' },
    ],
    'PO Financials': [
      { placeholder: '{{total_amount}}', description: 'Total amount before tax.' },
      { placeholder: '{{gst_amount}}', description: 'Calculated GST amount.' },
      { placeholder: '{{grand_total_amount}}', description: 'The final total amount including tax.' },
    ],
  },
  'Warranty Certificate': {
    ...commonPlaceholders,
    'System Details': [
        { placeholder: '{{capacity}}', description: 'System capacity in kW.' },
        { placeholder: '{{module_make}}', description: 'Make/brand of the solar modules.' },
        { placeholder: '{{module_wattage}}', description: 'Wattage of individual modules.' },
        { placeholder: '{{inverter_make}}', description: 'Make/brand of the inverter.' },
        { placeholder: '{{inverter_rating}}', description: 'Rating of the inverter.' },
        { placeholder: '{{date_of_commissioning}}', description: 'Date the system was commissioned.' },
    ]
  },
  'Work Completion Report': {
      ...commonPlaceholders,
      'Report Details': [
        { placeholder: '{{consumer_number}}', description: 'The electricity consumer number.' },
        { placeholder: '{{sanction_number}}', description: 'Official sanction number for the project.' },
        { placeholder: '{{sanction_date}}', description: 'Date of project sanction.' },
        { placeholder: '{{work_completion_date}}', description: 'Date work was completed.' },
      ]
  },
  'Net Metering Agreement': {
      ...commonPlaceholders,
      'Agreement Details': [
        { placeholder: '{{consumer_number}}', description: 'The electricity consumer number.' },
        { placeholder: '{{agreement_date}}', description: 'Date of the net metering agreement.' },
        { placeholder: '{{capacity}}', description: 'System capacity in kW.' },
        { placeholder: '{{discom_section}}', description: 'The DISCOM section office.' },
        { placeholder: '{{discom_subdivision}}', description: 'The DISCOM sub-division office.' },
      ]
  },
  'Annexure I': {
    ...commonPlaceholders,
    'System & Client Details': [
      { placeholder: '{{capacity}}', description: 'System capacity in kW.' },
      { placeholder: '{{sanctioned_capacity}}', description: 'Sanctioned capacity for the project.' },
      { placeholder: '{{capacity_type}}', description: 'The type of capacity (Single/Three Phase).' },
      { placeholder: '{{date_of_installation}}', description: 'Date the system was installed.' },
      { placeholder: '{{phone_number}}', description: 'Client\'s phone number.' },
      { placeholder: '{{consumer_number}}', description: 'The electricity consumer number.' },
      { placeholder: '{{email}}', description: 'Client\'s email address.' },
      { placeholder: '{{inverter_details}}', description: 'Make and model of the inverter.' },
      { placeholder: '{{inverter_rating}}', description: 'Rating of the inverter.' },
      { placeholder: '{{module_wattage}}', description: 'Wattage of individual modules.' },
      { placeholder: '{{number_of_modules}}', description: 'Total number of modules installed.' },
      { placeholder: '{{project_model}}', description: 'Project model (CAPEX/OPEX).' },
      { placeholder: '{{district}}', description: 'District of installation.' },
    ]
  },
  'DCR Declaration': {
      ...commonPlaceholders,
      'Declaration Content': [
          { placeholder: '{{title}}', description: 'Title of the declaration document.' },
          { placeholder: '{{details}}', description: 'The main body/content of the declaration.' },
      ]
  },
  'Other': {
    ...commonPlaceholders,
     'Generic Fields': [
          { placeholder: '{{title}}', description: 'The title of your document.' },
          { placeholder: '{{details}}', description: 'The main content/body for your document.' },
      ]
  }
};
