import os
import sys
import traceback
import zipfile
import re

file_path = r'i:\saral infotech\Soryouth-CRM\Soryouth-CRM\dist\kapex-fixed-data.docx'

print(f"=== Inspecting {file_path} ===")
print(f"File size: {os.path.getsize(file_path):,} bytes")

# 1. Check raw XML in docx zip for placeholders
try:
    with zipfile.ZipFile(file_path, 'r') as z:
        print("\n--- ZIP Contents Summary ---")
        xml_files = [f for f in z.namelist() if f.endswith('.xml')]
        print(f"Total XML files: {len(xml_files)}")
        
        raw_placeholders = set()
        pattern = re.compile(r'\{\{([^}]+)\}\}')
        tag_pattern = re.compile(r'\{%([^%]+)%\}')
        
        for xml_file in xml_files:
            content = z.read(xml_file).decode('utf-8', errors='ignore')
            clean_text = re.sub(r'<[^>]+>', '', content)
            
            for m in pattern.finditer(clean_text):
                raw_placeholders.add(f"{{{{{m.group(1).strip()}}}}}")
                
            tags = tag_pattern.findall(clean_text)
            if tags:
                print(f"Jinja Tags found in {xml_file}: {tags}")

        print(f"\nTotal raw placeholders found in XML text ({len(raw_placeholders)}):")
        for ph in sorted(raw_placeholders):
            print(f"  {ph}")

except Exception as e:
    print(f"Error reading zip: {e}")
    traceback.print_exc()

# 2. Check with docxtpl
try:
    from docxtpl import DocxTemplate
    doc = DocxTemplate(file_path)
    doc.init_docx()
    vars_found = doc.get_undeclared_template_variables()
    print(f"\n--- DocxTemplate Undeclared Variables ({len(vars_found)}) ---")
    for v in sorted(vars_found):
        print(f"  {v}")
except Exception as e:
    print(f"\nDocxTemplate Error: {type(e).__name__}: {e}")
    traceback.print_exc()
