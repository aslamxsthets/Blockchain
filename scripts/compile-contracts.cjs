const fs = require('fs');
const path = require('path');
const solc = require('solc');

function compile() {
  const contractPath = path.resolve(__dirname, '../contracts/CertificateRegistry.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'CertificateRegistry.sol': {
        content: source,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  console.log('Compiling CertificateRegistry.sol with solc 0.8.20...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      console.log(error.formattedMessage);
      if (error.severity === 'error') {
        hasError = true;
      }
    }
    if (hasError) {
      throw new Error('Compilation failed.');
    }
  }

  const contractData = output.contracts['CertificateRegistry.sol']['CertificateRegistry'];
  const abi = contractData.abi;
  const bytecode = '0x' + contractData.evm.bytecode.object;

  const outDir = path.resolve(__dirname, '../artifacts/contracts/CertificateRegistry.sol');
  fs.mkdirSync(outDir, { recursive: true });

  const artifact = {
    contractName: 'CertificateRegistry',
    abi,
    bytecode,
    compiler: '0.8.20',
    generatedAt: new Date().toISOString(),
  };

  const artifactPath = path.join(outDir, 'CertificateRegistry.json');
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`Successfully compiled contract! Artifact written to ${artifactPath}`);
  console.log(`ABI functions: ${abi.filter(item => item.type === 'function').map(f => f.name).join(', ')}`);
}

compile();
