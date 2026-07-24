
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
  'Charts & Images': [
    { placeholder: '{{combined_charts_page}}', description: 'Generates a full A4 page image containing both the Monthly Generation bar chart and the 30-Year Savings line graph perfectly formatted.' },
    { placeholder: '{{capex_evaluation_sheet}}', description: 'Generates the full detailed Capex Evaluation table with Project Specs, Plant Performance, O&M Cost, AD Benefits, ROI, and the 25-year projection table.' },
    { placeholder: '{{balance_of_system}}', description: 'Generates the full detailed A4 Balance of System table page with Soryouth logo branding, exact component specs, quantities, and standards.' },
    { placeholder: '{{monthly_generation_chart}}', description: 'Generates just the Monthly Energy Generation bar chart.' },
    { placeholder: '{{yearly_savings_chart}}', description: 'Generates just the Projected Savings for 30 Years line graph.' },
  ],
  'Client & Proposal Info': [
    { placeholder: '{{name}}', description: "Client's name (e.g., John Doe)" },
    { placeholder: '{{contact_person}}', description: "Contact person's name" },
    { placeholder: '{{email}}', description: "Client's email address" },
    { placeholder: '{{phone}}', description: "Client's phone number" },
    { placeholder: '{{location}}', description: 'Project location / address' },
    { placeholder: '{{city_area}}', description: 'City Area' },
    { placeholder: '{{client_type}}', description: 'Client type (e.g., Residential, Commercial)' },
    { placeholder: '{{proposal_number}}', description: 'The unique Proposal Number (e.g., P-2026-12345)' },
    { placeholder: '{{proposal_date}}', description: 'The date the proposal was created (e.g., 17 Jul, 2026)' },
    { placeholder: '{{date_today}}', description: "Today's current date" },
    { placeholder: '{{created_by}}', description: 'Name of the CRM user who generated the proposal' },
  ],
  'System Specifications': [
    { placeholder: '{{capacity}}', description: 'Project Size in KW (e.g., 10)' },
    { placeholder: '{{module_type}}', description: 'Solar Module Type (e.g., Monocrystalline)' },
    { placeholder: '{{module_wattage}}', description: 'Solar Module Wattage (e.g., 550W)' },
    { placeholder: '{{module_qty}}', description: 'Number of Solar Modules (ceil(Capacity * 1000 / Module Wattage))' },
    { placeholder: '{{moduleQty}}', description: 'Number of Solar Modules (alias)' },
    { placeholder: '{{module_spec}}', description: 'Solar Module Full Specification (e.g., Rayzon Solar Topcon Bifacial DCR 600 Wp)' },
    { placeholder: '{{module_details}}', description: 'Solar Module Full Specification (alias)' },
    { placeholder: '{{dcr_status}}', description: 'DCR or Non-DCR' },
    { placeholder: '{{inverter_rating}}', description: 'Inverter Rating' },
    { placeholder: '{{inverter_qty}}', description: 'Quantity of Inverters' },
    { placeholder: '{{inverterQty}}', description: 'Quantity of Inverters (alias)' },
    { placeholder: '{{inverter_spec}}', description: 'Inverter Full Specification (e.g., Growatt/Sungrow 8 kW)' },
    { placeholder: '{{inverter_details}}', description: 'Inverter Details (e.g., Growatt/Sungrow 8 kW)' },
    { placeholder: '{{inverter_kw}}', description: 'Inverter Rating in kW formatted string (e.g., 8 kW)' },
    { placeholder: '{{required_space}}', description: 'Required Space calculated in sq. ft.' },
    { placeholder: '{{la_kit_qty}}', description: 'Lightning Arrestor Kit Qty (e.g. 1)' },
    { placeholder: '{{la_kit_qty_nos}}', description: 'Lightning Arrestor Kit Qty with Nos (e.g. 1 Nos)' },
    { placeholder: '{{acdb_dcdb_qty}}', description: 'ACDB/DCDB Qty (e.g. 1)' },
    { placeholder: '{{acdb_qty_nos}}', description: 'ACDB Box Qty formatted (e.g. 1 No)' },
    { placeholder: '{{dcdb_qty_nos}}', description: 'DCDB Box Qty formatted (e.g. 1 No)' },
    { placeholder: '{{earthing_kit_qty}}', description: 'Earthing Kit Qty (e.g. 3)' },
    { placeholder: '{{earthing_kit_qty_nos}}', description: 'Earthing Kit Qty formatted (e.g. 3 Nos)' },
  ],
  'Project Cost & Commercials': [
    { placeholder: '{{project_size}}', description: 'Project size in KW (same as capacity)' },
    { placeholder: '{{rate_per_watt}}', description: 'Rate per watt in ₹' },
    { placeholder: '{{cost_per_kw}}', description: 'Cost per KW (Rate per watt × 1000)' },
    { placeholder: '{{subtotal}}', description: 'Base amount / Subtotal excluding GST' },
    { placeholder: '{{project_cost_ex_gst}}', description: 'Base amount / Subtotal excluding GST (alias)' },
    { placeholder: '{{base_amount}}', description: 'Base amount / Subtotal excluding GST (alias)' },
    { placeholder: '{{cgst_amount}}', description: 'CGST portion of GST (4.45%)' },
    { placeholder: '{{sgst_amount}}', description: 'SGST portion of GST (4.45%)' },
    { placeholder: '{{gst_amount}}', description: 'Total GST amount (8.9%)' },
    { placeholder: '{{total_project_cost_inc_gst}}', description: 'Total Project Cost including GST' },
    { placeholder: '{{final_amount}}', description: 'Total Project Cost including GST (alias)' },
    { placeholder: '{{subsidy_amount}}', description: 'Central Subsidy Amount (PM Surya Ghar)' },
    { placeholder: '{{central_subsidy_amount}}', description: 'Central Subsidy Amount (alias)' },
    { placeholder: '{{additional_subsidy_benefits}}', description: 'Additional Subsidy / State Subsidy Benefits' },
    { placeholder: '{{additional_subsidy}}', description: 'Additional Subsidy / State Subsidy Benefits (alias)' },
    { placeholder: '{{total_subsidy_amount}}', description: 'Total Subsidy Amount (Central + Additional)' },
    { placeholder: '{{net_amount_after_subsidy}}', description: 'Net Investment (Total Cost - Subsidies)' },
    { placeholder: '{{net_investment}}', description: 'Net Investment (Total Cost - Subsidies - AD Benefits)' },
    { placeholder: '{{netInvestment}}', description: 'Net Investment (Total Cost - Subsidies - AD Benefits) (alias)' },
  ],
  'Plant Performance & Savings': [
    { placeholder: '{{grid_tariff_per_unit}}', description: "Client's current grid tariff per unit" },
    { placeholder: '{{unit_rate}}', description: "Client's current grid tariff per unit (alias)" },
    { placeholder: '{{annual_generation}}', description: 'Total units generated per year' },
    { placeholder: '{{generation_per_year}}', description: 'Total units generated per year (alias)' },
    { placeholder: '{{monthly_generation}}', description: 'Average units generated per month' },
    { placeholder: '{{generation_per_day}}', description: 'Average units generated per day' },
    { placeholder: '{{degradation_rate}}', description: 'Always prints "0.70 - 0.80%"' },
    { placeholder: '{{savings_per_year}}', description: 'Total savings per year in ₹' },
  ],
  'O&M & AD Benefits': [
    { placeholder: '{{om_cost_per_kw}}', description: 'O&M cost per KW' },
    { placeholder: '{{total_om_cost}}', description: 'Total O&M cost per year' },
    { placeholder: '{{om_escalation}}', description: 'Always prints "3%"' },
    { placeholder: '{{ad_benefit_year1}}', description: 'Accelerated Depreciation Benefit Year 1' },
    { placeholder: '{{ad_benefit_year2}}', description: 'Accelerated Depreciation Benefit Year 2' },
    { placeholder: '{{ad_benefit_year3}}', description: 'Accelerated Depreciation Benefit Year 3' },
    { placeholder: '{{total_ad_benefit}}', description: 'Total Accelerated Depreciation Benefit' },
  ],
  'ROI Calculation': [
    { placeholder: '{{project_cost_ex_gst_roi}}', description: 'Base amount (same as project_cost_ex_gst)' },
    { placeholder: '{{additional_subsidy_benefits}}', description: 'Subsidy amount' },
    { placeholder: '{{cost_via_grid}}', description: 'Total cost client would pay to grid over 25 years' },
    { placeholder: '{{roi_in_years}}', description: 'Return on Investment in years (e.g., 3.25)' },
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
