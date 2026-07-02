import docx
from docx.oxml import OxmlElement

doc = docx.Document("scratch/template_current.docx")
root = doc.element

# We want to find elements that have text containing 'LINK Excel'
links = []
for elem in root.iter():
    if elem.tag.endswith('instrText') and elem.text and 'LINK Excel' in elem.text:
        # Trace up to parent paragraph or run to understand where it is
        parent = elem.getparent()
        grandparent = parent.getparent() if parent is not None else None
        links.append((elem.text, elem, parent, grandparent))

print(f"Found {len(links)} LINK Excel instrText elements.")
for idx, (text, elem, parent, grandparent) in enumerate(links):
    print(f"\nLINK {idx}:")
    print(f"  Instruction: {text[:150]}")
    print(f"  Parent Tag: {parent.tag if parent is not None else 'None'}")
    print(f"  Grandparent Tag: {grandparent.tag if grandparent is not None else 'None'}")
    # Let's print the parent paragraph's text if grandparent is a paragraph
    if grandparent is not None and grandparent.tag.endswith('p'):
        p = docx.text.paragraph.Paragraph(grandparent, doc)
        print(f"  Parent Paragraph Text: {p.text}")
