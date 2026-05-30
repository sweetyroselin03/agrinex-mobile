import os
import re

root_dir = r'c:\Users\trasr\OneDrive\Desktop\AGRI NEW 12_5\mobile'
app_dir = os.path.join(root_dir, 'app')

patterns = ['store', 'api', 'components', 'constants', 'utils']

def fix_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Calculate relative depth from 'mobile' folder
    rel_path = os.path.relpath(file_path, root_dir)
    depth = len(rel_path.split(os.sep)) - 1
    
    # Correct prefix based on depth
    # mobile/app/file.tsx -> depth 1 -> ../
    # mobile/app/(tabs)/file.tsx -> depth 2 -> ../../
    correct_prefix = '../' * depth
    
    for p in patterns:
        # Match from './store' or from 'store' or from '../../store' (if depth is wrong)
        regex = r"(from\s+['\"])(.*?)(" + p + r"/)?" + p # Match p even without slash
        
        # Actually, let's just match the whole string after from
        regex = r"(from\s+['\"])([^'\"]*?)(" + p + r"(/|['\"]))"
        
        def replace_fn(match):
            nonlocal modified
            current_prefix = match.group(2)
            # Find the part before the pattern p
            # e.g. in '../store/', match.group(2) is '../'
            if current_prefix != correct_prefix:
                print(f"Found wrong import in {rel_path}: {match.group(0)}")
                modified = True
                return match.group(1) + correct_prefix + match.group(3)
            return match.group(0)
            
        content = re.sub(regex, replace_fn, content)
        
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {rel_path}")

for root, dirs, files in os.walk(app_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            fix_imports(os.path.join(root, file))
