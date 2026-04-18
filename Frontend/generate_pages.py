import os

# --- Configuration ---
TEMPLATES_DIR = "templates"
OUTPUT_DIR = "."

# Common parts loaders
def load_template(name):
    with open(os.path.join(TEMPLATES_DIR, name), "r", encoding="utf-8") as f:
        return f.read()

HEAD = load_template("base_head.html")
SIDEBAR_INVESTOR = load_template("sidebar_investor.html")
SIDEBAR_COMPANY = load_template("sidebar_company.html")
SIDEBAR_ADMIN = load_template("sidebar_admin.html")
TOPBAR = load_template("topbar.html")
LANDING_NAV = load_template("landing_navbar.html")
LANDING_FOOTER = load_template("landing_footer.html")

# --- Helper Functions ---
def get_root_path(depth):
    return "../" * depth if depth > 0 else "./"

def render_template(template_str, context):
    result = template_str
    for key, value in context.items():
        placeholder = "{{ " + key + " }}"
        result = result.replace(placeholder, str(value))
    
    # Very basic logic for active class: {{ 'active' if active_page == 'dashboard' else '' }}
    # We will handle these specifically if needed, but for now I'll use simple replacements
    return result

def fix_active_links(html, active_page):
    # This is a hacky way to handle the j2-like syntax in my templates without jinja2
    pieces = html.split("{{ 'active' if active_page == '")
    if len(pieces) == 1: return html
    
    new_html = pieces[0]
    for piece in pieces[1:]:
        page_name, rest = piece.split("' else '' }}", 1)
        active_class = "active" if page_name == active_page else ""
        new_html += active_class + rest
    return new_html

# --- Page Generation Classes ---

class BasePage:
    def __init__(self, filename, title, depth=0):
        self.filename = filename
        self.title = title
        self.depth = depth
        self.root_path = get_root_path(depth)

    def generate(self, content):
        head = render_template(HEAD, {"title": self.title, "root_path": self.root_path})
        full_html = f"{head}<body>\n{content}\n"
        
        # Add shared JS for theme and mobile toggle
        full_html += self.get_shared_js()
        full_html += "</body>\n</html>"
        
        self.save(full_html)

    def get_shared_js(self):
        return """
<script>
// --- Theme Toggle ---
const themeBtn = document.getElementById('themeBtn') || document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const html = document.documentElement;

const savedTheme = localStorage.getItem('st-theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
if(themeIcon) themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

if(themeBtn) {
    themeBtn.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('st-theme', next);
        if(themeIcon) themeIcon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
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
    
    // Close sidebar when clicking outside
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
</script>
"""

    def save(self, html):
        path = os.path.join(OUTPUT_DIR, self.filename)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Generated: {self.filename}")

class DashboardPage(BasePage):
    def __init__(self, filename, title, role, active_page, page_title, depth=1):
        super().__init__(filename, title, depth)
        self.role = role
        self.active_page = active_page
        self.page_title = page_title

    def generate(self, content):
        head = render_template(HEAD, {"title": self.title, "root_path": self.root_path})
        
        sidebar_tpl = {"investor": SIDEBAR_INVESTOR, "company": SIDEBAR_COMPANY, "admin": SIDEBAR_ADMIN}[self.role]
        sidebar = render_template(sidebar_tpl, {"root_path": self.root_path})
        sidebar = fix_active_links(sidebar, self.active_page)
        
        topbar = render_template(TOPBAR, {
            "page_title": self.page_title,
            "date_string": "Monday, 6 April 2026",
            "user_initials": "JD" if self.role == "investor" else "TV" if self.role == "company" else "AD"
        })
        
        full_html = f"""{head}
<body>
{sidebar}
<div class="main">
    {topbar}
    <main class="content">
        {content}
    </main>
</div>
{self.get_shared_js()}
</body>
</html>"""
        self.save(full_html)

class LandingPage(BasePage):
    def __init__(self, filename, title):
        super().__init__(filename, title, depth=0)

    def generate(self, content):
        head = render_template(HEAD, {"title": self.title, "root_path": self.root_path})
        nav = render_template(LANDING_NAV, {"root_path": self.root_path})
        footer = render_template(LANDING_FOOTER, {"root_path": self.root_path})
        
        full_html = f"""{head}
<body>
{nav}
{content}
{footer}
{self.get_shared_js()}
</body>
</html>"""
        self.save(full_html)

# --- Execution ---

if __name__ == "__main__":
    # Example: Regenerating Investor Dashboard
    # To use this correctly, we would need to extract the "content" part of each existing file.
    # For this demonstration, I'll just show the structure.
    
    # In a real run, I would read the original file, extract the content between <main> tags,
    # and then re-generate it using the classes above.
    pass
