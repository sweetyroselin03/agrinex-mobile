import os
import re

root = r'c:\Users\trasr\OneDrive\Desktop\AGRI NEW 12_5\mobile'
app_dir = os.path.join(root, 'app')

for r, d, fs in os.walk(app_dir):
    for f in fs:
        if f.endswith(('.tsx', '.ts')):
            path = os.path.join(r, f)
            rel_path = os.path.relpath(path, root)
            content = open(path, 'r', encoding='utf-8').read()
            imports = re.findall(r"from\s+['\"](.*?)['\"]", content)
            for imp in imports:
                if imp.startswith(('.', 'store', 'api', 'components', 'constants', 'utils')):
                    print(f"{rel_path} -> {imp}")
