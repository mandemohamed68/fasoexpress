const fs = require('fs');

const errors = `
src/views/AdminDashboard.tsx(566,94): error TS1005: ')' expected.
src/views/AdminDashboard.tsx(1108,93): error TS1005: '}' expected.
src/views/AdminDashboard.tsx(1217,17): error TS1005: ')' expected.
src/views/AdminDashboard.tsx(1225,11): error TS1005: ')' expected.
src/views/AdminDashboard.tsx(1265,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(1364,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(1617,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(1642,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(1787,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(1901,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(2404,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(2434,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(2544,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(2600,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(2737,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(2957,7): error TS1128: Declaration or statement expected.
src/views/AdminDashboard.tsx(3136,7): error TS1128: Declaration or statement expected.
src/views/ClientDashboard.tsx(64,73): error TS1005: ')' expected.
src/views/ClientDashboard.tsx(124,75): error TS1005: ')' expected.
src/views/ClientDashboard.tsx(135,78): error TS1005: ')' expected.
src/views/CreateDelivery.tsx(395,78): error TS1005: ')' expected.
src/views/CreateDelivery.tsx(399,64): error TS1005: ')' expected.
src/views/CreateDelivery.tsx(537,66): error TS1005: '}' expected.
src/views/CreateDelivery.tsx(642,22): error TS1005: ';' expected.
src/views/CreateDelivery.tsx(1205,1): error TS1160: Unterminated template literal.
src/views/DeliveryTracking.tsx(283,91): error TS1005: ')' expected.
src/views/DeliveryTracking.tsx(635,111): error TS1005: ')' expected.
src/views/DeliveryTracking.tsx(651,117): error TS1005: ')' expected.
`;

const lines = errors.trim().split('\n');
const filesToRead = new Set();
lines.forEach(l => {
  const match = l.match(/^(.*?)\((\d+),(\d+)\)/);
  if (match) {
    const file = match[1];
    const lineNum = parseInt(match[2], 10);
    const content = fs.readFileSync(file, 'utf8').split('\n');
    console.log(`\n--- ${file}:${lineNum} ---`);
    console.log(content[lineNum-2]);
    console.log(content[lineNum-1]); // The error line
    console.log(content[lineNum]);
  }
});

