import os

replacement = """                                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                                                  <div><span className="text-muted-foreground block mb-0.5">Surveyor</span> <span className="font-semibold">{survey.surveyorName || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Consumer Name</span> <span className="font-semibold">{survey.consumerName || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Category</span> <span className="font-semibold">{survey.consumerCategory || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Location</span> <span className="font-semibold">{survey.location || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Discom</span> <span className="font-semibold">{survey.discom || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Sanctioned Load</span> <span className="font-semibold">{survey.sanctionedLoad || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Load Type</span> <span className="font-semibold">{survey.consumerLoadType || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Meters</span> <span className="font-semibold">{survey.numberOfMeters || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Meter Phase</span> <span className="font-semibold">{survey.meterPhase || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Meter Rating</span> <span className="font-semibold">{survey.meterRating || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Monthly Bill</span> <span className="font-semibold">{survey.electricityAmount ? `₹${survey.electricityAmount}` : 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Roof Type</span> <span className="font-semibold">{survey.roofType || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Building Height</span> <span className="font-semibold">{survey.buildingHeight || 'N/A'}</span></div>
                                                  <div><span className="text-muted-foreground block mb-0.5">Shadow-Free Area</span> <span className="font-semibold">{survey.shadowFreeArea || 'N/A'}</span></div>
                                                  <div className="col-span-2 sm:col-span-4"><span className="text-muted-foreground block mb-0.5">Remark</span> <span className="font-semibold">{survey.remark || 'N/A'}</span></div>
                                              </div>"""

files = [
    'app/(app)/leads/[leadId]/page.tsx',
    'app/(app)/clients/[clientId]/page.tsx',
    'app/(app)/dropped-leads/[droppedId]/page.tsx'
]

for file_path in files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        import re
        
        # We need to replace the grid block
        pattern = re.compile(r'<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">.*?</div>', re.DOTALL)
        content = pattern.sub(replacement, content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")
    except Exception as e:
        print(f"Failed to update {file_path}: {e}")
