
import os
import tempfile
import io
import base64
import subprocess
import platform
import shutil
import re
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for servers
from matplotlib.figure import Figure
import matplotlib.ticker as mticker

from flask import Flask, request, jsonify
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Inches
import docx # From python-docx
import pythoncom
from docx2pdf import convert as convert_to_pdf

app = Flask(__name__)

def create_monthly_generation_chart(doc, capacity_kw):
    """Generates a bar chart for monthly solar production using the OO API."""
    if not capacity_kw or capacity_kw <= 0:
        return None
        
    generation_per_day = capacity_kw * 4
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    seasonal_factors = [0.95, 0.97, 1.10, 1.13, 1.14, 0.93, 0.75, 0.79, 0.87, 1.02, 1.00, 0.99]
    monthly_generation = [generation_per_day * days * factor for days, factor in zip(days_in_month, seasonal_factors)]

    fig = Figure(figsize=(8, 4), dpi=150)
    ax = fig.add_subplot(1, 1, 1)

    ax.bar(months, monthly_generation, color='#00BFFF')
    ax.set_ylabel('Energy Produced (in kWh)')
    ax.set_xlabel('Months')
    ax.set_title('Monthly Solar Production')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    # Set rotation for x-tick labels
    for label in ax.get_xticklabels():
        label.set_rotation(45)
        label.set_ha('right')
    
    fig.tight_layout()

    memfile = io.BytesIO()
    fig.savefig(memfile, format='png')
    memfile.seek(0)
    
    return InlineImage(doc, memfile, width=Inches(6.0))


def create_yearly_savings_chart(doc, capacity_kw, unit_rate):
    """Generates a line chart for yearly savings over 30 years using the OO API."""
    if not capacity_kw or capacity_kw <= 0 or not unit_rate or unit_rate <= 0:
        return None

    initial_generation_per_year = capacity_kw * 4 * 365
    years = list(range(1, 31))
    savings = []
    
    current_generation = initial_generation_per_year
    current_rate = unit_rate

    for _ in years:
        savings.append(current_generation * current_rate)
        current_generation *= 0.996
        current_rate *= 1.02

    fig = Figure(figsize=(8, 4), dpi=150)
    ax = fig.add_subplot(1, 1, 1)

    ax.plot(years, savings, marker='o', linestyle='-', color='#FFB347')
    ax.set_ylabel('Projected Savings (in ₹)')
    ax.set_xlabel('Year')
    ax.set_title('Projected Yearly Savings for 30 Years')
    ax.grid(True, which='both', linestyle='--', linewidth=0.5)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.get_yaxis().set_major_formatter(mticker.FuncFormatter(lambda x, p: format(int(x), ',')))
    
    fig.tight_layout()

    memfile = io.BytesIO()
    fig.savefig(memfile, format='png')
    memfile.seek(0)

    return InlineImage(doc, memfile, width=Inches(6.0))

@app.route('/extract-placeholders', methods=['POST'])
def extract_placeholders():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        try:
            document = docx.Document(io.BytesIO(file.read()))
            placeholders = set()
            # Regex to find {{placeholder}}
            pattern = re.compile(r'\{\{([^}]+)\}\}')
            
            for para in document.paragraphs:
                matches = pattern.findall(para.text)
                for match in matches:
                    placeholders.add(f"{{{{{match}}}}}")
            
            for table in document.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for para in cell.paragraphs:
                            matches = pattern.findall(para.text)
                            for match in matches:
                                placeholders.add(f"{{{{{match}}}}}")

            return jsonify({"success": True, "placeholders": sorted(list(placeholders))})
        except Exception as e:
            return jsonify({"error": f"Error processing file: {str(e)}"}), 500
    return jsonify({"error": "File processing failed"}), 500


@app.route('/generate', methods=['POST'])
def generate_proposal():
    original_mplconfigdir = os.environ.get('MPLCONFIGDIR')
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            # Set a temporary, isolated config directory for Matplotlib to avoid conflicts.
            os.environ['MPLCONFIGDIR'] = temp_dir

            payload = request.get_json()
            if not payload:
                return jsonify({"error": "Invalid JSON payload"}), 400

            template_full_path = payload.get('template_path')
            context = payload.get('data')

            if not template_full_path or not context:
                return jsonify({"error": "Missing 'template_path' or 'data' in payload"}), 400

            if not os.path.exists(template_full_path):
                return jsonify({"error": f"Template not found at provided path"}), 404
            
            doc = DocxTemplate(template_full_path)
            
            # --- Graph Generation ---
            raw_capacity = context.get('capacity')
            raw_unit_rate = context.get('unit_rate')
            
            capacity_kw = 0
            if raw_capacity:
                try:
                    capacity_kw = float(str(raw_capacity).replace(',', ''))
                except (ValueError, TypeError):
                    capacity_kw = 0

            unit_rate = 0
            if raw_unit_rate:
                try:
                    unit_rate = float(str(raw_unit_rate).replace(',', ''))
                except (ValueError, TypeError):
                    unit_rate = 0
                    
            if 'monthly_generation_chart' in doc.get_undeclared_template_variables():
                monthly_chart_image = create_monthly_generation_chart(doc, capacity_kw)
                if monthly_chart_image:
                    context['monthly_generation_chart'] = monthly_chart_image
            
            if 'yearly_savings_chart' in doc.get_undeclared_template_variables():
                yearly_savings_chart_image = create_yearly_savings_chart(doc, capacity_kw, unit_rate)
                if yearly_savings_chart_image:
                    context['yearly_savings_chart'] = yearly_savings_chart_image
            # --- End Graph Generation ---

            doc.render(context)

            temp_docx_path = os.path.join(temp_dir, 'output.docx')
            doc.save(temp_docx_path)
            
            temp_pdf_path = os.path.join(temp_dir, 'output.pdf')
            
            try:
                pythoncom.CoInitialize()
                convert_to_pdf(temp_docx_path, temp_pdf_path)
            except Exception as e:
                return jsonify({"error": f"PDF conversion failed with MS Word. Error: {e}"}), 500
            finally:
                pythoncom.CoUninitialize()

            temp_pdf_path = os.path.join(temp_dir, 'output.pdf')

            if not os.path.exists(temp_pdf_path):
                 return jsonify({"error": "PDF conversion failed. Output file not found."}), 500

            with open(temp_docx_path, 'rb') as f_docx, open(temp_pdf_path, 'rb') as f_pdf:
                docx_buffer = f_docx.read()
                pdf_buffer = f_pdf.read()

            docx_b64 = base64.b64encode(docx_buffer).decode('utf-8')
            pdf_b64 = base64.b64encode(pdf_buffer).decode('utf-8')
            
            return jsonify({
                "success": True,
                "pdf_b64": pdf_b64,
                "docx_b64": docx_b64
            })

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": f"Python service error: {str(e)}"}), 500
    finally:
        if original_mplconfigdir is not None:
            os.environ['MPLCONFIGDIR'] = original_mplconfigdir
        elif 'MPLCONFIGDIR' in os.environ:
            del os.environ['MPLCONFIGDIR']

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
