import docx

doc = docx.Document("scratch/template_current.docx")
p = doc.paragraphs[99]
print(p._p.xml)
