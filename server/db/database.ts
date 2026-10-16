import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Institution, Certificate, AuditEvent, VerificationEvent } from '../types/index.ts';
import { config } from '../config';

interface DatabaseSchema {
  users: User[];
  institutions: Institution[];
  certificates: Certificate[];
  auditEvents: AuditEvent[];
  verificationEvents: VerificationEvent[];
  systemConfig: {
    contractAddress?: string;
    deployedAt?: string;
    network?: string;
  };
}

class Database {
  private data: DatabaseSchema = {
    users: [],
    institutions: [],
    certificates: [],
    auditEvents: [],
    verificationEvents: [],
    systemConfig: {},
  };
  private filePath: string;
  private isLoaded = false;

  constructor() {
    this.filePath = path.join(config.dataDir, 'db.json');
  }

  public async init(): Promise<void> {
    if (this.isLoaded) return;

    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`[Database] Loaded persistent data: ${this.data.certificates.length} certificates, ${this.data.users.length} users.`);
      } catch (err) {
        console.error('[Database] Failed to parse db.json, creating fresh instance:', err);
        await this.seedDemoData();
      }
    } else {
      console.log('[Database] Initializing fresh database with demonstration data...');
      await this.seedDemoData();
    }

    this.isLoaded = true;
  }

  private async persist(): Promise<void> {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[Database] Error persisting data to disk:', err);
    }
  }

  // --- Users ---
  public async findUserByEmail(email: string): Promise<User | undefined> {
    await this.init();
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public async findUserById(id: string): Promise<User | undefined> {
    await this.init();
    return this.data.users.find(u => u.id === id);
  }

  public async getAllUsers(): Promise<User[]> {
    await this.init();
    return [...this.data.users];
  }

  public async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    await this.init();
    const existing = await this.findUserByEmail(user.email);
    if (existing) {
      throw new Error(`User with email "${user.email}" already exists.`);
    }
    const now = new Date().toISOString();
    const newUser: User = {
      ...user,
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(newUser);
    await this.persist();
    return newUser;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await this.init();
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error(`User with ID ${id} not found.`);
    this.data.users[index] = {
      ...this.data.users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.data.users[index];
  }

  // --- Institutions ---
  public async getInstitutionById(id: string): Promise<Institution | undefined> {
    await this.init();
    return this.data.institutions.find(i => i.id === id);
  }

  public async getAllInstitutions(): Promise<Institution[]> {
    await this.init();
    return [...this.data.institutions];
  }

  public async createInstitution(inst: Omit<Institution, 'createdAt' | 'updatedAt'>): Promise<Institution> {
    await this.init();
    const now = new Date().toISOString();
    const newInst: Institution = {
      ...inst,
      createdAt: now,
      updatedAt: now,
    };
    this.data.institutions.push(newInst);
    await this.persist();
    return newInst;
  }

  public async updateInstitution(id: string, updates: Partial<Institution>): Promise<Institution> {
    await this.init();
    const index = this.data.institutions.findIndex(i => i.id === id);
    if (index === -1) throw new Error(`Institution with ID ${id} not found.`);
    this.data.institutions[index] = {
      ...this.data.institutions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.data.institutions[index];
  }

  // --- Certificates ---
  public async getCertificateById(id: string): Promise<Certificate | undefined> {
    await this.init();
    const normalizedId = id.trim().toUpperCase();
    return this.data.certificates.find(c => c.id.toUpperCase() === normalizedId);
  }

  public async getAllCertificates(filter?: {
    studentId?: string;
    studentUserId?: string;
    institutionId?: string;
    issuanceState?: string;
    search?: string;
  }): Promise<Certificate[]> {
    await this.init();
    let result = [...this.data.certificates];

    if (filter?.studentUserId) {
      result = result.filter(c => c.studentUserId === filter.studentUserId);
    } else if (filter?.studentId) {
      result = result.filter(c => c.studentId.toUpperCase() === filter.studentId?.toUpperCase());
    }

    if (filter?.institutionId) {
      result = result.filter(c => c.institutionId === filter.institutionId);
    }

    if (filter?.issuanceState) {
      result = result.filter(c => c.issuanceState === filter.issuanceState);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.studentName.toLowerCase().includes(q) ||
        c.studentId.toLowerCase().includes(q) ||
        c.degreeName.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
      );
    }

    // Sort descending by issuedAt
    return result.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  public async createCertificate(cert: Certificate): Promise<Certificate> {
    await this.init();
    const existing = await this.getCertificateById(cert.id);
    if (existing) {
      throw new Error(`Certificate with ID ${cert.id} already exists.`);
    }
    this.data.certificates.push(cert);
    await this.persist();
    return cert;
  }

  public async updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate> {
    await this.init();
    const normalizedId = id.trim().toUpperCase();
    const index = this.data.certificates.findIndex(c => c.id.toUpperCase() === normalizedId);
    if (index === -1) throw new Error(`Certificate with ID ${id} not found.`);
    this.data.certificates[index] = {
      ...this.data.certificates[index],
      ...updates,
    };
    await this.persist();
    return this.data.certificates[index];
  }

  // --- Audit Events ---
  public async logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    await this.init();
    const newEvent: AuditEvent = {
      ...event,
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditEvents.unshift(newEvent);
    if (this.data.auditEvents.length > 500) {
      this.data.auditEvents = this.data.auditEvents.slice(0, 500);
    }
    await this.persist();
    return newEvent;
  }

  public async getAuditEvents(limit = 100): Promise<AuditEvent[]> {
    await this.init();
    return this.data.auditEvents.slice(0, limit);
  }

  // --- Verification Events ---
  public async logVerificationEvent(event: Omit<VerificationEvent, 'id' | 'timestamp'>): Promise<VerificationEvent> {
    await this.init();
    const newEvent: VerificationEvent = {
      ...event,
      id: `VERIFY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.verificationEvents.unshift(newEvent);
    if (this.data.verificationEvents.length > 1000) {
      this.data.verificationEvents = this.data.verificationEvents.slice(0, 1000);
    }
    await this.persist();
    return newEvent;
  }

  public async getVerificationEvents(limit = 100): Promise<VerificationEvent[]> {
    await this.init();
    return this.data.verificationEvents.slice(0, limit);
  }

  // --- System Config ---
  public async getSystemConfig(): Promise<DatabaseSchema['systemConfig']> {
    await this.init();
    return this.data.systemConfig || {};
  }

  public async setSystemConfig(configUpdates: Partial<DatabaseSchema['systemConfig']>): Promise<void> {
    await this.init();
    this.data.systemConfig = {
      ...this.data.systemConfig,
      ...configUpdates,
    };
    await this.persist();
  }

  // --- Demo Seeder ---
  public async seedDemoData(): Promise<void> {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const now = new Date().toISOString();

    const institution: Institution = {
      id: 'INST-APEX-001',
      name: 'Apex Institute of Technology & Science',
      code: 'APEX',
      officialDomain: 'apex.edu',
      authorizedIssuerAddresses: [
        '0x00796ac74a2D4CEb20D9FedC71F300e283008839',
        '0xA175DED801e9555F4d9320DdADc4367f799bEe21',
      ],
      profileDetails: {
        chancellor: 'Dr. Evelyn Vance, Ph.D.',
        accreditation: 'Global Engineering & Academic Accreditation Board (GEAAB #8892)',
        address: '450 Innovation Parkway, Cambridge, MA 02142',
        logoBadgeText: 'AITS',
      },
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const users: User[] = [
      {
        id: 'USER-ADMIN-001',
        name: 'Dr. Arthur Sterling',
        email: 'admin@apex.edu',
        passwordHash,
        role: 'admin',
        accountStatus: 'active',
        institutionId: 'INST-APEX-001',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'USER-ISSUER-001',
        name: 'Elena Rostova',
        email: 'issuer@apex.edu',
        passwordHash,
        role: 'issuer',
        accountStatus: 'active',
        institutionId: 'INST-APEX-001',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'USER-STUDENT-001',
        name: 'Alex Chen',
        email: 'alex.chen@student.apex.edu',
        passwordHash,
        role: 'student',
        accountStatus: 'active',
        studentId: 'STU-2026-9041',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'USER-STUDENT-002',
        name: 'Maria Santos',
        email: 'maria.santos@student.apex.edu',
        passwordHash,
        role: 'student',
        accountStatus: 'active',
        studentId: 'STU-2026-9042',
        createdAt: now,
        updatedAt: now,
      },
    ];

    this.data.institutions = [institution];
    this.data.users = users;
    this.data.certificates = [];
    this.data.auditEvents = [
      {
        id: `AUDIT-${Date.now()}-1`,
        actorId: 'SYSTEM',
        actorName: 'CertiChain System Seeder',
        actorRole: 'system',
        action: 'ISSUER_AUTHORIZED',
        targetRecord: 'INST-APEX-001',
        timestamp: now,
        correlationId: 'INIT-BOOTSTRAP',
        metadata: { institutionName: institution.name },
      },
    ];
    this.data.verificationEvents = [];
    this.data.systemConfig = {};

    await this.persist();
  }
}

export const db = new Database();
