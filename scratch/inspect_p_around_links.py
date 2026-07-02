import docx

doc = docx.Document("scratch/template_current.docx")
root = doc.element

# Print paragraphs that contain 'LINK' in their XML
for idx, p in enumerate(doc.paragraphs):
    p_xml = p._p.xml
    if 'LINK Excel' in p_xml:
        print(f"\n--- Paragraph {idx} ---")
        print(f"Text: {p.text}")
        # Print run text
        for r_idx, r in enumerate(p.runs):
            print(f"  Run {r_idx}: {r.text} | XML contains LINK: {'LINK' in r._r.xml}")
