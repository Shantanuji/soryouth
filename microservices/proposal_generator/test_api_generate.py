import json
import base64
import requests

url = "http://127.0.0.1:5001/generate"
payload = {
    "template_path": "i:/saral infotech/Soryouth-CRM/Soryouth-CRM/scratch/downloaded_template.docx",
    "data": {
        "name": "Acme Solar Corp",
        "location": "Pune, Maharashtra",
        "capacity": 50.0,
        "rate_per_watt": 40.0,
        "base_amount": 2000000.0,
        "final_amount": 2180000.0,
        "unit_rate": 11.5,
        "client_type": "Industrial",
        "generation_per_year": 72000.0,
        "savings_per_year": 828000.0,
        "roi_in_years": 2.2,
        "proposalNumber": "PROP-TEST-002"
    }
}

try:
    resp = requests.post(url, json=payload)
    print("Status Code:", resp.status_code)
    data = resp.json()
    if data.get("success"):
        docx_bytes = base64.b64decode(data["docx_b64"])
        pdf_bytes = base64.b64decode(data["pdf_b64"])
        with open("api_test_output.docx", "wb") as f:
            f.write(docx_bytes)
        with open("api_test_output.pdf", "wb") as f:
            f.write(pdf_bytes)
        print("Successfully generated api_test_output.docx and api_test_output.pdf!")
    else:
        print("Error from Flask API:", data)
except Exception as e:
    print("Request failed:", e)
