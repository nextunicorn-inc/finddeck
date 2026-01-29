import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

async function syncSchema() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Missing TURSO credentials');
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  console.log('Synchronizing Turso schema...');

  // Full CREATE TABLE DDL from Prisma Schema
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS SupportProgram (
      id TEXT NOT NULL PRIMARY KEY,
      source TEXT NOT NULL,
      sourceId TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      organization TEXT,
      region TEXT,
      applicationStart DATETIME,
      applicationEnd DATETIME,
      url TEXT NOT NULL,
      description TEXT,
      eligibility TEXT,
      viewCount INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      targetAge TEXT,
      targetRegion TEXT,
      targetType TEXT,
      companyAge TEXT,
      supportField TEXT,
      targetIndustry TEXT,
      institutionType TEXT,
      aiSummary TEXT,
      targetDetail TEXT,
      exclusionDetail TEXT,
      applicationTarget TEXT,
      llmProcessed BOOLEAN NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL
    );
  `;

  // Indices
  const indices = [
    `CREATE UNIQUE INDEX IF NOT EXISTS SupportProgram_source_sourceId_key ON SupportProgram(source, sourceId);`,
    `CREATE INDEX IF NOT EXISTS SupportProgram_source_idx ON SupportProgram(source);`,
    `CREATE INDEX IF NOT EXISTS SupportProgram_category_idx ON SupportProgram(category);`,
    `CREATE INDEX IF NOT EXISTS SupportProgram_applicationEnd_idx ON SupportProgram(applicationEnd);`,
    `CREATE INDEX IF NOT EXISTS SupportProgram_targetRegion_idx ON SupportProgram(targetRegion);`,
    `CREATE INDEX IF NOT EXISTS SupportProgram_targetType_idx ON SupportProgram(targetType);`,
    `CREATE INDEX IF NOT EXISTS SupportProgram_companyAge_idx ON SupportProgram(companyAge);`
  ];

  try {
    await client.execute(createTableQuery);
    console.log('Ensure table SupportProgram exists.');

    for (const idx of indices) {
      await client.execute(idx);
    }
    console.log('Indices ensured.');

  } catch (e) {
    console.error('Error creating table:', e);
  }

  // Double check columns (in case table existed but cols missing)
  const columns = ['aiSummary', 'targetDetail', 'exclusionDetail'];
  for (const col of columns) {
    try {
      await client.execute(`ALTER TABLE SupportProgram ADD COLUMN ${col} TEXT;`);
      console.log(`Added column: ${col}`);
    } catch (e: any) {
      // Ignore duplicate column errors
    }
  }

  console.log('Schema sync complete.');
}

syncSchema();
