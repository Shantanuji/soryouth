import re

with open('microservices/proposal_generator/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_html_logic = """
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
            return float(str(v).replace(',', '').replace('\u20b9', '').replace('%', '').strip())
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
    
    hti = Html2Image(size=(840, 1300))
    # use a temp file to avoid locking issues
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        temp_path = f.name
        
    hti.screenshot(html_str=html, save_as=temp_path)
    
    # insert image
    img = InlineImage(doc, temp_path, width=Inches(6.5))
    
    # optionally clean up temp_path later, or just leave it since it's temp
    return img
"""

start_idx = -1
end_idx = -1
lines = content.split('\n')
for i, line in enumerate(lines):
    if line.startswith('from docx.shared import Inches'):
        start_idx = i
    if line.startswith('@app.route'):
        if start_idx != -1 and i > start_idx:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    new_content = '\n'.join(lines[:start_idx]) + '\n' + new_html_logic + '\n\n' + '\n'.join(lines[end_idx:])
    with open('microservices/proposal_generator/main.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Updated to HTML2Image!')
else:
    print('Indices not found!')
