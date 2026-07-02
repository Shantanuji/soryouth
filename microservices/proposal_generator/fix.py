import re
import os

with open('microservices/proposal_generator/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('def create_commercial_offer_table(doc, context):')
end_str = '            padding: 16px 20px;\n'
end_idx = content.find(end_str, start_idx) + len(end_str)

if start_idx != -1 and end_idx != -1:
    missing_generate_code = """
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

            doc.render(context)
            temp_docx_path = os.path.join(temp_dir, 'output.docx')
            doc.save(temp_docx_path)
            temp_pdf_path = os.path.join(temp_dir, 'output.pdf')
            
            try:
                pythoncom.CoInitialize()
"""
    new_content = content[:start_idx] + missing_generate_code + content[end_idx:]
    with open('microservices/proposal_generator/main.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("File fixed successfully.")
else:
    print("Could not find indices", start_idx, end_idx)
