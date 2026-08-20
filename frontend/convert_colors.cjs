const fs = require('fs');
const path = require('path');

const dir = './src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const replacements = [
    { regex: /color:\s*['"]#(fff|ffffff)['"]/gi, replace: "color: 'var(--text-light)'" },
    { regex: /color:\s*['"]#(aaa|bbb|ccc|999|888|777)['"]/gi, replace: "color: 'var(--text-muted)'" },
    { regex: /background:\s*['"]#(050510|0A1128)['"]/gi, replace: "background: 'var(--bg-dark)'" },
    { regex: /background:\s*['"]rgba\(10,\s*17,\s*40,\s*0\.95\)['"]/gi, replace: "background: 'var(--royal-blue)'" },
    { regex: /background:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.03\)['"]/gi, replace: "background: 'var(--card-bg)'" },
    { regex: /background:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.05\)['"]/gi, replace: "background: 'var(--card-bg)'" },
    { regex: /background:\s*['"]rgba\(0,\s*0,\s*0,\s*0\.5\)['"]/gi, replace: "background: 'var(--input-bg)'" },
    { regex: /border:\s*['"]1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)['"]/gi, replace: "border: '1px solid var(--border-color)'" },
    { regex: /borderBottom:\s*['"]1px solid rgba\(255,\s*255,\s*255,\s*0\.05\)['"]/gi, replace: "borderBottom: '1px solid var(--border-color)'" },
    { regex: /border:\s*['"]1px solid rgba\(255,\s*255,\s*255,\s*0\.05\)['"]/gi, replace: "border: '1px solid var(--border-color)'" },
    { regex: /background:\s*['"]#00f5d4['"]/gi, replace: "background: 'var(--success)'" },
    { regex: /color:\s*['"]#00f5d4['"]/gi, replace: "color: 'var(--success)'" },
    { regex: /background:\s*['"]#f15bb5['"]/gi, replace: "background: 'var(--danger)'" },
    { regex: /color:\s*['"]#f15bb5['"]/gi, replace: "color: 'var(--danger)'" },
    { regex: /background:\s*['"]rgba\(0,\s*245,\s*212,\s*0\.2\)['"]/gi, replace: "background: 'var(--success-bg)'" },
    { regex: /background:\s*['"]rgba\(241,\s*91,\s*181,\s*0\.2\)['"]/gi, replace: "background: 'var(--danger-bg)'" },
    { regex: /background:\s*['"]rgba\(241,\s*91,\s*181,\s*0\.1\)['"]/gi, replace: "background: 'var(--danger-bg)'" },
    { regex: /border:\s*['"]1px solid #f15bb5['"]/gi, replace: "border: '1px solid var(--danger)'" },
    { regex: /background:\s*['"]rgba\(255,\s*183,\s*3,\s*0\.1\)['"]/gi, replace: "background: 'var(--primary-bg)'" },
    { regex: /background:\s*['"]rgba\(255,\s*183,\s*3,\s*0\.2\)['"]/gi, replace: "background: 'var(--primary-bg)'" },
    { regex: /color:\s*['"]#FFB703['"]/gi, replace: "color: 'var(--royal-gold)'" },
    { regex: /border:\s*['"]1px solid #FFB703['"]/gi, replace: "border: '1px solid var(--royal-gold)'" },
    { regex: /background:\s*['"]#FFB703['"]/gi, replace: "background: 'var(--royal-gold)'" },
];

files.forEach(f => {
    if (f === 'Login.jsx') return; // Do not touch the newly designed login page!
    const filePath = path.join(dir, f);
    let content = fs.readFileSync(filePath, 'utf8');
    
    replacements.forEach(r => {
        content = content.replace(r.regex, r.replace);
    });
    
    fs.writeFileSync(filePath, content);
    console.log('Processed', f);
});
