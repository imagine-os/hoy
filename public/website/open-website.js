// People open the existing Latest website; non-JavaScript crawlers retain this page's metadata.
// Resolve relative to this entry so custom domains and GitHub Pages subpaths both work.
const website = new URL('../', window.location.href);
website.search = '';
website.hash = '/site';
window.location.replace(website.href);
