from html2image import Html2Image
hti = Html2Image()
html = '<h1>Test HTML2Image</h1><div style="background:blue;width:100px;height:100px;"></div>'
hti.screenshot(html_str=html, save_as='test_hti.png')
print('Generated test_hti.png')
