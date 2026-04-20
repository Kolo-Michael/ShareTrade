const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, "templates");
const PAGES_CONFIG = path.join(__dirname, "pages.json");
const CONTENT_DIR = path.join(__dirname, "content");
const OUTPUT_DIR = __dirname;

function loadTemplate(name) {
    return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf8');
}

const templates = {
    head: loadTemplate("base_head.html"),
    investor_sidebar: loadTemplate("sidebar_investor.html"),
    company_sidebar: loadTemplate("sidebar_company.html"),
    admin_sidebar: loadTemplate("sidebar_admin.html"),
    topbar: loadTemplate("topbar.html"),
    landing_nav: loadTemplate("landing_navbar.html"),
    landing_footer: loadTemplate("landing_footer.html")
};

function renderTemplate(tpl, context) {
    let result = tpl;
    for (const [key, value] of Object.entries(context)) {
        result = result.split(`{{ ${key} }}`).join(value);
    }
    return result;
}

function fixActiveLinks(html, activePage) {
    return html.replace(/{{ 'active' if active_page == '([^']+)' else '' }}/g, (match, pageName) => {
        return pageName === activePage ? "active" : "";
    });
}

const sharedJs = `
<script>
// --- Theme Toggle ---
const themeBtn = document.getElementById('themeBtn') || document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const html = document.documentElement;

const savedTheme = localStorage.getItem('st-theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
if(themeIcon && themeIcon.tagName === 'I') {
    themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

if(themeBtn) {
    themeBtn.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('st-theme', next);
        if(themeIcon && themeIcon.tagName === 'I') {
            themeIcon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    });
}

// --- Mobile Sidebar Toggle ---
const sidebarToggle = document.getElementById('sidebarToggle') || document.getElementById('mobileToggle');
const sidebar = document.getElementById('sidebar') || document.getElementById('navLinks');

if(sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
        const icon = sidebarToggle.querySelector('i');
        if(icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
    });
    
    document.addEventListener('click', (e) => {
        if(sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
            sidebar.classList.remove('open');
            const icon = sidebarToggle.querySelector('i');
            if(icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        }
    });
}

// --- Hero Slideshow (Landing Page) ---
const slides = document.querySelectorAll('.hero-slide');
const dots   = document.querySelectorAll('.slide-dot');
if(slides.length > 0) {
    let currentSlide = 0;
    function goToSlide(i) {
        slides[currentSlide].classList.remove('active');
        if(dots[currentSlide]) dots[currentSlide].classList.remove('active');
        currentSlide = i;
        slides[currentSlide].classList.add('active');
        if(dots[currentSlide]) dots[currentSlide].classList.add('active');
    }
    let iv = setInterval(() => goToSlide((currentSlide + 1) % slides.length), 5000);
    dots.forEach(d => d.addEventListener('click', function() {
        clearInterval(iv);
        goToSlide(+this.dataset.index);
        iv = setInterval(() => goToSlide((currentSlide + 1) % slides.length), 5000);
    }));
}
</script>
`;

function generate() {
    const pages = JSON.parse(fs.readFileSync(PAGES_CONFIG, 'utf8'));

    pages.forEach(p => {
        const contentPath = path.join(CONTENT_DIR, p.filename);
        if (!fs.existsSync(contentPath)) {
            console.log(`Skipping ${p.filename} - Content not found`);
            return;
        }
        
        const content = fs.readFileSync(contentPath, 'utf8');
        const rootPath = "../".repeat(p.depth);
        
        const head = renderTemplate(templates.head, { title: p.title, root_path: rootPath });
        
        const sidebarTpl = templates[`${p.role}_sidebar`];
        let sidebar = renderTemplate(sidebarTpl, { root_path: rootPath });
        sidebar = fixActiveLinks(sidebar, p.active);
        
        const topbar = renderTemplate(templates.topbar, {
            page_title: p.page_title,
            date_string: "Monday, 6 April 2026",
            user_initials: p.role === "investor" ? "JD" : p.role === "company" ? "TV" : "AD"
        });
        
        const fullHtml = `${head}
<body>
${sidebar}
<div class="main">
    ${topbar}
    <main class="content">
        ${content}
    </main>
</div>
${sharedJs}
</body>
</html>`;

        const outPath = path.join(OUTPUT_DIR, p.filename);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, fullHtml);
        console.log(`Generated: ${p.filename}`);
    });

    // Special case for index.html
    const indexContentPath = path.join(CONTENT_DIR, "index.html");
    if (fs.existsSync(indexContentPath)) {
        const content = fs.readFileSync(indexContentPath, 'utf8');
        const head = renderTemplate(templates.head, { title: "Home | ShareTrade P2P", root_path: "./" });
        const nav = renderTemplate(templates.landing_nav, { root_path: "./" });
        const footer = renderTemplate(templates.landing_footer, { root_path: "./" });
        
        const fullHtml = `${head}
<body>
${nav}
${content}
${footer}
${sharedJs}
</body>
</html>`;
        fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), fullHtml);
        console.log(`Generated: index.html`);
    }
}

generate();
