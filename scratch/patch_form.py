with open('app/(app)/proposals/proposal-form.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update proposalSchema
old_schema = '''  contactPerson: z.string().min(2, { message: 'Contact person must be at least 2 characters.' }),
  location: z.string().min(3, { message: 'Location must be at least 3 characters.' }),'''
new_schema = '''  contactPerson: z.string().min(2, { message: 'Contact person must be at least 2 characters.' }),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().min(3, { message: 'Location must be at least 3 characters.' }),'''
content = content.replace(old_schema, new_schema)

# 2. Update initialFormStateForUseForm
old_initial = '''  contactPerson: "",
  location: "",'''
new_initial = '''  contactPerson: "",
  email: "",
  phone: "",
  location: "",'''
content = content.replace(old_initial, new_initial)

# 3. Update handleClientSelect
old_client_select = '''    form.setValue("contactPerson", client.name);
    form.setValue("location", client.address || "");'''
new_client_select = '''    form.setValue("contactPerson", client.name);
    form.setValue("email", client.email || "");
    form.setValue("phone", client.phone || "");
    form.setValue("location", client.address || "");'''
content = content.replace(old_client_select, new_client_select)

# 4. Update handleLeadSelect
old_lead_select = '''    form.setValue("contactPerson", lead.name);
    form.setValue("location", lead.address || "");'''
new_lead_select = '''    form.setValue("contactPerson", lead.name);
    form.setValue("email", lead.email || "");
    form.setValue("phone", lead.phone || "");
    form.setValue("location", lead.address || "");'''
content = content.replace(old_lead_select, new_lead_select)

with open('app/(app)/proposals/proposal-form.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated proposal-form.tsx!")
