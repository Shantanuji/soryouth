import os
import re

# 1. Update the Survey Grid in Leads, Clients, and Dropped Leads
# We'll replace the grid closing part to add the attachments div.

files = [
    'app/(app)/leads/[leadId]/page.tsx',
    'app/(app)/clients/[clientId]/page.tsx',
    'app/(app)/dropped-leads/[droppedId]/page.tsx'
]

# We need to find the Remark div and insert the Attachments div right after it, before the closing </div>
# Remark div: <div className="col-span-2 sm:col-span-4"><span className="text-muted-foreground block mb-0.5">Remark</span> <span className="font-semibold">{survey.remark || 'N/A'}</span></div>

replacement_attachments = """                                                  <div className="col-span-2 sm:col-span-4"><span className="text-muted-foreground block mb-0.5">Remark</span> <span className="font-semibold">{survey.remark || 'N/A'}</span></div>
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
                                                  </div>"""

for file_path in files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        content = content.replace(
            '<div className="col-span-2 sm:col-span-4"><span className="text-muted-foreground block mb-0.5">Remark</span> <span className="font-semibold">{survey.remark || \'N/A\'}</span></div>',
            replacement_attachments
        )
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")
    except Exception as e:
        print(f"Failed to update {file_path}: {e}")

# 2. Update site-survey/page.tsx
site_survey_path = 'app/(app)/site-survey/page.tsx'
try:
    with open(site_survey_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import
    if "import { useSession }" not in content:
        content = content.replace(
            "import { useToast } from '@/hooks/use-toast';",
            "import { useToast } from '@/hooks/use-toast';\nimport { useSession } from '@/hooks/use-sessions';"
        )
        
    # Add const session
    if "const session = useSession();" not in content:
        content = content.replace(
            "export default function SiteSurveyPage() {\n  const { toast } = useToast();",
            "export default function SiteSurveyPage() {\n  const { toast } = useToast();\n  const session = useSession();"
        )
        
    # Update useEffect
    old_use_effect = """  useEffect(() => {
    async function fetchData() {
        setIsDataLoading(true);
        const [fetchedLeads, fetchedClients, fetchedUsers, fetchedLeadStatuses, fetchedLeadSources] = await Promise.all([
            getLeads({ignorePermissions: true}),
            getActiveClients({ignorePermissions: true}),
            getUsers(),
            getLeadStatuses(),
            getLeadSources()
        ]);
        setLeads(fetchedLeads);
        setClients(fetchedClients);
        setUsers(fetchedUsers);
        setLeadStatuses(fetchedLeadStatuses);
        setLeadSources(fetchedLeadSources);
        setIsDataLoading(false);
    }
    fetchData();
  }, []);"""

    new_use_effect = """  useEffect(() => {
    async function fetchData() {
        setIsDataLoading(true);
        const [fetchedLeads, fetchedClients, fetchedUsers, fetchedLeadStatuses, fetchedLeadSources] = await Promise.all([
            getLeads({ignorePermissions: true}),
            getActiveClients({ignorePermissions: true}),
            getUsers(),
            getLeadStatuses(),
            getLeadSources()
        ]);
        setLeads(fetchedLeads);
        setClients(fetchedClients);
        setUsers(fetchedUsers);
        setLeadStatuses(fetchedLeadStatuses);
        setLeadSources(fetchedLeadSources);
        setIsDataLoading(false);
        
        if (session?.userName) {
            const currentUser = fetchedUsers.find(u => u.name === session.userName);
            if (currentUser) {
                form.setValue('surveyorName', currentUser.name);
            }
        }
    }
    fetchData();
  }, [session?.userName, form]);"""
  
    content = content.replace(old_use_effect, new_use_effect)

    with open(site_survey_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {site_survey_path}")
except Exception as e:
    print(f"Failed to update {site_survey_path}: {e}")
