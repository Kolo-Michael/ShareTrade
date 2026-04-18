import os
import re

# Directories to process
DIRS = ["Investor", "Company", "Administrator"]

def extract_main_content(html):
    # Try to find <main class="content">...</main>
    match = re.search(r'<main class="content">(.*?)</main>', html, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    # Fallback: maybe just <main>...</main>
    match = re.search(r'<main>(.*?)</main>', html, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    return None

def process():
    for d in DIRS:
        path = os.path.join(".", d)
        if not os.path.exists(path): continue
        
        for file in os.listdir(path):
            if file.endswith(".html"):
                with open(os.path.join(path, file), "r", encoding="utf-8") as f:
                    html = f.read()
                
                content = extract_main_content(html)
                if content:
                    out_path = os.path.join("content", d, file)
                    os.makedirs(os.path.dirname(out_path), exist_ok=True)
                    with open(out_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"Extracted: {d}/{file}")
                else:
                    print(f"Failed to extract: {d}/{file}")

if __name__ == "__main__":
    process()
