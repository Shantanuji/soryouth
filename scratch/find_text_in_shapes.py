import docx
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

doc = docx.Document("scratch/template_current.docx")

# Count shapes
print("Inline shapes:", len(doc.inline_shapes))

# Search XML for text boxes and text
print("\n--- Searching XML elements for text ---")
root = doc.element
texts = []
for elem in root.iter():
    if elem.tag.endswith('t') and elem.text:
        texts.append(elem.text.strip())

print(f"Found {len(texts)} text nodes in XML.")
print("First 100 text nodes:")
for i, text in enumerate(texts[:100]):
    if text:
        print(f"{i}: {text}")
