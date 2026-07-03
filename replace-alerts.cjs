const fs = require('fs');
const files = [
  'src/components/PaymentModal.tsx',
  'src/context/AuthContext.tsx',
  'src/views/AdminDashboard.tsx',
  'src/views/ClientDashboard.tsx',
  'src/views/CreateDelivery.tsx',
  'src/views/DeliveryHistory.tsx',
  'src/views/DeliveryTracking.tsx',
  'src/views/Settings.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Replace alert(...)
  if (content.includes('alert(')) {
    content = content.replace(/alert\((.*?)\);?/g, (match, p1) => {
      let replacement = 'toast(' + p1 + ')';
      if (p1.toLowerCase().includes('erreur') || p1.toLowerCase().includes('impossible') || p1.toLowerCase().includes('invalide')) {
        replacement = 'toast.error(' + p1 + ')';
      } else if (p1.toLowerCase().includes('succès') || p1.toLowerCase().includes('réussie') || p1.toLowerCase().includes('mis à jour') || p1.toLowerCase().includes('copié') || p1.toLowerCase().includes('appliquée')) {
        replacement = 'toast.success(' + p1 + ')';
      } else {
        replacement = 'toast(' + p1 + ')'; // fallback
      }
      return replacement + ';';
    });
    modified = true;
  }
  
  if (modified) {
    // Inject import if not exists
    if (!content.includes('import toast')) {
      // Find the last import
      const importRegex = /^import.*$/gm;
      let match;
      let lastIndex = 0;
      while ((match = importRegex.exec(content)) !== null) {
        lastIndex = match.index + match[0].length;
      }
      content = content.slice(0, lastIndex) + "\nimport toast from 'react-hot-toast';" + content.slice(lastIndex);
    }
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
