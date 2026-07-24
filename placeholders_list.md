# Soryouth CRM - Proposal Template Placeholders

Here is a complete list of all the placeholders you can use in your Word document templates and exactly what data they generate. 

When creating your Word template, type these exactly as shown (with the double curly braces). 

### 📊 Full Page & Chart Images (These generate images)
*(Make sure to put these on their own empty line in your Word document)*
- **`{{combined_charts_page}}`** : Generates a full A4 page image containing both the Monthly Generation bar chart and the 30-Year Savings line graph perfectly formatted.
- **`{{capex_evaluation_sheet}}`** : Generates the full detailed Capex Evaluation table with Project Specs, Plant Performance, O&M Cost, AD Benefits, ROI, and the 25-year projection table.
- **`{{balance_of_system}}`** (or `{{balance_of_system_page}}`, `{{bos_table}}`) : Generates the full detailed A4 Balance of System table page with Soryouth branding, exact component specs, quantities, and standards.
- **`{{monthly_generation_chart}}`** : Generates just the Monthly Energy Generation bar chart.
- **`{{yearly_savings_chart}}`** : Generates just the Projected Savings for 30 Years line graph.

---

### 👤 Basic Client & Proposal Info
- **`{{name}}`** : Client's name (e.g., John Doe)
- **`{{contact_person}}`** : Contact person's name
- **`{{email}}`** : Client's email address
- **`{{phone}}`** : Client's phone number
- **`{{location}}`** : Project location / address
- **`{{city_area}}`** : City Area
- **`{{client_type}}`** : Client type (e.g., Residential, Commercial)
- **`{{proposal_number}}`** : The unique Proposal Number (e.g., P-2026-12345)
- **`{{proposal_date}}`** : The date the proposal was created (e.g., 17 Jul, 2026)
- **`{{date_today}}`** : Today's current date
- **`{{created_by}}`** : Name of the CRM user who generated the proposal

### ⚙️ System Specifications
- **`{{capacity}}`** : Project Size in KW (e.g., 10)
- **`{{module_type}}`** : Solar Module Type (e.g., Monocrystalline)
- **`{{module_wattage}}`** : Solar Module Wattage (e.g., 550W)
- **`{{module_qty}}`** or **`{{moduleQty}}`** : Calculated Number of Solar Modules (Panels)
- **`{{module_spec}}`** or **`{{module_details}}`** : Solar Module Full Specification text (e.g. `Rayzon Solar Topcon Bifacial DCR 600 Wp`)
- **`{{dcr_status}}`** : DCR or Non-DCR
- **`{{inverter_rating}}`** : Inverter Rating
- **`{{inverter_qty}}`** or **`{{inverterQty}}`** : Quantity of Inverters
- **`{{inverter_spec}}`** or **`{{inverter_details}}`** : Inverter Specification text (e.g. `Growatt/Sungrow 8 kW`)
- **`{{inverter_kw}}`** : Inverter Rating formatted in kW (e.g. `8 kW`)
- **`{{required_space}}`** : Required Space calculated in sq. ft.
- **`{{la_kit_qty}}`** or **`{{la_kit_qty_nos}}`** : Lightning Arrestor Kit Qty (e.g. `1` or `1 Nos`)
- **`{{acdb_qty_nos}}`** : ACDB Box Qty formatted (e.g. `1 No`)
- **`{{dcdb_qty_nos}}`** : DCDB Box Qty formatted (e.g. `1 No`)
- **`{{acdb_dcdb_qty}}`** or **`{{acdb_dcdb_qty_nos}}`** : ACDB/DCDB Qty (e.g. `1` or `1 Nos`)
- **`{{earthing_kit_qty}}`** or **`{{earthing_kit_qty_nos}}`** : Earthing Kit Qty (e.g. `3` or `3 Nos`)

### 💰 Project Cost & Commercials
- **`{{subtotal}}`** or **`{{project_cost_ex_gst}}`** or **`{{base_amount}}`** : Base amount / Subtotal excluding GST
- **`{{cgst_amount}}`** : CGST amount (4.45%)
- **`{{sgst_amount}}`** : SGST amount (4.45%)
- **`{{gst_amount}}`** : Total GST amount (8.9%)
- **`{{total_project_cost_inc_gst}}`** or **`{{final_amount}}`** : Total Project Cost including GST
- **`{{subsidy_amount}}`** or **`{{central_subsidy_amount}}`** : Central Govt Subsidy amount
- **`{{additional_subsidy_benefits}}`** or **`{{additional_subsidy}}`** : Additional Subsidy / State Subsidy Benefits
- **`{{total_subsidy_amount}}`** : Total Subsidy Amount (Central + Additional)
- **`{{net_investment}}`** or **`{{net_amount_after_subsidy}}`** or **`{{netInvestment}}`** : Net Investment (Total Cost - Subsidies - AD Benefits)

### ☀️ Plant Performance & Savings
- **`{{grid_tariff_per_unit}}`** or **`{{unit_rate}}`** : Client's current grid tariff per unit
- **`{{annual_generation}}`** or **`{{generation_per_year}}`** : Total units generated per year
- **`{{monthly_generation}}`** : Average units generated per month
- **`{{generation_per_day}}`** : Average units generated per day
- **`{{degradation_rate}}`** : Always prints "0.70 - 0.80%"
- **`{{savings_per_year}}`** : Total savings per year in ₹

### 🔧 O&M (Operations & Maintenance) & AD Benefits
- **`{{om_cost_per_kw}}`** : O&M cost per KW
- **`{{total_om_cost}}`** : Total O&M cost per year
- **`{{om_escalation}}`** : Always prints "3%"
- **`{{ad_benefit_year1}}`** : Accelerated Depreciation Benefit Year 1
- **`{{ad_benefit_year2}}`** : Accelerated Depreciation Benefit Year 2
- **`{{ad_benefit_year3}}`** : Accelerated Depreciation Benefit Year 3
- **`{{total_ad_benefit}}`** : Total Accelerated Depreciation Benefit

### 📈 ROI Calculation
- **`{{project_cost_ex_gst_roi}}`** : Base amount (same as project_cost_ex_gst)
- **`{{additional_subsidy_benefits}}`** : Subsidy amount
- **`{{cost_via_grid}}`** : Total cost client would pay to grid over 25 years
- **`{{roi_in_years}}`** : Return on Investment in years (e.g., 3.25)
