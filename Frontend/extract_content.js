const fs = require('fs');
const path = require('path');

const DIRS = [".", "Investor", "Company", "Administrator"];

function extractMainContent(html, isRoot) {
    if (isRoot) {
        // Find everything between the navbar and footer
        const match = html.match(/<\/nav>([\s\S]*?)<footer/);
        if (match) return match[1].trim();
        return null;
    }
    
    // regex for <main class="content">...</main>
    const match = html.match(/<main class="content">([\s\S]*?)<\/main>/);
    if (match) return match[1].trim();
    
    // fallback for <main>...</main>
    const fallback = html.match(/<main>([\s\S]*?)<\/main>/);
    if (fallback) return fallback[1].trim();
    
    return null;
}

function processDirs() {
    DIRS.forEach(d => {
        const dirPath = path.join(__dirname, d);
        if (!fs.existsSync(dirPath)) return;
        
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            if (file.endsWith(".html") && !file.includes("index_2") && !file.includes("index.html_backup")) {
                // Skip some specific root files if needed, but for now let's try
                if (d === "." && (file.startsWith("index") || file.startsWith("register") || file.startsWith("login"))) {
                    // process landing
                } else if (d === ".") {
                    return; // Skip other root files
                }

                const filePath = path.join(dirPath, file);
                const html = fs.readFileSync(filePath, 'utf8');
                
                const content = extractMainContent(html, d === ".");
                if (content) {
                    const outPath = path.join(__dirname, "content", d, file);
                    fs.mkdirSync(path.dirname(outPath), { recursive: true });
                    fs.writeFileSync(outPath, content);
                    console.log(`Extracted: ${d}/${file}`);
                } else {
                    console.log(`Failed to extract: ${d}/${file}`);
                }
            }
        });
    });
}

processDirs();
