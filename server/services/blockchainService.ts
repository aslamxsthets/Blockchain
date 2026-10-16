import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import ganache from 'ganache';
import { config } from '../config';
import { db } from '../db/database';
import { toBytes32 } from './cryptoService';

export interface BlockchainProofResult {
  exists: boolean;
  isValid: boolean;
  isRevoked: boolean;
  registeredFingerprint: string;
  issuerAddress: string;
  issuerId: string;
  issuedAt: number;
  blockNumber: number;
  revocationReason?: string;
  revokedAt?: number;
}

class BlockchainService {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;
  private isInitialized = false;
  private artifact: any = null;
  private networkName = config.blockchain.networkName;

  private async loadArtifact() {
    if (this.artifact) return;
    const artifactPath = path.resolve(process.cwd(), 'artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json');
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Contract artifact not found at ${artifactPath}. Run npm run compile:contracts first.`);
    }
    this.artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.contract) return;

    await this.loadArtifact();

    try {
      // Initialize in-process Ganache provider
      // Deterministic mnemonic to maintain predictable keys across app restarts
      const ganacheProvider = ganache.provider({
        logging: { quiet: true },
        wallet: {
          mnemonic: 'test test test test test test test test test test test junk',
          totalAccounts: 10,
        },
        chain: {
          chainId: 31337,
        },
      });

      this.provider = new ethers.BrowserProvider(ganacheProvider as any);
      this.signer = await this.provider.getSigner(0);
      const signerAddress = await this.signer.getAddress();
      console.log(`[Blockchain] Connected to in-memory EVM. Signer address: ${signerAddress}`);

      // Check if contract already deployed and has bytecode on the current EVM
      const systemConfig = await db.getSystemConfig();
      let deployedAddress = systemConfig.contractAddress;
      let needsDeploy = true;

      if (deployedAddress) {
        try {
          const code = await this.provider!.getCode(deployedAddress);
          if (code && code !== '0x' && code !== '0x0') {
            const probeContract = new ethers.Contract(deployedAddress, this.artifact.abi, this.signer);
            await probeContract.owner();
            needsDeploy = false;
            console.log(`[Blockchain] Re-attached to active contract at ${deployedAddress}`);
          }
        } catch {
          needsDeploy = true;
        }
      }

      if (needsDeploy) {
        console.log('[Blockchain] Deploying fresh CertificateRegistry contract to local devnet...');
        const factory = new ethers.ContractFactory(this.artifact.abi, this.artifact.bytecode, this.signer);
        const deployedContract = await factory.deploy();
        await deployedContract.waitForDeployment();
        deployedAddress = await deployedContract.getAddress();

        await db.setSystemConfig({
          contractAddress: deployedAddress,
          deployedAt: new Date().toISOString(),
          network: this.networkName,
        });
        console.log(`[Blockchain] Contract deployed successfully at ${deployedAddress}`);
      }

      this.contractAddress = deployedAddress || null;
      if (!deployedAddress) {
        throw new Error('Failed to determine deployed contract address');
      }
      this.contract = new ethers.Contract(deployedAddress, this.artifact.abi, this.signer);

      const owner = await this.contract.owner();
      console.log(`[Blockchain] Contract active. Verified Registry Owner: ${owner}`);

      this.isInitialized = true;
    } catch (err) {
      console.error('[Blockchain] Initialization failed:', err);
      throw err;
    }
  }

  public async getContractAddress(): Promise<string> {
    await this.init();
    return this.contractAddress!;
  }

  public async getNetworkStatus(): Promise<{
    connected: boolean;
    network: string;
    chainId: number;
    contractAddress: string;
    signerAddress: string;
    blockNumber: number;
  }> {
    await this.init();
    const signerAddress = await this.signer!.getAddress();
    const blockNumber = await this.provider!.getBlockNumber();
    return {
      connected: true,
      network: this.networkName,
      chainId: 31337,
      contractAddress: this.contractAddress!,
      signerAddress,
      blockNumber,
    };
  }

  /**
   * Anchors a certificate SHA-256 fingerprint on the blockchain.
   */
  public async registerCertificate(
    certificateId: string,
    fingerprintHex: string,
    issuerId: string
  ): Promise<{
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
  }> {
    await this.init();
    const bytes32Fingerprint = toBytes32(fingerprintHex);

    console.log(`[Blockchain] Submitting certificate registration: ID=${certificateId}, Fingerprint=${fingerprintHex}`);
    const tx = await this.contract!.registerCertificate(certificateId, bytes32Fingerprint, issuerId);
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error(`Blockchain transaction failed with status ${receipt?.status}`);
    }

    console.log(`[Blockchain] Certificate registered in block #${receipt.blockNumber}, tx=${receipt.hash}`);
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Queries on-chain proof for a certificate ID.
   */
  public async getCertificateProof(certificateId: string): Promise<BlockchainProofResult> {
    await this.init();
    try {
      const exists = await this.contract!.certificateExists(certificateId);
      if (!exists) {
        return {
          exists: false,
          isValid: false,
          isRevoked: false,
          registeredFingerprint: '',
          issuerAddress: '',
          issuerId: '',
          issuedAt: 0,
          blockNumber: 0,
        };
      }

      const res = await this.contract!.getCertificate(certificateId);
      // res returns [fingerprint, issuerAddress, issuerId, issuedAt, blockNumber, exists, isRevoked, revokedAt, revocationReason]
      const fingerprintClean = res[0].replace(/^0x/, '');
      return {
        exists: res[5],
        isValid: !res[6],
        isRevoked: res[6],
        registeredFingerprint: fingerprintClean,
        issuerAddress: res[1],
        issuerId: res[2],
        issuedAt: Number(res[3]),
        blockNumber: Number(res[4]),
        revokedAt: Number(res[7]),
        revocationReason: res[8] || undefined,
      };
    } catch (err: any) {
      console.error(`[Blockchain] Error fetching certificate proof for ${certificateId}:`, err.message);
      throw err;
    }
  }

  /**
   * Cross-verifies a candidate fingerprint against the on-chain registered fingerprint.
   */
  public async verifyCertificateOnChain(
    certificateId: string,
    candidateFingerprintHex: string
  ): Promise<{
    exists: boolean;
    isValid: boolean;
    isRevoked: boolean;
    registeredFingerprint: string;
    issuerAddress: string;
  }> {
    await this.init();
    const bytes32Candidate = toBytes32(candidateFingerprintHex);

    try {
      const exists = await this.contract!.certificateExists(certificateId);
      if (!exists) {
        return {
          exists: false,
          isValid: false,
          isRevoked: false,
          registeredFingerprint: '',
          issuerAddress: '',
        };
      }

      const res = await this.contract!.verifyCertificate(certificateId, bytes32Candidate);
      // res returns [isValid, isRevoked, registeredFingerprint, issuerAddress]
      return {
        exists: true,
        isValid: res[0],
        isRevoked: res[1],
        registeredFingerprint: res[2].replace(/^0x/, ''),
        issuerAddress: res[3],
      };
    } catch (err: any) {
      console.error(`[Blockchain] verifyCertificateOnChain error for ${certificateId}:`, err);
      throw err;
    }
  }

  /**
   * Revokes a certificate on the smart contract.
   */
  public async revokeCertificate(
    certificateId: string,
    reason: string
  ): Promise<{
    transactionHash: string;
    blockNumber: number;
  }> {
    await this.init();
    console.log(`[Blockchain] Revoking certificate ${certificateId} with reason: "${reason}"`);
    const tx = await this.contract!.revokeCertificate(certificateId, reason);
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error(`Blockchain revocation transaction failed with status ${receipt?.status}`);
    }

    console.log(`[Blockchain] Certificate revoked in block #${receipt.blockNumber}, tx=${receipt.hash}`);
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Authorizes an issuer address
   */
  public async authorizeIssuer(issuerAddress: string, institutionId: string): Promise<string> {
    await this.init();
    const tx = await this.contract!.authorizeIssuer(issuerAddress, institutionId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Cryptographically signs the SHA-256 certificate fingerprint using the issuer's private key (ECDSA secp256k1).
   */
  public async signCertificateFingerprint(fingerprintHex: string): Promise<{
    signature: string;
    signerAddress: string;
  }> {
    await this.init();
    const signerAddress = await this.signer!.getAddress();
    // Sign the fingerprint message
    const messageBytes = ethers.toUtf8Bytes(fingerprintHex);
    const signature = await this.signer!.signMessage(messageBytes);
    return {
      signature,
      signerAddress,
    };
  }

  /**
   * Verifies an ECDSA digital signature against the fingerprint and expected issuer address.
   */
  public verifySignature(fingerprintHex: string, signature: string, expectedSignerAddress?: string): {
    isValid: boolean;
    recoveredAddress: string;
  } {
    try {
      const messageBytes = ethers.toUtf8Bytes(fingerprintHex);
      const recoveredAddress = ethers.verifyMessage(messageBytes, signature);
      const isValid = expectedSignerAddress
        ? recoveredAddress.toLowerCase() === expectedSignerAddress.toLowerCase()
        : true;
      return { isValid, recoveredAddress };
    } catch {
      return { isValid: false, recoveredAddress: '' };
    }
  }
}

export const blockchainService = new BlockchainService();
