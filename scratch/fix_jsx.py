import os
import re

files = [
    'app/(app)/leads/[leadId]/page.tsx',
    'app/(app)/clients/[clientId]/page.tsx',
    'app/(app)/dropped-leads/[droppedId]/page.tsx'
]

for file_path in files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # We will use regex to find the duplicate/dangling block and remove it.
        # The bad block is exactly this:
        #                                               </div>
        #                                                   <div><span className="text-muted-foreground block mb-0.5">Category</span> <span className="font-semibold">{survey.consumerCategory}</span></div>
        #                                                   <div><span className="text-muted-foreground block mb-0.5">Roof Type</span> <span className="font-semibold">{survey.roofType}</span></div>
        #                                                   <div><span className="text-muted-foreground block mb-0.5">Shadow-Free</span> <span className="font-semibold">{survey.shadowFreeArea}</span></div>
        #                                               </div>
        # And we want to replace it with just:
        #                                               </div>
        
        pattern = re.compile(
            r'</div>\s*<div><span className="text-muted-foreground block mb-0\.5">Category</span> <span className="font-semibold">\{survey\.consumerCategory\}</span></div>\s*<div><span className="text-muted-foreground block mb-0\.5">Roof Type</span> <span className="font-semibold">\{survey\.roofType\}</span></div>\s*<div><span className="text-muted-foreground block mb-0\.5">Shadow-Free</span> <span className="font-semibold">\{survey\.shadowFreeArea\}</span></div>\s*</div>',
            re.MULTILINE
        )
        
        content = pattern.sub('</div>', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file_path}")
    except Exception as e:
        print(f"Failed to fix {file_path}: {e}")
