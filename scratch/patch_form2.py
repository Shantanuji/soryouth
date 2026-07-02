with open('app/(app)/proposals/proposal-form.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_client_block = '''            form.setValue("name", clients[0].name);
            form.setValue("clientType", clients[0].clientType || 'Other');
            form.setValue("contactPerson", clients[0].name);
            form.setValue("location", clients[0].address || "");'''

new_client_block = '''            form.setValue("name", clients[0].name);
            form.setValue("clientType", clients[0].clientType || 'Other');
            form.setValue("contactPerson", clients[0].name);
            form.setValue("email", clients[0].email || "");
            form.setValue("phone", clients[0].phone || "");
            form.setValue("location", clients[0].address || "");'''

old_lead_block = '''            form.setValue("name", leads[0].name);
            form.setValue("clientType", leads[0].clientType || 'Other');
            form.setValue("contactPerson", leads[0].name);
            form.setValue("location", leads[0].address || "");
            form.setValue("capacity", leads[0].kilowatt || 0);'''

new_lead_block = '''            form.setValue("name", leads[0].name);
            form.setValue("clientType", leads[0].clientType || 'Other');
            form.setValue("contactPerson", leads[0].name);
            form.setValue("email", leads[0].email || "");
            form.setValue("phone", leads[0].phone || "");
            form.setValue("location", leads[0].address || "");
            form.setValue("capacity", leads[0].kilowatt || 0);'''

content = content.replace(old_client_block, new_client_block)
content = content.replace(old_lead_block, new_lead_block)

with open('app/(app)/proposals/proposal-form.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed initial lead selection in proposal form!")
