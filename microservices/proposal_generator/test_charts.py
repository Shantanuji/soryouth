from docxtpl import DocxTemplate
import docx
import io
import os
from main import create_combined_charts_page, create_capex_evaluation_sheet
from docx.shared import Inches

doc = DocxTemplate("i:/saral infotech/Soryouth-CRM/Soryouth-CRM/public/Placeholder_Blocks.docx")
try:
    d = docx.Document()
    doc.docx = d
except Exception as e:
    print(e)

res = create_combined_charts_page(doc, 10, 10, Inches(6.5))
if res:
    print(f"Combined charts image generated successfully!")
else:
    print("Combined charts failed!")
