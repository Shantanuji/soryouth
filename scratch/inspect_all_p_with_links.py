import docx

doc = docx.Document("scratch/template_current.docx")

for idx, p in enumerate(doc.paragraphs):
    p_xml = p._p.xml
    if 'LINK Excel' in p_xml:
        # Find all instrText in this paragraph
        instrs = [node.text for node in p._p.iter() if node.tag.endswith('instrText')]
        print(f"P{idx}: Contains {len(instrs)} field codes.")
        for instr in instrs:
            if 'LINK Excel' in instr:
                print("  Code:", instr.strip())
