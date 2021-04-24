const crypto = require("crypto");

const lastHash =
  "4c6f7288ee44fdd0cae924a05747170a67e028fcae6ef7b7a4a076c34e97fd99";
const actualHash =
  "035c3590e3cc3341ef8259f647025bf86d4a43787acebb2141e402558bcdc6ad";

let generatedHash = lastHash;
let position = 1;
let found = false;
const lastHashes = [lastHash];

while (found == false) {
  generatedHash = crypto
    .createHash("sha256")
    .update(generatedHash)
    .digest("hex");

  lastHashes.push(generatedHash);

  if (lastHashes.length > 10) {
    lastHashes.shift();
  }

  if (generatedHash === actualHash) {
    found = true;
  } else {
    position++;
  }

  if (position % 1000000 === 0) {
    console.log(`${position} - ${generatedHash}`);
  }
}

console.log(`Hash ${actualHash} encontrado na posição ${position}`);
console.log(lastHashes);