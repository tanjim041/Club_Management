import fs from 'node:fs'
import path from 'node:path'

function walk(dir) {
  let files = []
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full))
    else if (/\.(tsx?|jsx?|css)$/.test(item)) files.push(full)
  }
  return files
}

const repls = [
  ['\u00E2\u20AC\u00A6', '…'], // â€¦
  ['\u00E2\u20AC\u201D', '—'], // â€”
  ['\u00E2\u20AC\u2013', '–'], // â€“
  ['\u00E2\u20AC\u00A2', '•'], // â€¢
  ['\u00E2\u2020\u2019', '→'], // â†’
  ['\u00E2\u20AC\u201C', '–'], // â€“
  ['\u00E2\u02C6\u2019', '−'], // âˆ’
  ['\u00E2\u02C6\u2212', '−'], // âˆ’
  ['\u00C2\u00B7', '·'],       // Â·
]

let changed = 0
for (const f of walk('src')) {
  let content = fs.readFileSync(f, 'utf8')
  let mod = false
  for (const [from, to] of repls) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to)
      mod = true
    }
  }
  if (mod) {
    fs.writeFileSync(f, content, 'utf8')
    changed++
    console.log('Fixed:', f)
  }
}
console.log('Total files cleaned:', changed)
