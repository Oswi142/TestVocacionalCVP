import fs from 'fs';
import path from 'path';

const testDir = 'd:/semestre-1-25/cvp-test-vocacional/test-vocacional/tests/unit';

const tests = fs.readdirSync(testDir).filter(f => f.endsWith('.ts'));

for(const t of tests) {
    const fullPath = path.join(testDir, t);
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/vi\.mock\(['"]\.\.\/\.\.\/src\/supabaseClient['"]/g, "vi.mock('@/infrastructure/config/supabaseClient'");
    // Just in case it's one level up
    content = content.replace(/vi\.mock\(['"]\.\.\/src\/supabaseClient['"]/g, "vi.mock('@/infrastructure/config/supabaseClient'");
    fs.writeFileSync(fullPath, content);
}
console.log("Mocks fixed!");
