import os

def replace_in_file(path, old, new):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

for root, dirs, files in os.walk('backend'):
    for file in files:
        if file.endswith(('.py', '.ini', '.toml')):
            path = os.path.join(root, file)
            # Replace apps.api.src with src
            replace_in_file(path, 'apps.api.src', 'src')
            # Replace applications of apps.api itself (like in pyproject.toml package names or celery worker paths)
            replace_in_file(path, 'apps.api', 'backend')
