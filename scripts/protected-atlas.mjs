import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

// Narrow exceptions explicitly requested by Yann on 21 November 2026.
// The original protected manifest is preserved and checked before edits apply.
export function authorizedYannHTML(original){
  const star='<span>✳</span>';
  const link=/<a class="bio-link" href="https:\/\/www\.tiktok\.com\/@novaia\.org">[\s\S]*?<\/a>/g;
  if(original.split(star).length!==2||(original.match(link)||[]).length!==1)throw Error('Unexpected original Yann markup.');
  return original.replace(star,'').replace(link,'').replace('Admis au D2E','Programme D2E');
}

export function expectedProtectedHash(file,originalHash,root){
  if(file!=='yann/index.html')return originalHash;
  const original=fs.readFileSync(path.join(root,'tests/fixtures/yann-before-authorized-edits.html'));
  if(sha(original)!==originalHash)throw Error('Original Yann fixture no longer matches the protected baseline.');
  return sha(authorizedYannHTML(original.toString('utf8')));
}
