import docx
import sys

# Set standard output encoding to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

doc = docx.Document("scratch/template_current.docx")
root = doc.element

with open("scratch/all_xml_text.txt", "w", encoding="utf-8") as f:
    for elem in root.iter():
        if elem.tag.endswith('t') and elem.text:
            f.write(elem.text + "\n")

print("Written all XML text nodes to scratch/all_xml_text.txt")
