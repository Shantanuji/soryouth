
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
from matplotlib.patches import Rectangle

from flask import Flask, request, jsonify
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Inches
import docx # From python-docx
if platform.system() == 'Windows':
    import pythoncom
    from docx2pdf import convert as convert_to_pdf
else:
    pythoncom = None
    convert_to_pdf = None



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




from docxtpl import InlineImage
from docx.shared import Inches
from html2image import Html2Image
import tempfile
import os

def create_capex_evaluation_sheet(doc, context):
    def sf(key, default=0):
        v = context.get(key, default)
        if v is None:
            return float(default)
        try:
            return float(str(v).replace(',', '').replace('₹', '').replace('%', '').strip())
        except (ValueError, TypeError):
            return float(default)

    name       = str(context.get('name', 'N/A'))
    location   = str(context.get('location', 'N/A'))
    capacity   = sf('capacity')
    rate_pw    = sf('rate_per_watt')
    cost_pkw   = rate_pw * 1000
    base_amt   = sf('base_amount') or (cost_pkw * capacity)
    final_amt  = sf('final_amount') or sf('total_project_cost_inc_gst') or (base_amt * 1.09)
    gst_amt    = max(0.0, final_amt - base_amt)
    gst_pct    = (gst_amt / base_amt * 100) if base_amt > 0 else 9.0
    unit_rate  = sf('unit_rate') or sf('grid_tariff_per_unit')
    subsidy    = sf('subsidy_amount')
    gen_yr     = sf('generation_per_year') or (capacity * 4 * 345)
    savings_yr = sf('savings_per_year') or (gen_yr * unit_rate)

    ad1 = base_amt * 0.40 * 0.25
    ad2 = base_amt * 0.60 * 0.60 * 0.25
    ad3 = base_amt * 0.60 * 0.40 * 0.675 * 0.25
    total_ad = ad1 + ad2 + ad3
    om_pkw  = 750
    om_base = capacity * om_pkw
    net_inv   = final_amt - subsidy - total_ad
    roi_years = net_inv / savings_yr if savings_yr > 0 else 0

    html = f'''
    <html>
    <head>
    <style>
        body {{
            font-family: Calibri, sans-serif;
            background: white;
            padding: 20px;
            width: 800px; /* Fixed width for exact rendering */
            margin: 0 auto;
        }}
        h2 {{
            text-align: center;
            color: #002060;
            font-style: italic;
            font-weight: bold;
            font-size: 26px;
            margin-bottom: 20px;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
            font-size: 11px;
            border: 1px solid #000;
        }}
        th, td {{
            border: 1px solid #000;
            padding: 4px 6px;
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
        }}
        .left-col {{
            width: 48%;
        }}
        .right-col {{
            width: 48%;
        }}
        .val-col {{ text-align: right; }}
        .label-col {{ text-align: left; }}
        
        .arrows-section {{
            text-align: center;
            margin: -5px 0 15px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            color: #002060;
            font-weight: bold;
        }}
        .arrow {{
            font-size: 40px;
            line-height: 1;
        }}
        
        .proj-table th {{
            font-size: 10px;
            padding: 2px 4px;
        }}
        .proj-table td {{
            font-size: 10px;
            padding: 2px 4px;
        }}
        .notes {{
            font-size: 10px;
            color: #444;
            margin-top: 10px;
        }}
        ul {{
            margin: 5px 0 0 20px;
            padding: 0;
        }}
    </style>
    </head>
    <body>
        <h2>Evaluation Sheet for Capex Model</h2>
        
        <div class="col-layout">
            <div class="left-col">
                <!-- Project Spec -->
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
                
                <!-- Plant Perf -->
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
                <!-- AD -->
                <table>
                    <tr><td colspan="3" class="table-title">Accelerated Depreciation Benefits</td></tr>
                    <tr class="blue-row"><td class="label-col">1st year - 25% tax savings on 40% depreciation</td><td class="label-col">₹</td><td class="val-col">{ad1:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">2nd year - 25% tax savings on 40% depreciation</td><td class="label-col">₹</td><td class="val-col">{ad2:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">3rd year - 25% tax savings on 20% depreciation</td><td class="label-col">₹</td><td class="val-col">{ad3:,.2f}</td></tr>
                    <tr class="white-row" style="font-weight:bold"><td class="label-col">Total</td><td class="label-col">₹</td><td class="val-col">{total_ad:,.2f}</td></tr>
                </table>
                
                <!-- ROI -->
                <table>
                    <tr><td colspan="3" class="table-title">Return On Investment (ROI) Calculation</td></tr>
                    <tr class="white-row"><td class="label-col">Project Cost ex GST</td><td class="label-col">₹</td><td class="val-col">{base_amt:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">Additional / Subsidy Benefits</td><td class="label-col">₹</td><td class="val-col">{subsidy:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">Cost Via Grid</td><td class="label-col">₹</td><td class="val-col">{savings_yr * 25:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">ROI in Years</td><td class="val-col" colspan="2">{roi_years:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">Monthly Payments</td><td class="label-col">₹</td><td class="val-col">-</td></tr>
                    <tr class="green-row"><td class="label-col">Total Plant cost inc Interest</td><td class="label-col">₹</td><td class="val-col">{net_inv:,.2f}</td></tr>
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
    
    yr_data = []
    for y in range(1, 26):
        gen  = gen_yr * (0.994 ** (y - 1))
        grid = gen * unit_rate
        om   = 0.0 if y == 1 else om_base * (1.03 ** (y - 2))
        ad   = [ad1, ad2, ad3][y - 1] if y <= 3 else 0.0
        sav  = grid + ad - om
        yr_data.append((y, gen, grid, om, ad, sav))
        
        bg_class = "blue-row" if (y - 1) % 2 == 0 else "white-row"
        
        om_str = f"₹ {om:,.2f}" if om > 0 else "₹ -"
        ad_str = f"₹ {ad:,.2f}" if ad > 0 else "₹ -"
        
        html += f'''
            <tr class="{bg_class}">
                <td style="text-align:center">Year {y}</td>
                <td class="val-col">{gen:,.2f}</td>
                <td class="val-col">₹ {grid:,.2f}</td>
                <td class="val-col">₹ -</td>
                <td class="val-col">{om_str}</td>
                <td class="val-col">₹ -</td>
                <td class="val-col">{ad_str}</td>
                <td class="val-col">₹ {sav:,.2f}</td>
            </tr>
        '''
        
    sum_gen = sum(r[1] for r in yr_data)
    sum_grid = sum(r[2] for r in yr_data)
    sum_om = sum(r[3] for r in yr_data)
    sum_ad = sum(r[4] for r in yr_data)
    sum_sav = sum(r[5] for r in yr_data)
    
    html += f'''
            <tr>
                <td class="table-title">Total over 25 years</td>
                <td class="table-title val-col">{sum_gen:,.3f}</td>
                <td class="table-title val-col">₹ {sum_grid:,.2f}</td>
                <td class="table-title val-col">₹ -</td>
                <td class="table-title val-col">₹ {sum_om:,.2f}</td>
                <td class="table-title val-col">₹ -</td>
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
    
    hti = Html2Image(size=(840, 1188))
    hti.output_path = tempfile.gettempdir()
    import uuid
    filename = f'capex_{uuid.uuid4().hex}.png'
    temp_path = os.path.join(hti.output_path, filename)
    try:
        hti.screenshot(html_str=html, save_as=filename)
        if os.path.exists(temp_path):
            img = InlineImage(doc, temp_path, width=Inches(6.5))
            return img
        else:
            print(f"Warning: html2image failed to create screenshot at {temp_path}. Chromium/Chrome might not be installed on the system.")
            return None
    except Exception as e:
        print(f"Error generating capex sheet screenshot: {e}")
        return None

def create_capex_evaluation_sheet(doc, context):
    def sf(key, default=0):
        v = context.get(key, default)
        if v is None:
            return float(default)
        try:
            return float(str(v).replace(',', '').replace('₹', '').replace('%', '').strip())
        except (ValueError, TypeError):
            return float(default)

    name       = str(context.get('name', 'N/A'))
    location   = str(context.get('location', 'N/A'))
    capacity   = sf('capacity')
    rate_pw    = sf('rate_per_watt')
    cost_pkw   = rate_pw * 1000
    base_amt   = sf('base_amount') or (cost_pkw * capacity)
    final_amt  = sf('final_amount') or sf('total_project_cost_inc_gst') or (base_amt * 1.09)
    gst_amt    = max(0.0, final_amt - base_amt)
    gst_pct    = (gst_amt / base_amt * 100) if base_amt > 0 else 9.0
    unit_rate  = sf('unit_rate') or sf('grid_tariff_per_unit')
    subsidy    = sf('subsidy_amount')
    gen_yr     = sf('generation_per_year') or (capacity * 4 * 345)
    savings_yr = sf('savings_per_year') or (gen_yr * unit_rate)

    ad1 = base_amt * 0.40 * 0.25
    ad2 = base_amt * 0.60 * 0.60 * 0.25
    ad3 = base_amt * 0.60 * 0.40 * 0.675 * 0.25
    total_ad = ad1 + ad2 + ad3
    om_pkw  = 750
    om_base = capacity * om_pkw
    net_inv   = final_amt - subsidy - total_ad
    roi_years = net_inv / savings_yr if savings_yr > 0 else 0

    html = f"""
    <html>
    <head>
    <style>
        body {{
            font-family: Calibri, sans-serif;
            background: white;
            padding: 20px;
            width: 800px;
            margin: 0 auto;
        }}
        h2 {{
            text-align: center;
            color: #002060;
            font-style: italic;
            font-weight: bold;
            font-size: 26px;
            margin-bottom: 20px;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
            font-size: 11px;
            border: 1px solid #000;
        }}
        th, td {{
            border: 1px solid #000;
            padding: 4px 6px;
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
        }}
        .left-col {{
            width: 48%;
        }}
        .right-col {{
            width: 48%;
        }}
        .val-col {{ text-align: right; }}
        .label-col {{ text-align: left; }}
        
        .arrows-section {{
            text-align: center;
            margin: -5px 0 15px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            color: #002060;
            font-weight: bold;
        }}
        .arrow {{
            font-size: 40px;
            line-height: 1;
        }}
        
        .proj-table th {{
            font-size: 10px;
            padding: 2px 4px;
        }}
        .proj-table td {{
            font-size: 10px;
            padding: 2px 4px;
        }}
        .notes {{
            font-size: 10px;
            color: #444;
            margin-top: 10px;
        }}
        ul {{
            margin: 5px 0 0 20px;
            padding: 0;
        }}
    </style>
    </head>
    <body>
        <h2>Evaluation Sheet for Capex Model</h2>
        
        <div class="col-layout">
            <div class="left-col">
                <!-- Project Spec -->
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
                
                <!-- Plant Perf -->
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
                <!-- AD -->
                <table>
                    <tr><td colspan="3" class="table-title">Accelerated Depreciation Benefits</td></tr>
                    <tr class="blue-row"><td class="label-col">1st year - 25% tax savings on 40% depreciation</td><td class="label-col">₹</td><td class="val-col">{ad1:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">2nd year - 25% tax savings on 40% depreciation</td><td class="label-col">₹</td><td class="val-col">{ad2:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">3rd year - 25% tax savings on 20% depreciation</td><td class="label-col">₹</td><td class="val-col">{ad3:,.2f}</td></tr>
                    <tr class="white-row" style="font-weight:bold"><td class="label-col">Total</td><td class="label-col">₹</td><td class="val-col">{total_ad:,.2f}</td></tr>
                </table>
                
                <!-- ROI -->
                <table>
                    <tr><td colspan="3" class="table-title">Return On Investment (ROI) Calculation</td></tr>
                    <tr class="white-row"><td class="label-col">Project Cost ex GST</td><td class="label-col">₹</td><td class="val-col">{base_amt:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">Additional / Subsidy Benefits</td><td class="label-col">₹</td><td class="val-col">{subsidy:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">Cost Via Grid</td><td class="label-col">₹</td><td class="val-col">{savings_yr * 25:,.2f}</td></tr>
                    <tr class="blue-row"><td class="label-col">ROI in Years</td><td class="val-col" colspan="2">{roi_years:,.2f}</td></tr>
                    <tr class="white-row"><td class="label-col">Monthly Payments</td><td class="label-col">₹</td><td class="val-col">-</td></tr>
                    <tr class="green-row"><td class="label-col">Total Plant cost inc Interest</td><td class="label-col">₹</td><td class="val-col">{net_inv:,.2f}</td></tr>
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
    """
    
    yr_data = []
    for y in range(1, 26):
        gen  = gen_yr * (0.994 ** (y - 1))
        grid = gen * unit_rate
        om   = 0.0 if y == 1 else om_base * (1.03 ** (y - 2))
        ad   = [ad1, ad2, ad3][y - 1] if y <= 3 else 0.0
        sav  = grid + ad - om
        yr_data.append((y, gen, grid, om, ad, sav))
        
        bg_class = "blue-row" if (y - 1) % 2 == 0 else "white-row"
        
        om_str = f"₹ {om:,.2f}" if om > 0 else "₹ -"
        ad_str = f"₹ {ad:,.2f}" if ad > 0 else "₹ -"
        
        html += f"""
            <tr class="{bg_class}">
                <td style="text-align:center">Year {y}</td>
                <td class="val-col">{gen:,.2f}</td>
                <td class="val-col">₹ {grid:,.2f}</td>
                <td class="val-col">₹ -</td>
                <td class="val-col">{om_str}</td>
                <td class="val-col">₹ -</td>
                <td class="val-col">{ad_str}</td>
                <td class="val-col">₹ {sav:,.2f}</td>
            </tr>
        """
        
    sum_gen = sum(r[1] for r in yr_data)
    sum_grid = sum(r[2] for r in yr_data)
    sum_om = sum(r[3] for r in yr_data)
    sum_ad = sum(r[4] for r in yr_data)
    sum_sav = sum(r[5] for r in yr_data)
    
    html += f"""
            <tr>
                <td class="table-title">Total over 25 years</td>
                <td class="table-title val-col">{sum_gen:,.3f}</td>
                <td class="table-title val-col">₹ {sum_grid:,.2f}</td>
                <td class="table-title val-col">₹ -</td>
                <td class="table-title val-col">₹ {sum_om:,.2f}</td>
                <td class="table-title val-col">₹ -</td>
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
    """
    
    hti = Html2Image(size=(840, 1188))
    hti.output_path = tempfile.gettempdir()
    import uuid
    filename = f'capex_{uuid.uuid4().hex}.png'
    temp_path = os.path.join(hti.output_path, filename)
    try:
        hti.screenshot(html_str=html, save_as=filename)
        if os.path.exists(temp_path):
            img = InlineImage(doc, temp_path, width=Inches(6.5))
            return img
        else:
            print(f"Warning: html2image failed to create screenshot at {temp_path}. Chromium/Chrome might not be installed on the system.")
            return None
    except Exception as e:
        print(f"Error generating capex sheet screenshot: {e}")
        return None

def format_indian(number, decimals=2):
    try:
        num_val = float(number)
    except (ValueError, TypeError):
        return str(number)
    s = f"{num_val:.{decimals}f}"
    parts = s.split('.')
    integer_part = parts[0]
    decimal_part = "." + parts[1] if len(parts) > 1 else ""
    
    sign = ""
    if integer_part.startswith('-'):
        sign = "-"
        integer_part = integer_part[1:]
        
    if len(integer_part) <= 3:
        return sign + integer_part + decimal_part
        
    last_three = integer_part[-3:]
    remaining = integer_part[:-3]
    
    groups = []
    while remaining:
        groups.append(remaining[-2:])
        remaining = remaining[:-2]
    groups.reverse()
    
    return sign + ",".join(groups) + "," + last_three + decimal_part



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
            doc.init_docx()
            
            def safe_float(val, default=0.0):
                if val is None:
                    return float(default)
                try:
                    return float(str(val).replace(',', '').replace('₹', '').replace('%', '').strip())
                except (ValueError, TypeError):
                    return float(default)

            raw_context = {
                'name':               str(context.get('name', 'N/A')),
                'location':           str(context.get('location', 'N/A')),
                'capacity':           safe_float(context.get('capacity')),
                'rate_per_watt':      safe_float(context.get('rate_per_watt')),
                'base_amount':        safe_float(context.get('base_amount')),
                'final_amount':       safe_float(context.get('final_amount')),
                'cgst_amount':        safe_float(context.get('cgst_amount')),
                'sgst_amount':        safe_float(context.get('sgst_amount')),
                'subsidy_amount':     safe_float(context.get('subsidy_amount')),
                'unit_rate':          safe_float(context.get('unit_rate')),
                'grid_tariff_per_unit': safe_float(context.get('unit_rate')),
                'generation_per_year':  safe_float(context.get('generation_per_year')),
                'savings_per_year':     safe_float(context.get('savings_per_year')),
            }

            capacity_kw   = raw_context['capacity']
            unit_rate_val = raw_context['unit_rate']

            try:
                undeclared = doc.get_undeclared_template_variables()
            except Exception:
                undeclared = set()

            if 'monthly_generation_chart' in undeclared:
                monthly_chart_image = create_monthly_generation_chart(doc, capacity_kw)
                if monthly_chart_image:
                    context['monthly_generation_chart'] = monthly_chart_image
            
            if 'yearly_savings_chart' in undeclared:
                yearly_savings_chart_image = create_yearly_savings_chart(doc, capacity_kw, unit_rate_val)
                if yearly_savings_chart_image:
                    context['yearly_savings_chart'] = yearly_savings_chart_image

            
            if 'capex_evaluation_sheet' in undeclared:
                capex_sheet_image = create_capex_evaluation_sheet(doc, raw_context)
                if capex_sheet_image:
                    context['capex_evaluation_sheet'] = capex_sheet_image
            doc.render(context)
            temp_docx_path = os.path.join(temp_dir, 'output.docx')
            doc.save(temp_docx_path)
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

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
