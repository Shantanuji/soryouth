with open('microservices/proposal_generator/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace body CSS to add zoom
old_body = """        body {
            font-family: Calibri, sans-serif;
            background: white;
            padding: 20px;
            width: 800px; /* Fixed width for exact rendering */
            margin: 0 auto;
        }"""
new_body = """        body {
            font-family: Calibri, sans-serif;
            background: white;
            padding: 20px;
            width: 800px; /* Fixed width for exact rendering */
            margin: 0 auto;
            zoom: 3.0; /* 3x scale for ultra-high-resolution rendering */
        }"""
content = content.replace(old_body, new_body)

# Replace Html2Image size
old_size = "hti = Html2Image(size=(840, 1300))"
new_size = "hti = Html2Image(size=(2520, 3900))"
content = content.replace(old_size, new_size)

with open('microservices/proposal_generator/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched for ultra high quality!")
