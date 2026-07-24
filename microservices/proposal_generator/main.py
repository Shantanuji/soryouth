import os
import tempfile
import io
import base64
import subprocess
import platform
import shutil
import re
import uuid

import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for servers
from matplotlib.figure import Figure
import matplotlib.ticker as mticker

from flask import Flask, request, jsonify
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import docx  # From python-docx
from html2image import Html2Image

if platform.system() == 'Windows':
    try:
        import pythoncom
        from docx2pdf import convert as convert_to_pdf
    except ImportError:
        pythoncom = None
        convert_to_pdf = None
else:
    pythoncom = None
    convert_to_pdf = None

app = Flask(__name__)


def safe_float(val, default=0.0):
    """Global helper to safely parse numerical strings into floats."""
    if val is None:
        return float(default)
    try:
        return float(str(val).replace(',', '').replace('₹', '').replace('%', '').strip())
    except (ValueError, TypeError):
        return float(default)


def get_printable_width(doc):
    """
    Dynamically calculates 95% of the printable width of the DOCX template.
    Defaults to 6.5 inches if it cannot be determined.
    """
    try:
        section = doc.docx.sections[0]
        page_width = section.page_width.inches
        left_margin = section.left_margin.inches
        right_margin = section.right_margin.inches
        printable_width = page_width - left_margin - right_margin
        return Inches(printable_width * 0.95)
    except Exception:
        return Inches(6.5)


def create_monthly_generation_chart_b64(capacity_kw):
    """Generates monthly chart and returns base64 PNG for HTML rendering."""
    if not capacity_kw or capacity_kw <= 0:
        return None
        
    generation_per_day = capacity_kw * 4
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    seasonal_factors = [0.95, 0.97, 1.10, 1.13, 1.14, 0.93, 0.75, 0.79, 0.87, 1.02, 1.00, 0.99]
    monthly_generation = [generation_per_day * days * factor for days, factor in zip(days_in_month, seasonal_factors)]

    fig = Figure(figsize=(9, 4.8), dpi=300)
    ax = fig.add_subplot(1, 1, 1)

    ax.bar(months, monthly_generation, color='#4F81BD', edgecolor='#385D8A', linewidth=1.5, width=0.6)
    ax.tick_params(axis='x', which='both', bottom=False, top=False, labelbottom=False)
    ax.tick_params(axis='y', colors='#595959', labelsize=12)
    
    ax.set_ylabel('Energy Produced (in kWh)', color='#595959', fontweight='bold', fontsize=14, labelpad=10)
    ax.set_xlim(-0.5, 11.5)
    
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_visible(False)
    ax.spines['left'].set_visible(False)
    ax.grid(axis='y', linestyle='-', color='#D9D9D9', alpha=0.7)
    ax.set_axisbelow(True)
    
    cell_text = [[f"{int(val)}" for val in monthly_generation]]
    table = ax.table(cellText=cell_text, rowLabels=['Series1'], colLabels=months, loc='bottom', cellLoc='center', bbox=[0, -0.15, 1, 0.12])
    table.auto_set_font_size(False)
    table.set_fontsize(14)
    table.scale(1, 1.8)  # Normal padding
    
    for key, cell in table.get_celld().items():
        cell.set_edgecolor('#D9D9D9')
        if key[0] == 0:  # Header row
            cell.set_text_props(weight='bold', color='#595959')
        if key[1] == -1: # Row label (Series1)
            cell.set_text_props(weight='bold', color='#595959')

    fig.subplots_adjust(left=0.12, bottom=0.20, right=0.95, top=0.95)

    memfile = io.BytesIO()
    fig.savefig(memfile, format='png', transparent=True)
    memfile.seek(0)
    b64 = base64.b64encode(memfile.read()).decode('utf-8')
    return f"data:image/png;base64,{b64}"


def create_yearly_savings_chart_b64(capacity_kw, unit_rate):
    """Generates yearly chart and returns base64 PNG for HTML rendering."""
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

    fig = Figure(figsize=(9, 4.8), dpi=300)
    ax = fig.add_subplot(1, 1, 1)

    ax.plot(years, savings, marker='o', linestyle='-', color='#F79646', linewidth=2.5, markersize=8)
    
    ax.set_ylabel('Projected Savings (in ₹)', color='#595959', fontweight='bold', fontsize=14, labelpad=10)
    ax.set_xlabel('Year', color='#595959', fontweight='bold', fontsize=14, labelpad=10)
    
    ax.set_xlim(0.8, 30.2) 
    
    ax.grid(True, which='both', linestyle='--', linewidth=0.5, color='#D9D9D9')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color('#595959')
    ax.spines['left'].set_color('#595959')
    ax.tick_params(axis='both', colors='#595959', labelsize=12)
    ax.get_yaxis().set_major_formatter(mticker.FuncFormatter(lambda x, p: format(int(x), ',')))
    
    fig.subplots_adjust(left=0.15, bottom=0.15, right=0.95, top=0.95)

    memfile = io.BytesIO()
    fig.savefig(memfile, format='png', transparent=True)
    memfile.seek(0)
    b64 = base64.b64encode(memfile.read()).decode('utf-8')
    return f"data:image/png;base64,{b64}"


def create_combined_charts_page(doc, capacity_kw, unit_rate, target_width):
    """
    Generates a single combined A4 page containing both charts perfectly styled and spaced, 
    so Word does not compress them on the same page.
    """
    monthly_b64 = create_monthly_generation_chart_b64(capacity_kw)
    yearly_b64 = create_yearly_savings_chart_b64(capacity_kw, unit_rate)
    
    if not monthly_b64 or not yearly_b64:
        return None
        
    html = f'''
    <html>
    <head>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        ::-webkit-scrollbar {{
            display: none;
        }}
        body {{
            font-family: 'Segoe UI', Calibri, sans-serif;
            background: white;
            width: 840px;
            height: 1188px;
            padding: 40px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            margin: 0;
        }}
        .header {{
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            color: #002060;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
            border-bottom: 3px solid #002060;
            padding-bottom: 10px;
        }}
        .charts-wrapper {{
            display: flex;
            flex-direction: column;
            gap: 20px;
            flex-grow: 1;
        }}
        .chart-block {{
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-grow: 1;
            width: 100%;
        }}
        .chart-title {{
            font-size: 20px;
            font-weight: bold;
            color: #595959;
            margin-bottom: 5px;
            text-align: center;
        }}
        .chart-container {{
            flex-grow: 1;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
        }}
        img {{
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }}
    </style>
    </head>
    <body>
        <div class="header">Solar Performance Analysis</div>
        <div class="charts-wrapper">
            <div class="chart-block">
                <div class="chart-title">Monthly Energy Generation</div>
                <div class="chart-container">
                    <img src="{monthly_b64}" />
                </div>
            </div>
            <div class="chart-block">
                <div class="chart-title">Projected Savings for 30 Years</div>
                <div class="chart-container">
                    <img src="{yearly_b64}" />
                </div>
            </div>
        </div>
    </body>
    </html>
    '''
    
    hti = Html2Image(size=(840, 1188), custom_flags=['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=3'])
    
    if platform.system() == 'Linux':
        out_dir = os.path.expanduser('~/hti_tmp')
        os.makedirs(out_dir, exist_ok=True)
        hti.output_path = out_dir
        hti.temp_path = out_dir
    else:
        hti.output_path = tempfile.gettempdir()
        hti.temp_path = tempfile.gettempdir()

        
    filename = f'combined_charts_{uuid.uuid4().hex}.png'
    temp_path = os.path.join(hti.output_path, filename)
    
    try:
        hti.screenshot(html_str=html, save_as=filename)
        if os.path.exists(temp_path):
            return InlineImage(doc, temp_path, width=target_width)
        else:
            return None
    except Exception as e:
        print(f"Error generating combined charts screenshot: {e}")
        return None


# BACKWARD COMPATIBILITY: Keep old functions intact but unused
def create_monthly_generation_chart(doc, capacity_kw, target_width):
    if not capacity_kw or capacity_kw <= 0:
        return None
    generation_per_day = capacity_kw * 4
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    seasonal_factors = [0.95, 0.97, 1.10, 1.13, 1.14, 0.93, 0.75, 0.79, 0.87, 1.02, 1.00, 0.99]
    monthly_generation = [generation_per_day * days * factor for days, factor in zip(days_in_month, seasonal_factors)]

    fig = Figure(figsize=(8, 4.5), dpi=300)
    ax = fig.add_subplot(1, 1, 1)
    ax.bar(months, monthly_generation, color='#4F81BD', edgecolor='#385D8A', linewidth=1.5, width=0.6)
    ax.tick_params(axis='x', which='both', bottom=False, top=False, labelbottom=False)
    ax.tick_params(axis='y', colors='#595959', labelsize=10)
    ax.set_ylabel('Energy Produced (in kWh)', color='#595959', fontweight='bold', fontsize=12, labelpad=10)
    ax.set_title('Monthly Projection', color='#595959', fontweight='bold', fontsize=16, pad=15)
    ax.set_xlim(-0.5, 11.5)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_visible(False)
    ax.spines['left'].set_visible(False)
    ax.grid(axis='y', linestyle='-', color='#D9D9D9', alpha=0.7)
    ax.set_axisbelow(True)
    
    cell_text = [[f"{int(val)}" for val in monthly_generation]]
    table = ax.table(cellText=cell_text, rowLabels=['Series1'], colLabels=months, loc='bottom', cellLoc='center', bbox=[0, -0.22, 1, 0.12])
    table.auto_set_font_size(False)
    table.set_fontsize(13)
    for key, cell in table.get_celld().items():
        cell.set_edgecolor('#D9D9D9')

    fig.subplots_adjust(left=0.12, bottom=0.30, right=0.95, top=0.90)

    memfile = io.BytesIO()
    fig.savefig(memfile, format='png')
    memfile.seek(0)
    return InlineImage(doc, memfile, width=target_width)


def create_yearly_savings_chart(doc, capacity_kw, unit_rate, target_width):
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

    fig = Figure(figsize=(8, 4.5), dpi=300)
    ax = fig.add_subplot(1, 1, 1)
    ax.plot(years, savings, marker='o', linestyle='-', color='#F79646', linewidth=2.5, markersize=6)
    ax.set_ylabel('Projected Savings (in ₹)', color='#595959', fontweight='bold', fontsize=12)
    ax.set_xlabel('Year', color='#595959', fontweight='bold', fontsize=12)
    ax.set_title('Projected Yearly Savings for 30 Years', color='#595959', fontweight='bold', fontsize=16, pad=15)
    ax.set_xlim(0.8, 30.2) 
    ax.grid(True, which='both', linestyle='--', linewidth=0.5, color='#D9D9D9')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color('#595959')
    ax.spines['left'].set_color('#595959')
    ax.tick_params(axis='both', colors='#595959', labelsize=10)
    ax.get_yaxis().set_major_formatter(mticker.FuncFormatter(lambda x, p: format(int(x), ',')))
    
    fig.subplots_adjust(left=0.12, bottom=0.30, right=0.95, top=0.90)

    memfile = io.BytesIO()
    fig.savefig(memfile, format='png')
    memfile.seek(0)
def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_borders(cell, top="0080C0", bottom="0080C0", left="0080C0", right="0080C0", sz="12", val="single"):
    tcPr = cell._tc.get_or_add_tcPr()
    borders_elm = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{top}"/>
            <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{left}"/>
            <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{bottom}"/>
            <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{right}"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders_elm)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    margins_elm = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(margins_elm)

def add_native_balance_of_system_table(container, context):
    """
    Generates a native, fully editable Word table inside any Document or Subdoc
    with exact blue styling, borders, shading, font weights, and dynamic values.
    """
    import math

    capacity = safe_float(context.get('capacity', context.get('project_size', 0)))
    mod_watt = safe_float(context.get('module_wattage'), 600)
    if mod_watt <= 0:
        mod_watt = 600
        
    calc_mod_qty = int(math.ceil((capacity * 1000) / mod_watt)) if capacity > 0 else 0
    passed_mod_qty = safe_float(context.get('module_qty', context.get('moduleQty', 0)))
    module_qty = str(int(passed_mod_qty)) if passed_mod_qty > 0 else (str(calc_mod_qty) if calc_mod_qty > 0 else "14")

    mod_type = str(context.get('module_type', 'Topcon Bifacial')).strip()
    dcr_stat = str(context.get('dcr_status', 'DCR')).strip()
    mod_spec_fallback = f"Rayzon Solar {mod_type} {dcr_stat} {int(mod_watt)} Wp"
    module_spec = str(context.get('module_spec', context.get('module_details', context.get('module_description', mod_spec_fallback))))

    inv_kw = safe_float(context.get('inverter_rating', context.get('inverter_kw', capacity)))
    inv_kw_fmt = f"{int(inv_kw) if inv_kw == int(inv_kw) else inv_kw:.1f} kW" if inv_kw > 0 else "8 kW"
    inv_spec_fallback = f"Growatt/Sungrow {inv_kw_fmt}"
    inverter_spec = str(context.get('inverter_spec', context.get('inverter_details', context.get('inverter_description', inv_spec_fallback))))

    inv_qty_val = int(safe_float(context.get('inverter_qty', context.get('inverterQty', 1))))
    inv_qty_val = max(1, inv_qty_val)
    inverter_qty_nos = f"{inv_qty_val} Nos"

    acdb_qty_val = int(safe_float(context.get('acdb_qty', context.get('acdb_dcdb_qty', inv_qty_val))))
    dcdb_qty_val = int(safe_float(context.get('dcdb_qty', context.get('acdb_dcdb_qty', inv_qty_val))))
    earthing_qty_val = int(safe_float(context.get('earthing_kit_qty', context.get('earthing_qty', inv_qty_val * 3))))
    la_qty_val = int(safe_float(context.get('la_kit_qty', context.get('la_qty', inv_qty_val))))

    dcdb_qty_nos = f"{dcdb_qty_val} No" if dcdb_qty_val == 1 else f"{dcdb_qty_val} Nos"
    acdb_qty_nos = f"{acdb_qty_val} No" if acdb_qty_val == 1 else f"{acdb_qty_val} Nos"
    earthing_kit_qty_nos = f"{earthing_qty_val} Nos"
    la_kit_qty_nos = f"{la_qty_val} No" if la_qty_val == 1 else f"{la_qty_val} Nos"

    p = container.add_paragraph()
    run = p.add_run("Balance of System")
    run.font.name = 'Segoe UI'
    run.font.size = Pt(20)
    run.font.bold = True
    run.font.color.rgb = RGBColor(11, 59, 96) # #0B3B60
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(14)

    rows_data = [
        ("Solar Modules", "PV Solar Module", module_qty, module_spec),
        ("Inverter", inverter_spec, inverter_qty_nos, inverter_spec),
        ("Mounting Structure", "RCC Rooftop", "1 Lot", "GI Sqaure Pipe for Columns & Rafter/Strut Channel for Panel Mounting 15-18ft"),
        ("DC Cable", "4 sq.mm", "As per design", "Polycab 1.1 kV Standard EN 50618 / IEC 62930 UV Resistant - Yes"),
        ("AC Cable", "As per Design", "As per design", "XLPE Insulated Armed Polycab Voltage Rating 1.1 kV Standard - IS 7098"),
        ("DCDB", "As per design", dcdb_qty_nos, "DC Isolator, DC SPD Type-II, String Fuses Enclosure - IP65 Weatherproof"),
        ("ACDB", "As per design", acdb_qty_nos, "MCCB/MCB, AC SPD Type-II Enclosure - IP65 Weatherproof"),
        ("Earthing Kit", "Chemical Earthing", earthing_kit_qty_nos, "Electrode Size - 17.2 mm Copper Bonded / GI Electrode Earth Resistance less than 5 Ohms Compliance IS 3043"),
        ("Lightning Arrester", "Standard", la_kit_qty_nos, "IS/IEC Standards"),
        ("Connectors", "MC4 compatible", "As required", "1500 V DC Protection Class - IP68"),
        ("Monitoring", "RMS App-based", "1 Set", "Real-Time Generation, Fault Alerts, Historical Data Analysis"),
        ("Tags", "Aluminum Engraved", "1 Set", "Aluminum Engraved Identification Tags"),
        ("Fire Extinguishers", "As per compliance", "1 Set", "As per MNRE / Electrical Compliance Requirements"),
    ]

    table = container.add_table(rows=len(rows_data) + 1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Inches(1.3), Inches(1.5), Inches(0.9), Inches(2.8)]

    # Header row
    hdr_cells = table.rows[0].cells
    headers = ["Component", "Details", "Qty", "Specifications"]
    for i, h_text in enumerate(headers):
        cell = hdr_cells[i]
        cell.width = col_widths[i]
        set_cell_background(cell, "1B4D75")
        set_cell_borders(cell, top="0080C0", bottom="0080C0", left="0080C0", right="0080C0", sz="12")
        set_cell_margins(cell, top=160, bottom=160, left=180, right=180)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        
        hp = cell.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        hrun = hp.add_run(h_text)
        hrun.font.name = 'Calibri'
        hrun.font.size = Pt(10.5)
        hrun.font.bold = True
        hrun.font.color.rgb = RGBColor(255, 255, 255)

    # Data rows
    for r_idx, row_tuple in enumerate(rows_data, start=1):
        row_cells = table.rows[r_idx].cells
        for c_idx, val in enumerate(row_tuple):
            cell = row_cells[c_idx]
            cell.width = col_widths[c_idx]
            set_cell_background(cell, "EAF4FC")
            set_cell_borders(cell, top="0080C0", bottom="0080C0", left="0080C0", right="0080C0", sz="10")
            set_cell_margins(cell, top=120, bottom=120, left=150, right=150)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

            cp = cell.paragraphs[0]
            if c_idx == 2:
                cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                cp.alignment = WD_ALIGN_PARAGRAPH.LEFT
                
            crun = cp.add_run(str(val))
            crun.font.name = 'Calibri'
            crun.font.size = Pt(9.5)
            crun.font.color.rgb = RGBColor(11, 59, 96)
            if c_idx == 0:
                crun.font.bold = True

    return table


def generate_balance_of_system_png(context):
    """
    Generates an ultra-high-resolution PNG screenshot of the Balance of System page
    with exact Soryouth branding, component list, quantities, and specifications
    derived directly from the proposal/database context.
    """
    import math

    capacity = safe_float(context.get('capacity', context.get('project_size', 0)))
    mod_watt = safe_float(context.get('module_wattage'), 600)
    if mod_watt <= 0:
        mod_watt = 600
        
    calc_mod_qty = int(math.ceil((capacity * 1000) / mod_watt)) if capacity > 0 else 0
    passed_mod_qty = safe_float(context.get('module_qty', context.get('moduleQty', 0)))
    module_qty = str(int(passed_mod_qty)) if passed_mod_qty > 0 else (str(calc_mod_qty) if calc_mod_qty > 0 else "14")

    mod_type = str(context.get('module_type', 'Topcon Bifacial')).strip()
    dcr_stat = str(context.get('dcr_status', 'DCR')).strip()
    mod_spec_fallback = f"Rayzon Solar {mod_type} {dcr_stat} {int(mod_watt)} Wp"
    module_spec = str(context.get('module_spec', context.get('module_details', context.get('module_description', mod_spec_fallback))))

    inv_kw = safe_float(context.get('inverter_rating', context.get('inverter_kw', capacity)))
    inv_kw_fmt = f"{int(inv_kw) if inv_kw == int(inv_kw) else inv_kw:.1f} kW" if inv_kw > 0 else "8 kW"
    inv_spec_fallback = f"Growatt/Sungrow {inv_kw_fmt}"
    inverter_spec = str(context.get('inverter_spec', context.get('inverter_details', context.get('inverter_description', inv_spec_fallback))))

    inv_qty_val = int(safe_float(context.get('inverter_qty', context.get('inverterQty', 1))))
    inv_qty_val = max(1, inv_qty_val)
    inverter_qty_nos = f"{inv_qty_val} Nos"

    acdb_qty_val = int(safe_float(context.get('acdb_qty', context.get('acdb_dcdb_qty', inv_qty_val))))
    dcdb_qty_val = int(safe_float(context.get('dcdb_qty', context.get('acdb_dcdb_qty', inv_qty_val))))
    earthing_qty_val = int(safe_float(context.get('earthing_kit_qty', context.get('earthing_qty', inv_qty_val * 3))))
    la_qty_val = int(safe_float(context.get('la_kit_qty', context.get('la_qty', inv_qty_val))))

    dcdb_qty_nos = f"{dcdb_qty_val} No" if dcdb_qty_val == 1 else f"{dcdb_qty_val} Nos"
    acdb_qty_nos = f"{acdb_qty_val} No" if acdb_qty_val == 1 else f"{acdb_qty_val} Nos"
    earthing_kit_qty_nos = f"{earthing_qty_val} Nos"
    la_kit_qty_nos = f"{la_qty_val} No" if la_qty_val == 1 else f"{la_qty_val} Nos"

    out_dir = tempfile.gettempdir()
    logo_filename = f"soryouth_logo_{uuid.uuid4().hex[:8]}.png"
    logo_dest_path = os.path.join(out_dir, logo_filename)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))

    possible_logo_paths = [
        os.path.join(project_root, 'public', 'assets', 'images', 'logo-icon.png'),
        os.path.join(project_root, 'public', 'assets', 'images', 'soryouth-logo.png'),
        os.path.join(project_root, 'public', 'assets', 'images', 'logo.png'),
        os.path.join(project_root, 'public', 'assets', 'images', 'logo-dark.png'),
        os.path.join(project_root, 'public', 'logo.png'),
        os.path.abspath('public/assets/images/logo-icon.png'),
        os.path.abspath('public/assets/images/soryouth-logo.png'),
        os.path.abspath('public/assets/images/logo.png'),
    ]
    found_logo = None
    for p in possible_logo_paths:
        if os.path.exists(p):
            found_logo = p
            break

    logo_html = ""
    if found_logo:
        try:
            shutil.copyfile(found_logo, logo_dest_path)
            logo_html = f'<img src="{logo_filename}" style="height: 76px; max-width: 220px; object-fit: contain; margin-right: 25px;" />'
        except Exception as ex:
            print(f"Error copying logo for Chromium rendering: {ex}")
            logo_html = ""

    html = f'''
    <html>
    <head>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        ::-webkit-scrollbar {{
            display: none;
        }}
        body {{
            font-family: 'Segoe UI', Calibri, Arial, sans-serif;
            background: #ffffff;
            width: 840px;
            height: 1188px;
            padding: 45px 50px;
            margin: 0;
            overflow: hidden;
            color: #0B3B60;
            display: flex;
            flex-direction: column;
        }}
        .header-container {{
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 0px;
        }}
        .title {{
            font-family: 'Georgia', 'Cambria', 'Times New Roman', serif;
            font-size: 42px;
            font-weight: 700;
            color: #0F3B66;
            letter-spacing: 0;
            line-height: 1;
        }}
        table {{
            width: 100%;
            height: 980px;
            border-collapse: collapse;
            border: 2.5px solid #0080C0;
            font-size: 13.5px;
        }}
        th {{
            background-color: #1B4D75;
            color: #ffffff;
            font-weight: 700;
            font-size: 15px;
            padding: 16px 12px;
            text-align: center;
            border: 1.5px solid #0080C0;
        }}
        td {{
            padding: 14px 14px;
            border: 1.5px solid #0080C0;
            background-color: #EAF4FC;
            color: #0B3B60;
            vertical-align: middle;
            font-size: 13.5px;
            line-height: 1.45;
        }}
        .component-name {{
            font-weight: 700;
            color: #0B3B60;
        }}
        .center-col {{
            text-align: center;
            white-space: nowrap;
        }}
    </style>
    </head>
    <body>
        <div class="header-container">
            {logo_html}
            <div class="title">Balance of System</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 18%;">Component</th>
                    <th style="width: 22%;">Details</th>
                    <th style="width: 15%;">Qty</th>
                    <th style="width: 45%;">Specifications</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="component-name">Solar Modules</td>
                    <td>PV Solar Module</td>
                    <td class="center-col">{module_qty}</td>
                    <td>{module_spec}</td>
                </tr>
                <tr>
                    <td class="component-name">Inverter</td>
                    <td>{inverter_spec}</td>
                    <td class="center-col">{inverter_qty_nos}</td>
                    <td>{inverter_spec}</td>
                </tr>
                <tr>
                    <td class="component-name">Mounting Structure</td>
                    <td>RCC Rooftop</td>
                    <td class="center-col">1 Lot</td>
                    <td>GI Sqaure Pipe for Columns & Rafter/Strut Channel for Panel Mounting 15-18ft</td>
                </tr>
                <tr>
                    <td class="component-name">DC Cable</td>
                    <td>4 sq.mm</td>
                    <td class="center-col">As per design</td>
                    <td>Polycab 1.1 kV Standard EN 50618 / IEC 62930 UV Resistant - Yes</td>
                </tr>
                <tr>
                    <td class="component-name">AC Cable</td>
                    <td>As per Design</td>
                    <td class="center-col">As per design</td>
                    <td>XLPE Insulated Armed Polycab Voltage Rating 1.1 kV Standard - IS 7098</td>
                </tr>
                <tr>
                    <td class="component-name">DCDB</td>
                    <td>As per design</td>
                    <td class="center-col">{dcdb_qty_nos}</td>
                    <td>DC Isolator, DC SPD Type-II, String Fuses Enclosure - IP65 Weatherproof</td>
                </tr>
                <tr>
                    <td class="component-name">ACDB</td>
                    <td>As per design</td>
                    <td class="center-col">{acdb_qty_nos}</td>
                    <td>MCCB/MCB, AC SPD Type-II Enclosure - IP65 Weatherproof</td>
                </tr>
                <tr>
                    <td class="component-name">Earthing Kit</td>
                    <td>Chemical Earthing</td>
                    <td class="center-col">{earthing_kit_qty_nos}</td>
                    <td>Electrode Size - 17.2 mm Copper Bonded / GI Electrode Earth Resistance less than 5 Ohms Compliance IS 3043</td>
                </tr>
                <tr>
                    <td class="component-name">Lightning Arrester</td>
                    <td>Standard</td>
                    <td class="center-col">{la_kit_qty_nos}</td>
                    <td>IS/IEC Standards</td>
                </tr>
                <tr>
                    <td class="component-name">Connectors</td>
                    <td>MC4 compatible</td>
                    <td class="center-col">As required</td>
                    <td>1500 V DC Protection Class - IP68</td>
                </tr>
                <tr>
                    <td class="component-name">Monitoring</td>
                    <td>RMS App-based</td>
                    <td class="center-col">1 Set</td>
                    <td>Real-Time Generation, Fault Alerts, Historical Data Analysis</td>
                </tr>
                <tr>
                    <td class="component-name">Tags</td>
                    <td>Aluminum Engraved</td>
                    <td class="center-col">1 Set</td>
                    <td>Aluminum Engraved Identification Tags</td>
                </tr>
                <tr>
                    <td class="component-name">Fire Extinguishers</td>
                    <td>As per compliance</td>
                    <td class="center-col">1 Set</td>
                    <td>As per MNRE / Electrical Compliance Requirements</td>
                </tr>
            </tbody>
        </table>
    </body>
    </html>
    '''

    hti = Html2Image(size=(840, 1188), custom_flags=['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=3'])
    out_dir = tempfile.gettempdir()
    hti.output_path = out_dir
    hti.temp_path = out_dir

    filename = f'balance_of_system_{uuid.uuid4().hex}.png'
    temp_path = os.path.join(out_dir, filename)
    
    try:
        hti.screenshot(html_str=html, save_as=filename)
        if os.path.exists(temp_path):
            with open(temp_path, 'rb') as f:
                return temp_path, f.read()
    except Exception as e:
        print(f"Error generating Balance of System PNG: {e}")
    return None, None


def create_native_balance_of_system_subdoc(doc, context):
    try:
        subdoc = doc.new_subdoc()
        add_native_balance_of_system_table(subdoc, context)
        return subdoc
    except Exception:
        return None


def create_balance_of_system_page(doc, context, target_width):
    path, blob = generate_balance_of_system_png(context)
    if path and os.path.exists(path):
        return InlineImage(doc, path, width=target_width)
    return None


def create_capex_evaluation_sheet(doc, context, target_width):
    """
    Generates a print-quality HTML Evaluation Sheet and securely renders it into 
    an ultra-high-resolution Native A4 image using Chromium.
    """
    name       = str(context.get('name', 'N/A'))
    location   = str(context.get('location', 'N/A'))
    capacity   = safe_float(context.get('capacity'))
    rate_pw    = safe_float(context.get('rate_per_watt'))
    cost_pkw   = rate_pw * 1000
    base_amt   = safe_float(context.get('base_amount'), cost_pkw * capacity)
    final_amt  = safe_float(context.get('final_amount'), safe_float(context.get('total_project_cost_inc_gst'), base_amt * 1.09))
    gst_amt    = max(0.0, final_amt - base_amt)
    gst_pct    = (gst_amt / base_amt * 100) if base_amt > 0 else 9.0
    unit_rate  = safe_float(context.get('unit_rate'), safe_float(context.get('grid_tariff_per_unit')))
    subsidy    = safe_float(context.get('subsidy_amount'))
    gen_yr     = safe_float(context.get('generation_per_year'), capacity * 4 * 345)
    savings_yr = safe_float(context.get('savings_per_year'), gen_yr * unit_rate)

    client_type = str(context.get('client_type', context.get('clientType', 'Other'))).strip().lower()
    unit_rate_val = safe_float(context.get('unit_rate'), safe_float(context.get('grid_tariff_per_unit')))
    is_business = ('commercial' in client_type) or ('industrial' in client_type) or ('industr' in client_type) or ('industry' in client_type) or ('factory' in client_type) or ('business' in client_type) or ('corporate' in client_type) or (unit_rate_val <= 12 and unit_rate_val > 0 and 'housing' not in client_type and 'bungalow' not in client_type and 'individual' not in client_type)

    if is_business:
        ad1_val = safe_float(context.get('ad_benefit_year1'), 0.0)
        ad1 = ad1_val if ad1_val > 0 else (base_amt * 0.40 * 0.25)
        
        ad2_val = safe_float(context.get('ad_benefit_year2'), 0.0)
        wdv1 = base_amt - (base_amt * 0.40)
        ad2 = ad2_val if ad2_val > 0 else (wdv1 * 0.80 * 0.25)
        
        ad3_val = safe_float(context.get('ad_benefit_year3'), 0.0)
        wdv2 = wdv1 - (wdv1 * 0.80)
        ad3 = ad3_val if ad3_val > 0 else (wdv2 * 0.80 * 0.25)
        
        total_ad_val = safe_float(context.get('total_ad_benefit'), 0.0)
        total_ad = total_ad_val if total_ad_val > 0 else (ad1 + ad2 + ad3)
    else:
        ad1 = 0.0
        ad2 = 0.0
        ad3 = 0.0
        total_ad = 0.0

    om_pkw   = safe_float(context.get('om_cost_per_kw'), 750)
    om_base  = safe_float(context.get('total_om_cost'), capacity * om_pkw)
    
    net_inv = final_amt - subsidy - total_ad
    roi_years = safe_float(context.get('roi_in_years'), net_inv / savings_yr if savings_yr > 0 else 0)

    html = f'''
    <html>
    <head>
    <style>
        * {{
            box-sizing: border-box;
        }}
        ::-webkit-scrollbar {{
            display: none;
        }}
        body {{
            font-family: 'Segoe UI', Calibri, sans-serif;
            background: white;
            padding: 10px 20px;
            width: 840px;
            height: 1188px;
            margin: 0;
            overflow: hidden;
            color: #000;
        }}
        h2 {{
            text-align: center;
            color: #002060;
            font-style: italic;
            font-weight: bold;
            font-size: 24px;
            margin-top: 10px;
            margin-bottom: 15px;
            letter-spacing: 0.5px;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 15px;
            font-size: 11px;
            border: 1px solid #222;
        }}
        th, td {{
            border: 1px solid #222;
            padding: 3px 5px;
        }}
        th {{
            background-color: #002060;
            color: white;
            text-align: center;
            font-weight: bold;
        }}
        .table-title {{
            background-color: #002060 !important;
            color: white !important;
            text-align: center !important;
            font-weight: bold !important;
            padding: 4px;
            font-size: 11.5px;
            letter-spacing: 0.3px;
        }}
        .green-row td {{
            background-color: #92D050;
            font-weight: bold;
        }}
        .blue-row td {{
            background-color: #DCE6F1;
        }}
        .white-row td {{
            background-color: #FFFFFF;
        }}
        .col-layout {{
            display: flex;
            justify-content: space-between;
            gap: 15px;
        }}
        .left-col, .right-col {{
            width: 50%;
        }}
        .val-col {{ text-align: right; }}
        .label-col {{ text-align: left; font-weight: 500; }}
        
        .arrows-section {{
            text-align: center;
            margin: 5px 0 10px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            color: #002060;
            font-weight: bold;
            font-size: 14px;
        }}
        .arrow {{
            font-size: 26px;
            line-height: 1;
        }}
        
        .proj-table th {{
            font-size: 9.5px;
            padding: 3px;
        }}
        .proj-table td {{
            font-size: 9.5px;
            padding: 2.5px 4px;
        }}
        .notes {{
            font-size: 9.5px;
            color: #333;
            margin-top: 10px;
            line-height: 1.3;
        }}
        ul {{
            margin: 3px 0 0 15px;
            padding: 0;
        }}
    </style>
    </head>
    <body>
        <h2>Evaluation Sheet for Capex Model</h2>
        
        <div class="col-layout">
            <div class="left-col">
                <!-- Project Specification -->
                <table>
                    <tr><td colspan="3" class="table-title">Project Specification</td></tr>
                    <tr class="blue-row"><td class="label-col">Client Name</td><td class="val-col" colspan="2">{name}</td></tr>
                    <tr class="white-row"><td class="label-col">Project Location</td><td class="val-col" colspan="2">{location}</td></tr>
                    <tr class="blue-row"><td class="label-col">Project Size (KW)</td><td class="val-col" colspan="2">{capacity:,.2f}</td></tr>
                    <tr class="green-row"><td class="label-col">Cost per KW ex GST</td><td class="label-col">₹</td><td class="val-col">{cost_pkw:,.0f}</td></tr>
                    <tr class="blue-row"><td class="label-col">Project Cost ex GST</td><td class="label-col">₹</td><td class="val-col">{base_amt:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">GST @ {gst_pct:.1f}%</td><td class="label-col">₹</td><td class="val-col">{gst_amt:,.2f}</td></tr>
                    <tr class="green-row"><td class="label-col">Total Project Cost inc GST</td><td class="label-col">₹</td><td class="val-col">{final_amt:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">Client's Current Grid Tariff /Unit</td><td class="label-col">₹</td><td class="val-col">{unit_rate:,.2f}</td></tr>
                </table>
                
                <!-- Plant Performance -->
                <table>
                    <tr><td colspan="3" class="table-title">Plant Performance</td></tr>
                    <tr class="blue-row"><td class="label-col">Average Annual Generation (KW)</td><td class="val-col" colspan="2">{gen_yr:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">Average Monthly Generation (KW)</td><td class="val-col" colspan="2">{gen_yr / 12:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">Estimated Year-on-Year degradation</td><td class="val-col" colspan="2">0.70 - 0.80%</td></tr>
                </table>
                
                <!-- O&M Cost -->
                <table>
                    <tr><td colspan="3" class="table-title">O&M Cost</td></tr>
                    <tr class="blue-row"><td class="label-col">Cost per KW of maintenance</td><td class="label-col">₹</td><td class="val-col">{om_pkw:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">Total Cost per year</td><td class="label-col">₹</td><td class="val-col">{om_base:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">Yearly escalation in O&M Cost</td><td class="val-col" colspan="2">3.00%</td></tr>
                </table>
            </div>
            
            <div class="right-col">
                <!-- AD Benefits -->
                <table>
                    <tr><td colspan="3" class="table-title">Accelerated Depreciation Benefits</td></tr>
                    <tr class="blue-row"><td class="label-col">1st year - 25% tax savings on 40% depreciation</td><td class="label-col">₹</td><td class="val-col">{ad1:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">2nd year - 25% tax savings on 40% depreciation</td><td class="label-col">₹</td><td class="val-col">{ad2:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">3rd year - 25% tax savings on 20% depreciation</td><td class="label-col">₹</td><td class="val-col">{ad3:,.2f}</td></tr>
                    <tr class="white-row" style="font-weight:bold"><td class="label-col">Total</td><td class="label-col">₹</td><td class="val-col">{total_ad:,.2f}</td></tr>
                </table>
                
                <!-- ROI Calculation -->
                <table>
                    <tr><td colspan="3" class="table-title">Return On Investment (ROI) Calculation</td></tr>
                    <tr class="white-row"><td class="label-col">Project Cost ex GST</td><td class="label-col">₹</td><td class="val-col">{base_amt:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">Accelerated Depreciation Benefits</td><td class="label-col">₹</td><td class="val-col">{total_ad:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">Cost Via Grid</td><td class="label-col">₹</td><td class="val-col">{savings_yr * 25:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">ROI in Years</td><td class="val-col" colspan="2" style="text-align:right;">{roi_years:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">Monthly Payments</td><td class="label-col">₹</td><td class="val-col">-</td></tr>
                    <tr class="blue-row"><td class="label-col">Total Plant cost inc Interest</td><td class="label-col">₹</td><td class="val-col">-</td></tr>
                    <tr class="white-row" style="font-weight:bold"><td class="label-col">subsidy</td><td class="label-col">₹</td><td class="val-col">{subsidy:,.2f}</td></tr>
                </table>
            </div>
        </div>
        
        <div class="arrows-section">
            <div class="arrow">⬇</div>
            <div>Savings Projection</div>
            <div class="arrow">⬇</div>
        </div>
        
        <table class="proj-table">
            <tr>
                <th>Period</th>
                <th>Unit<br/>Generation</th>
                <th>Cost via<br/>Grid</th>
                <th>Solar Plant<br/>EMIs</th>
                <th>O&M Cost</th>
                <th>GSC<br/>Charges</th>
                <th>AD Benefit</th>
                <th>Savings via<br/>Solar</th>
            </tr>
    '''
    
    evaluation_sheet = context.get('evaluationSheet')
    yr_data = []
    sum_gen, sum_grid, sum_om, sum_gsc, sum_ad, sum_sav = 0, 0, 0, 0, 0, 0
    
    if evaluation_sheet and isinstance(evaluation_sheet, list) and len(evaluation_sheet) > 0:
        for row in evaluation_sheet:
            y = int(row.get('year', 0))
            gen = float(row.get('generation', 0))
            grid = float(row.get('gridCost', 0))
            om = float(row.get('omCost', 0))
            gsc = float(row.get('gscCharges', round(gen * 1.96, 2)))
            row_ad = float(row.get('adBenefit', 0))
            if is_business:
                ad = row_ad if row_ad > 0 else ([ad1, ad2, ad3][y - 1] if y <= 3 else 0.0)
            else:
                ad = 0.0
            sav = (grid + ad - om - gsc)
            yr_data.append((y, gen, grid, om, gsc, ad, sav))
    else:
        for y in range(1, 26):
            gen  = gen_yr * (0.994 ** (y - 1))
            grid = gen * unit_rate
            om   = 0.0 if y == 1 else om_base * (1.03 ** (y - 2))
            gsc  = gen * 1.96
            ad_val = ([ad1, ad2, ad3][y - 1] if y <= 3 else 0.0) if is_business else 0.0
            sav  = (grid + ad_val - om - gsc)
            yr_data.append((y, gen, grid, om, gsc, ad_val, sav))
            
    for r in yr_data:
        y, gen, grid, om, gsc, ad, sav = r
        sum_gen += gen
        sum_grid += grid
        sum_om += om
        sum_gsc += gsc
        sum_ad += ad
        sum_sav += sav
        
        bg_class = "blue-row" if (y - 1) % 2 == 0 else "white-row"
        
        om_str = f"₹ {om:,.2f}" if om > 0 else "₹ -"
        gsc_str = f"₹ {gsc:,.2f}" if gsc > 0 else "₹ -"
        ad_str = f"₹ {ad:,.2f}" if ad > 0 else "₹ -"
        
        html += f'''
            <tr class="{bg_class}">
                <td style="text-align:center">Year {y}</td>
                <td class="val-col">{gen:,.2f}</td>
                <td class="val-col">₹ {grid:,.2f}</td>
                <td class="val-col">₹ -</td>
                <td class="val-col">{om_str}</td>
                <td class="val-col">{gsc_str}</td>
                <td class="val-col">{ad_str}</td>
                <td class="val-col" style="font-weight:500;">₹ {sav:,.2f}</td>
            </tr>
        '''
        
    html += f'''
            <tr style="background-color: #002060; color: white;">
                <td class="table-title">Total over {len(yr_data)} years</td>
                <td class="table-title val-col">{sum_gen:,.3f}</td>
                <td class="table-title val-col">₹ {sum_grid:,.2f}</td>
                <td class="table-title val-col">₹ -</td>
                <td class="table-title val-col">₹ {sum_om:,.2f}</td>
                <td class="table-title val-col">₹ {sum_gsc:,.2f}</td>
                <td class="table-title val-col">₹ {sum_ad:,.2f}</td>
                <td class="table-title val-col">₹ {sum_sav:,.2f}</td>
            </tr>
        </table>
        
        <div class="notes">
            <u>The estimates provided in the above table are subject to the following conditions:</u>
            <ul>
                <li>The generation numbers are estimated as per current weather data and will change as per actual weather conditions.</li>
                <li>A standard generation reduction of 0.60% year-on-year is applied for further accuracy.</li>
                <li>The savings shown are based on continuous consumption of the generated power by the client.</li>
                <li>Any change in government net-metering policy or otherwise may affect the savings, and are out of our control.</li>
                <li>Any O&M cost incurred during the plant life will be extra, which isn't calculated in the table.</li>
                <li>Furthermore, any unexpected damage due to natural disaster is not factored in the calculations.</li>
            </ul>
        </div>
    </body>
    </html>
    '''
    
    # Native 3x rendering utilizing device scale factor for perfect 300 DPI A4 mapping
    hti = Html2Image(size=(840, 1188), custom_flags=['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=3'])
    
    if platform.system() == 'Linux':
        out_dir = os.path.expanduser('~/hti_tmp')
        os.makedirs(out_dir, exist_ok=True)
        hti.output_path = out_dir
        hti.temp_path = out_dir
    else:
        hti.output_path = tempfile.gettempdir()
        hti.temp_path = tempfile.gettempdir()

        
    filename = f'capex_{uuid.uuid4().hex}.png'
    temp_path = os.path.join(hti.output_path, filename)
    
    try:
        hti.screenshot(html_str=html, save_as=filename)
        if os.path.exists(temp_path):
            return InlineImage(doc, temp_path, width=target_width)
        else:
            print(f"Warning: html2image failed to create screenshot at {temp_path}.")
            return None
    except Exception as e:
        print(f"Error generating capex sheet screenshot: {e}")
        return None


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
    temp_dir = tempfile.mkdtemp()
    
    try:
        os.environ['MPLCONFIGDIR'] = temp_dir
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "Invalid JSON payload"}), 400
        
        template_full_path = payload.get('template_path')
        context = payload.get('data')
        
        if not template_full_path or not context:
            return jsonify({"error": "Missing 'template_path' or 'data' in payload"}), 400
        if not os.path.exists(template_full_path):
            return jsonify({"error": "Template not found at provided path"}), 404
        
        doc = DocxTemplate(template_full_path)
        doc.init_docx()

        raw_context = dict(context) if isinstance(context, dict) else {}
        raw_context.update({
            'name':               str(context.get('name', 'N/A')),
            'location':           str(context.get('location', 'N/A')),
            'capacity':           safe_float(context.get('capacity')),
            'rate_per_watt':      safe_float(context.get('rate_per_watt')),
            'base_amount':        safe_float(context.get('base_amount')),
            'final_amount':       safe_float(context.get('final_amount')),
            'cgst_amount':        safe_float(context.get('cgst_amount')),
            'sgst_amount':        safe_float(context.get('sgst_amount')),
            'subsidy_amount':     safe_float(context.get('subsidy_amount')),
            'central_subsidy_amount': safe_float(context.get('central_subsidy_amount'), safe_float(context.get('subsidy_amount'))),
            'additional_subsidy_benefits': safe_float(context.get('additional_subsidy_benefits'), safe_float(context.get('additional_subsidy'))),
            'additional_subsidy': safe_float(context.get('additional_subsidy'), safe_float(context.get('additional_subsidy_benefits'))),
            'total_subsidy_amount': safe_float(context.get('total_subsidy_amount')),
            'unit_rate':          safe_float(context.get('unit_rate')),
            'grid_tariff_per_unit': safe_float(context.get('unit_rate')),
            'generation_per_year':  safe_float(context.get('generation_per_year')),
            'savings_per_year':     safe_float(context.get('savings_per_year')),
            'evaluationSheet':    context.get('evaluationSheet'),
            'ad_benefit_year1':   context.get('ad_benefit_year1'),
            'ad_benefit_year2':   context.get('ad_benefit_year2'),
            'ad_benefit_year3':   context.get('ad_benefit_year3'),
            'total_ad_benefit':   context.get('total_ad_benefit'),
            'om_cost_per_kw':     context.get('om_cost_per_kw'),
            'total_om_cost':      context.get('total_om_cost'),
            'roi_in_years':       context.get('roi_in_years'),
        })

        capacity_kw = raw_context['capacity']
        unit_rate_val = raw_context['unit_rate']

        try:
            undeclared = doc.get_undeclared_template_variables()
        except Exception:
            undeclared = set()
            
        # Dynamically evaluate the maximum printable width for responsive rendering
        max_printable_width = get_printable_width(doc)

        # Ensure render context has all raw_context values
        context.update(raw_context)

        # -------------------------------------------------------------
        # NEW ARCHITECTURE: Render combined page if requested
        if 'combined_charts_page' in undeclared:
            combined_page_image = create_combined_charts_page(doc, capacity_kw, unit_rate_val, max_printable_width)
            if combined_page_image:
                context['combined_charts_page'] = combined_page_image

        # Backward compatibility for old placeholders
        if 'monthly_generation_chart' in undeclared:
            monthly_chart_image = create_monthly_generation_chart(doc, capacity_kw, max_printable_width)
            if monthly_chart_image:
                context['monthly_generation_chart'] = monthly_chart_image
        
        if 'yearly_savings_chart' in undeclared:
            yearly_savings_chart_image = create_yearly_savings_chart(doc, capacity_kw, unit_rate_val, max_printable_width)
            if yearly_savings_chart_image:
                context['yearly_savings_chart'] = yearly_savings_chart_image
        # -------------------------------------------------------------
        
        if 'capex_evaluation_sheet' in undeclared:
            capex_sheet_image = create_capex_evaluation_sheet(doc, raw_context, max_printable_width)
            if capex_sheet_image:
                context['capex_evaluation_sheet'] = capex_sheet_image
        
        bos_placeholders = ['balance_of_system', 'balance_of_system_page', 'balance_of_system_table', 'bos_table', 'balance_system', 'bos']
        bos_rendered = False
        
        bos_png_path, bos_png_bytes = generate_balance_of_system_png(raw_context)

        # 1. If template contains explicit BOS placeholders (e.g. {{balance_of_system}}), inject InlineImage
        if bos_png_path and os.path.exists(bos_png_path):
            bos_inline = InlineImage(doc, bos_png_path, width=max_printable_width)
            for key in bos_placeholders:
                if key in undeclared:
                    context[key] = bos_inline
                    bos_rendered = True

        # 2. Overwrite static template image ONLY IF explicit placeholder was NOT used
        if not bos_rendered and bos_png_bytes:
            for rel in doc.part.rels.values():
                ref_lower = str(rel.target_ref).lower()
                if 'image6.png' in ref_lower or 'image6.jpeg' in ref_lower or 'image6' in ref_lower:
                    try:
                        rel.target_part._blob = bos_png_bytes
                        bos_rendered = True
                        print(f"Successfully replaced static template image {rel.target_ref} with dynamic Balance of System image!")
                        break
                    except Exception as ex:
                        print(f"Error replacing image blob {rel.target_ref}: {ex}")

        doc.render(context)
        temp_docx_path = os.path.join(temp_dir, 'output.docx')
        doc.save(temp_docx_path)

        # 3. If neither placeholder nor static template image was present, append native table at end
        if not bos_rendered:
            try:
                rendered_doc = docx.Document(temp_docx_path)
                rendered_doc.add_page_break()
                add_native_balance_of_system_table(rendered_doc, raw_context)
                rendered_doc.save(temp_docx_path)
            except Exception as ex:
                print(f"Auto-append BOS table error: {ex}")
        
        temp_pdf_path = os.path.join(temp_dir, 'output.pdf')
        
        try:
            if platform.system() == 'Windows':
                pythoncom.CoInitialize()
                convert_to_pdf(temp_docx_path, temp_pdf_path)
            else:
                cmd = ['soffice', '--headless', '--convert-to', 'pdf', '--outdir', temp_dir, temp_docx_path]
                subprocess.run(cmd, check=True)
        except Exception as e:
            return jsonify({"error": f"PDF conversion failed. Error: {e}"}), 500
        finally:
            if platform.system() == 'Windows' and pythoncom:
                pythoncom.CoUninitialize()

        if not os.path.exists(temp_pdf_path):
            return jsonify({"error": "PDF conversion failed. Output file not found."}), 500

        with open(temp_docx_path, 'rb') as f_docx, open(temp_pdf_path, 'rb') as f_pdf:
            docx_buffer = f_docx.read()
            pdf_buffer = f_pdf.read()

        docx_b64 = base64.b64encode(docx_buffer).decode('utf-8')
        pdf_b64  = base64.b64encode(pdf_buffer).decode('utf-8')
        
        return jsonify({
            "success":  True,
            "pdf_b64":  pdf_b64,
            "docx_b64": docx_b64
        })

    except Exception as e:
        import traceback
        print(f"An error occurred: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Python service error: {str(e)}"}), 500
    finally:
        if original_mplconfigdir is not None:
            os.environ['MPLCONFIGDIR'] = original_mplconfigdir
        elif 'MPLCONFIGDIR' in os.environ:
            del os.environ['MPLCONFIGDIR']
        
        # shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
