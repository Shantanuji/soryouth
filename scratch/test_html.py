from docx import Document
from htmldocx import HtmlToDocx
document = Document()
new_parser = HtmlToDocx()
html = '''<table style="width:100%; border: 1px solid black;">
<tr><th style="background-color: #002060; color: white;">Header</th></tr>
<tr><td style="background-color: #92D050;">Data</td></tr>
</table>'''
new_parser.add_html_to_document(html, document)
document.save('scratch/test_html.docx')
print('Done')
