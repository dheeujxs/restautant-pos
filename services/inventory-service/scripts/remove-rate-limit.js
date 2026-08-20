// scripts/remove-rate-limit.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTROLLERS_DIR = path.join(__dirname, '../controllers');

console.log('🚀 Starting rate limit removal...');
console.log(`📁 Directory: ${CONTROLLERS_DIR}\n`);

function removeRateLimitFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const fileName = path.basename(filePath);

    // ─── Remove rate limiting section (with varying formats) ──────────
    
    // 1. Remove the entire rate limiting section with header
    const rateLimitSectionPatterns = [
      // Pattern: // ============================================================
      //          //  RATE LIMITING
      //          // ============================================================
      //          const rateLimiter = new Map();
      //          const checkRateLimit = ...
      /\/\/ =+?\n\/\/  RATE LIMITING\n\/\/ =+?\n\nconst rateLimiter = new Map\(\);\n\nconst checkRateLimit = \([^)]+\) => \{[\s\S]*?\n\};\n\n/g,
      
      // Pattern with different header style
      /\/\/ =+?\n\/\/  RATE LIMITING\n\/\/ =+?\n\nconst rateLimiter = new Map\(\);\n\nconst checkRateLimit = function\([^)]+\) \{[\s\S]*?\n\};\n\n/g,
      
      // Pattern without header
      /const rateLimiter = new Map\(\);\n\nconst checkRateLimit = \([^)]+\) => \{[\s\S]*?\n\};\n\n/g,
    ];

    for (const pattern of rateLimitSectionPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
        console.log(`  ✅ Removed rate limiting section from ${fileName}`);
        break;
      }
    }

    // ─── Remove individual rate limit constants ────────────────────────
    const constantPatterns = [
      /const RATE_LIMIT_WINDOW = \d+ \* \d+; \/\/ .*\n/g,
      /const RATE_LIMIT_MAX_REQUESTS = \d+; \/\/ .*\n/g,
      /const RATE_LIMIT_WINDOW = .*?;\n/g,
      /const RATE_LIMIT_MAX_REQUESTS = .*?;\n/g,
    ];

    for (const pattern of constantPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
        console.log(`  ✅ Removed rate limit constants from ${fileName}`);
      }
    }

    // ─── Remove rate limit check calls ──────────────────────────────────
    
    // Pattern 1: Standard check with userId
    const checkPattern1 = /\/\/ ─── RATE LIMIT ─+?\n\s*const userId = [^;]+;\n\s*if \(!checkRateLimit\(userId\)\) \{\n\s*return res\.status\(429\)\.json\(\{\n\s*success: false,\n\s*error: 'Too many requests\. Please wait a moment\.',\n\s*\}\);\n\s*\}\n/g;
    
    // Pattern 2: Check without userId variable
    const checkPattern2 = /\/\/ ─── RATE LIMIT ─+?\n\s*if \(!checkRateLimit\([^)]+\)\) \{\n\s*return res\.status\(429\)\.json\(\{\n\s*success: false,\n\s*error: 'Too many requests\. Please wait a moment\.',\n\s*\}\);\n\s*\}\n/g;
    
    // Pattern 3: Compact check
    const checkPattern3 = /if \(!checkRateLimit\([^)]+\)\) \{\n\s*return res\.status\(429\)\.json\(\{\n\s*success: false,\n\s*error: 'Too many requests\. Please wait a moment\.',\n\s*\}\);\n\s*\}\n/g;
    
    // Pattern 4: Check with different error message
    const checkPattern4 = /if \(!checkRateLimit\([^)]+\)\) \{\n\s*return res\.status\(429\)\.json\(\{\n\s*success: false,\n\s*error: '[^']*',\n\s*\}\);\n\s*\}\n/g;

    const checkPatterns = [checkPattern1, checkPattern2, checkPattern3, checkPattern4];
    
    for (const pattern of checkPatterns) {
      if (pattern.test(content)) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, '');
          modified = true;
          console.log(`  ✅ Removed ${matches.length} rate limit check(s) from ${fileName}`);
        }
      }
    }

    // ─── Remove userId declarations that are only used for rate limiting ──
    // Remove userId variable if it's followed by rate limit check
    const userIdPattern = /const userId = req\.user\?\._id \|\| req\.staff\?\._id;\n\s*\/\/ ─── RATE LIMIT ─+?\n\s*if \(!checkRateLimit\(userId\)\)/g;
    if (userIdPattern.test(content)) {
      content = content.replace(userIdPattern, '// ─── RATE LIMIT ──────────────────────────────────────────────────────\nif (!checkRateLimit(req.user?._id || req.staff?._id))');
      modified = true;
    }

    // ─── Clean up orphaned comments ────────────────────────────────────
    // Remove empty rate limit comment blocks
    content = content.replace(/\/\/ ─── RATE LIMIT ─+?\n/g, '');
    content = content.replace(/\/\/ RATE LIMIT\n/g, '');
    
    // Remove duplicate blank lines
    content = content.replace(/\n{3,}/g, '\n\n');

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${fileName}\n`);
      return true;
    }
    
    console.log(`⏭️ No changes: ${fileName}\n`);
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === 'dist' || file === 'build' || file === 'super-admin') {
        // Still process super-admin directory
        if (file === 'super-admin') {
          count += processDirectory(fullPath);
        }
        continue;
      }
      count += processDirectory(fullPath);
    } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
      const updated = removeRateLimitFromFile(fullPath);
      if (updated) count++;
    }
  }

  return count;
}

// Process super-admin subdirectory too
const superAdminDir = path.join(CONTROLLERS_DIR, 'super-admin');
if (fs.existsSync(superAdminDir)) {
  console.log('📁 Processing super-admin subdirectory...\n');
  processDirectory(superAdminDir);
}

// Process staff-portal subdirectory too
const staffPortalDir = path.join(CONTROLLERS_DIR, 'staff-portal');
if (fs.existsSync(staffPortalDir)) {
  console.log('📁 Processing staff-portal subdirectory...\n');
  processDirectory(staffPortalDir);
}

// Process main controllers directory
const updatedCount = processDirectory(CONTROLLERS_DIR);

console.log(`\n✅ Complete! ${updatedCount} files updated.`);
console.log('📝 Please review the changes and restart your server.');