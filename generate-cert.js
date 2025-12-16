const fs = require('fs');
const selfsigned = require('selfsigned');

console.log('Generating self-signed SSL certificate...');

try {
  // Generate self-signed certificate
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  
  const pems = selfsigned.generate(attrs, { 
    days: 365,
    keySize: 4096,
    algorithm: 'sha256'
  });

  console.log('Generated PEMs type:', typeof pems);
  console.log('PEMs is array?', Array.isArray(pems));
  
  // Handle different return types
  let privateKey, certificate;
  
  if (typeof pems === 'string') {
    // If it returns a string, it might be the certificate
    certificate = pems;
    // Generate key separately
    const keyPair = selfsigned.generate(attrs, { 
      days: 365,
      keySize: 4096,
      algorithm: 'sha256'
    });
    privateKey = keyPair.private || keyPair;
  } else if (pems && typeof pems === 'object') {
    privateKey = pems.private || pems.key;
    certificate = pems.cert || pems.certificate;
  }

  if (!privateKey || !certificate) {
    console.error('Error: Could not extract private key or certificate');
    console.error('PEMs structure:', JSON.stringify(Object.keys(pems || {})));
    process.exit(1);
  }

  // Write private key and certificate
  fs.writeFileSync('domain.key', privateKey);
  fs.writeFileSync('domain.crt', certificate);

  console.log('✓ domain.key created');
  console.log('✓ domain.crt created');
  console.log('✓ SSL certificates generated successfully!');
  console.log('  Certificate is valid for 365 days');
  console.log('  Common Name: localhost');
} catch (error) {
  console.error('Error generating certificates:', error.message);
  process.exit(1);
}

