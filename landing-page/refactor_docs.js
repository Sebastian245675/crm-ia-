const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'src', 'pages', 'documentacion');
if (!fs.existsSync(docsDir)) {
  console.error("Directory not found:", docsDir);
  process.exit(1);
}

const files = fs.readdirSync(docsDir);

files.forEach(file => {
  if (!file.endsWith('.astro')) return;
  const filePath = path.join(docsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip index or already refactored files
  if (content.includes('DocLayout')) {
    console.log(`Skipping ${file} (already refactored)`);
    return;
  }

  console.log(`Refactoring ${file}...`);

  // 1. Refactor imports in frontmatter
  content = content.replace(
    /import Layout from '\.\.\/\.\.\/layouts\/Layout\.astro';\s*import Navbar from '\.\.\/\.\.\/components\/Navbar\.astro';/,
    "import DocLayout from '../../layouts/DocLayout.astro';"
  );

  // 2. Refactor Layout opening tag to DocLayout
  content = content.replace(
    /<Layout([\s\S]*?)>/,
    (match, attrs) => `<DocLayout${attrs} currentPath={Astro.url.pathname}>`
  );

  // 3. Remove Navbar and min-h-screen wrapper, extract header details
  const headerRegex = /<Navbar\s*\/?>\s*<div class="min-h-screen bg-white text-slate-900">\s*<header[^>]*>\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/header>/;
  const headerMatch = content.match(headerRegex);

  if (headerMatch) {
    const title = headerMatch[1].trim();
    const desc = headerMatch[2].trim();

    content = content.replace(
      headerRegex,
      `<div class="space-y-8">\n    <div class="space-y-3">\n      <h1 class="text-3xl sm:text-4xl font-extrabold text-[#11103d] tracking-tight">${title}</h1>\n      <p class="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">${desc}</p>\n    </div>\n\n    <div class="border-t border-slate-100 pt-6 space-y-8">`
    );
  }

  // 4. Remove main tags and back buttons
  content = content.replace(/<main[^>]*>/, '');
  content = content.replace(/<\/main>/, '');
  
  // Remove the Back to Docs div
  content = content.replace(/<div class="mt-12 pt-6 border-t border-slate-200">[\s\S]*?<\/div>/, '');

  // Remove the wrapper div closing tag and closing Layout tag
  content = content.replace(/<\/div>\s*<\/Layout>/, '</div>\n</DocLayout>');

  // 5. Replace other class names to align typography
  content = content.replaceAll('text-slate-700', 'text-slate-600');
  content = content.replaceAll('text-slate-900', 'text-slate-800');
  content = content.replaceAll('border-slate-200', 'border-slate-100');
  content = content.replaceAll('className=', 'class='); // fix occasional JSX class typos

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log("Refactoring complete!");
