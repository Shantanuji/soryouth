from docxtpl import DocxTemplate
import os
import platform
import pythoncom
from docx2pdf import convert as convert_to_pdf
from main import create_combined_charts_page
from docx.shared import Inches

doc = DocxTemplate("i:/saral infotech/Soryouth-CRM/Soryouth-CRM/public/Placeholder_Blocks.docx")
doc.init_docx()

res = create_combined_charts_page(doc, 10, 10, Inches(6.5))
if res:
    context = {'combined_charts_page': res}
    doc.render(context)
    doc.save("test_output.docx")
    print("Saved test_output.docx")
    try:
        pythoncom.CoInitialize()
        convert_to_pdf("test_output.docx", "test_output.pdf")
        print("Successfully converted to PDF!")
    except Exception as e:
        print(f"Failed to convert to PDF: {e}")
    finally:
        pythoncom.CoUninitialize()
else:
    print("Failed to generate image")
