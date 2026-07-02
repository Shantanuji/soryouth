with open('microservices/proposal_generator/main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if line.startswith('def create_capex_evaluation_sheet(doc, context):'):
        start_idx = i
    if start_idx != -1 and 'return InlineImage(doc, memfile, width=Inches(6.5))' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    with open('scratch/update_main.py', 'r', encoding='utf-8') as f:
        update_code = f.read()
    
    # extract the new code block from update_main.py
    new_code = update_code.split('new_helpers = """')[1].split('"""')[0].strip()
    
    # Assemble new content
    new_lines = lines[:start_idx] + [new_code + '\n\n'] + lines[end_idx+1:]
    
    with open('microservices/proposal_generator/main.py', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print('Successfully patched main.py')
else:
    print(f'Failed to find bounds. start: {start_idx}, end: {end_idx}')
