import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'certichain-secure-jwt-secret-key-32chars-min-university-grade',
  jwtExpiresIn: '7d',
  cookieName: 'certichain_session',
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  dataDir: path.resolve(process.cwd(), '.data'),
  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
    networkName: process.env.BLOCKCHAIN_NETWORK || 'Local Devnet (Chain ID: 31337)',
    chainId: 31337,
    deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY || '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
    issuerPrivateKey: process.env.ISSUER_PRIVATE_KEY || '0x6cbed15c793ce57650b9877cf26f5d7d95718e54388cda9765fe75ec57df7e3e',
  },
};
