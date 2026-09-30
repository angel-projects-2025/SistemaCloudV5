import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { S3Client, ListBucketsCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, ListTablesCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { IAMClient, ListUsersCommand, ListRolesCommand, GetAccountSummaryCommand, ListAttachedUserPoliciesCommand, ListUserPoliciesCommand, ListMFADevicesCommand } from '@aws-sdk/client-iam';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const AWS_REGION = process.env.AWS_REGION || 'us-east-2';

app.use(cors());
app.use(express.json());

const CREDENTIALS = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
};

interface Ec2InstanceSummary {
  id: string;
  state: string;
  type: string;
  publicIp: string | null;
  region: string;
}

interface S3BucketSummary {
  name: string;
  region: string;
  status: string;
}

interface DynamoTableSummary {
  name: string;
  region: string;
  primaryKey: string;
  status: string;
}

interface ServiceResource {
  id: string;
  name: string;
  count: number;
  instances?: Ec2InstanceSummary[];
  buckets?: S3BucketSummary[];
  tables?: DynamoTableSummary[];
}

function normalizeS3Region(location: string | undefined): string {
  if (!location || location === '') return 'us-east-1';
  return location;
}

async function fetchEc2Instances(region: string): Promise<Ec2InstanceSummary[]> {
  try {
    const ec2 = new EC2Client({ region, credentials: CREDENTIALS });
    const response = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [{ Name: 'instance-state-name', Values: ['running', 'pending', 'stopping', 'stopped'] }],
      }),
      { abortSignal: AbortSignal.timeout(4000) }
    );

    const instances: Ec2InstanceSummary[] = [];
    for (const reservation of response.Reservations ?? []) {
      for (const instance of reservation.Instances ?? []) {
        instances.push({
          id: instance.InstanceId ?? '',
          state: instance.State?.Name ?? 'unknown',
          type: instance.InstanceType ?? 'unknown',
          publicIp: instance.PublicIpAddress ?? null,
          region,
        });
      }
    }
    return instances;
  } catch {
    return [];
  }
}

async function fetchS3BucketsInRegion(region: string): Promise<S3BucketSummary[]> {
  try {
    const s3 = new S3Client({ region, credentials: CREDENTIALS });
    const list = await s3.send(new ListBucketsCommand({}), {
      abortSignal: AbortSignal.timeout(4000),
    });

    const buckets: S3BucketSummary[] = [];
    for (const bucket of list.Buckets ?? []) {
      if (!bucket.Name) continue;
      try {
        const loc = await s3.send(new GetBucketLocationCommand({ Bucket: bucket.Name }), {
          abortSignal: AbortSignal.timeout(2000),
        });
        const bucketRegion = normalizeS3Region(loc.LocationConstraint);
        if (bucketRegion === region) {
          buckets.push({
            name: bucket.Name,
            region: bucketRegion,
            status: 'available',
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Error S3:', message);
      }
    }
    return buckets;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error S3:', message);
    return [];
  }
}

async function fetchDynamoTables(region: string): Promise<DynamoTableSummary[]> {
  try {
    const ddb = new DynamoDBClient({ region, credentials: CREDENTIALS });
    const response = await ddb.send(new ListTablesCommand({}), {
      abortSignal: AbortSignal.timeout(4000),
    });
    const tableNames = response.TableNames ?? [];

    const tables: DynamoTableSummary[] = [];
    for (const tableName of tableNames) {
      let primaryKey = 'Partition Key';
      let status = 'ACTIVE';
      try {
        const desc = await ddb.send(new DescribeTableCommand({ TableName: tableName }), {
          abortSignal: AbortSignal.timeout(2000),
        });
        const pk = (desc.Table?.KeySchema ?? []).find((k) => k.KeyType === 'HASH');
        const attrName = pk?.AttributeName;
        const attrType = (desc.Table?.AttributeDefinitions ?? []).find(
          (a) => a.AttributeName === attrName
        )?.AttributeType;
        if (attrName) {
          const typeMap: Record<string, string> = { S: 'String', N: 'Number', B: 'Binary' };
          primaryKey = attrType ? `${attrName} (${typeMap[attrType] ?? attrType})` : attrName;
        }
        status = desc.Table?.TableStatus ?? 'ACTIVE';
      } catch {
        // fallback si DescribeTable falla
      }
      tables.push({
        name: tableName,
        region,
        primaryKey,
        status,
      });
    }
    return tables;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error DynamoDB ${region}:`, message);
    return [];
  }
}

app.get('/api/aws/instances', async (req: Request, res: Response) => {
  const region =
    typeof req.query.region === 'string' && req.query.region.trim()
      ? req.query.region.trim()
      : AWS_REGION;

  try {
    const [instances, buckets, tables] = await Promise.all([
      fetchEc2Instances(region),
      fetchS3BucketsInRegion(region),
      fetchDynamoTables(region),
    ]);

    const services: ServiceResource[] = [];

    if (instances.length > 0) {
      services.push({ id: 'ec2', name: 'Amazon EC2', count: instances.length, instances });
    }
    if (buckets.length > 0) {
      services.push({ id: 's3', name: 'Amazon S3', count: buckets.length, buckets });
    }
    if (tables.length > 0) {
      services.push({ id: 'dynamodb', name: 'Amazon DynamoDB', count: tables.length, tables });
    }

    res.json({
      region,
      count: instances.length,
      instances,
      services,
      status: 'AVAILABLE',
    });
  } catch {
    res.status(200).json({
      region,
      count: 0,
      instances: [],
      services: [],
      status: 'UNAVAILABLE',
      message: 'Región no habilitada o tiempo de respuesta agotado',
    });
  }
});

interface IamUserSummary {
  userName: string;
  arn: string;
  createDate: string | null;
  policies: string[];
}

const IAM_REGION = 'us-east-1';

app.get('/api/iam', async (_req: Request, res: Response) => {
  try {
    const iam = new IAMClient({
      region: IAM_REGION,
      credentials: CREDENTIALS,
    });

    const [usersRes, rolesRes, summaryRes] = await Promise.all([
      iam.send(new ListUsersCommand({ MaxItems: 100 }), {
        abortSignal: AbortSignal.timeout(4000),
      }),
      iam.send(new ListRolesCommand({ MaxItems: 100 }), {
        abortSignal: AbortSignal.timeout(4000),
      }),
      iam.send(new GetAccountSummaryCommand({}), {
        abortSignal: AbortSignal.timeout(4000),
      }),
    ]);

    const rawUsers = usersRes.Users ?? [];
    const roleCount = rolesRes.Roles?.length ?? 0;
    const summaryMap = summaryRes.SummaryMap ?? {};
    const policyCount =
      typeof summaryMap.Policies === 'number' ? summaryMap.Policies : 0;

    let mfaUsersCount = 0;
    const usersList: IamUserSummary[] = await Promise.all(
      rawUsers.map(async (user) => {
        const userName = user.UserName ?? '';
        let policies: string[] = [];
        let hasMfa = false;

        try {
          const [attached, inline, mfa] = await Promise.all([
            iam
              .send(new ListAttachedUserPoliciesCommand({ UserName: userName }), {
                abortSignal: AbortSignal.timeout(3000),
              })
              .catch(() => null),
            iam
              .send(new ListUserPoliciesCommand({ UserName: userName }), {
                abortSignal: AbortSignal.timeout(3000),
              })
              .catch(() => null),
            iam
              .send(new ListMFADevicesCommand({ UserName: userName }), {
                abortSignal: AbortSignal.timeout(3000),
              })
              .catch(() => null),
          ]);

          const attachedNames = (attached?.AttachedPolicies ?? [])
            .map((p) => p.PolicyName)
            .filter((n): n is string => Boolean(n));
          const inlineNames = inline?.PolicyNames ?? [];
          policies = [...new Set([...attachedNames, ...inlineNames])];
          hasMfa = (mfa?.MFADevices ?? []).length > 0;
        } catch {
          policies = [];
          hasMfa = false;
        }

        if (hasMfa) mfaUsersCount += 1;

        return {
          userName,
          arn: user.Arn ?? '',
          createDate: user.CreateDate ? user.CreateDate.toISOString() : null,
          policies,
        };
      })
    );

    res.status(200).json({
      userCount: usersList.length,
      roleCount,
      policyCount,
      mfaUsersCount,
      usersList,
      status: 'ok',
    });
  } catch (error) {
    console.error('Error en AWS IAM API:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message });
  }
});

interface CostServiceItem {
  id: string;
  name: string;
  monthly: number;
  annual: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function mapCeServiceName(raw: string): { id: string; name: string } {
  const lower = raw.toLowerCase();
  if (lower.includes('elastic compute') || lower.includes('ec2')) {
    return { id: 'ec2', name: 'Amazon EC2' };
  }
  if (lower.includes('simple storage') || lower.includes('s3')) {
    return { id: 's3', name: 'Amazon S3' };
  }
  if (lower.includes('dynamodb')) {
    return { id: 'dynamodb', name: 'Amazon DynamoDB' };
  }
  if (lower.includes('identity') || lower.includes('iam')) {
    return { id: 'iam', name: 'AWS IAM' };
  }
  if (lower.includes('cloudwatch')) {
    return { id: 'cloudwatch', name: 'Amazon CloudWatch' };
  }
  const id = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  return { id: id || 'other', name: raw };
}

const EC2_HOURLY_USD: Record<string, number> = {
  't3.micro': 0.0104,
  't2.micro': 0.0116,
  't3.small': 0.0208,
  't2.small': 0.023,
  't3.medium': 0.0416,
  't2.medium': 0.0464,
  't3.large': 0.0832,
  'm5.large': 0.096,
};

async function inspectRealResources(): Promise<{
  iamUsers: number;
  s3Buckets: number;
  ec2Instances: number;
  resourceTotal: number;
}> {
  const [iamUsers, s3Buckets, ec2Instances] = await Promise.all([
    (async () => {
      try {
        const iam = new IAMClient({ region: IAM_REGION, credentials: CREDENTIALS });
        const res = await iam.send(new ListUsersCommand({ MaxItems: 100 }), {
          abortSignal: AbortSignal.timeout(4000),
        });
        return res.Users?.length ?? 0;
      } catch (err) {
        console.error('Cost fallback IAM:', err instanceof Error ? err.message : err);
        return 0;
      }
    })(),
    (async () => {
      try {
        const s3 = new S3Client({ region: AWS_REGION, credentials: CREDENTIALS });
        const res = await s3.send(new ListBucketsCommand({}), {
          abortSignal: AbortSignal.timeout(4000),
        });
        return res.Buckets?.length ?? 0;
      } catch (err) {
        console.error('Cost fallback S3:', err instanceof Error ? err.message : err);
        return 0;
      }
    })(),
    (async () => {
      try {
        const instances = await fetchEc2Instances(AWS_REGION);
        return instances.filter((i) => i.state === 'running' || i.state === 'pending').length;
      } catch {
        return 0;
      }
    })(),
  ]);

  return {
    iamUsers,
    s3Buckets,
    ec2Instances,
    resourceTotal: iamUsers + s3Buckets + ec2Instances,
  };
}

async function estimateCostsFromResources(): Promise<{
  services: CostServiceItem[];
  monthlyTotal: number;
  annualTotal: number;
  resourceTotal: number;
  iamUsers: number;
  s3Buckets: number;
  ec2Instances: number;
  source: 'resource-estimate';
}> {
  const resources = await inspectRealResources();
  const hoursInMonth = 730;

  let ec2Monthly = 0;
  if (resources.ec2Instances > 0) {
    try {
      const ec2 = new EC2Client({ region: AWS_REGION, credentials: CREDENTIALS });
      const response = await ec2.send(
        new DescribeInstancesCommand({
          Filters: [{ Name: 'instance-state-name', Values: ['running', 'pending'] }],
        }),
        { abortSignal: AbortSignal.timeout(4000) }
      );
      for (const reservation of response.Reservations ?? []) {
        for (const instance of reservation.Instances ?? []) {
          const type = instance.InstanceType ?? 't3.micro';
          const hourly = EC2_HOURLY_USD[type] ?? 0.02;
          ec2Monthly += hourly * hoursInMonth;
        }
      }
    } catch {
      ec2Monthly = resources.ec2Instances * 0.0104 * hoursInMonth;
    }
  }

  const s3Monthly = resources.s3Buckets * 0.23;
  const iamMonthly = 0;

  const services: CostServiceItem[] = [];
  if (resources.ec2Instances > 0 || resources.s3Buckets > 0 || resources.iamUsers > 0) {
    if (resources.ec2Instances > 0) {
      services.push({
        id: 'ec2',
        name: 'Amazon EC2',
        monthly: roundMoney(ec2Monthly),
        annual: roundMoney(ec2Monthly * 12),
      });
    }
    if (resources.s3Buckets > 0) {
      services.push({
        id: 's3',
        name: 'Amazon S3',
        monthly: roundMoney(s3Monthly),
        annual: roundMoney(s3Monthly * 12),
      });
    }
    services.push({
      id: 'iam',
      name: 'AWS IAM',
      monthly: iamMonthly,
      annual: 0,
    });
  }

  const monthlyTotal = roundMoney(services.reduce((sum, s) => sum + s.monthly, 0));
  return {
    services,
    monthlyTotal,
    annualTotal: roundMoney(monthlyTotal * 12),
    resourceTotal: resources.resourceTotal,
    iamUsers: resources.iamUsers,
    s3Buckets: resources.s3Buckets,
    ec2Instances: resources.ec2Instances,
    source: 'resource-estimate',
  };
}

app.get('/api/costs/real', async (_req: Request, res: Response) => {
  try {
    const { start, end } = currentMonthRange();
    const ce = new CostExplorerClient({
      region: 'us-east-1',
      credentials: CREDENTIALS,
    });

    const response = await ce.send(
      new GetCostAndUsageCommand({
        TimePeriod: { Start: start, End: end },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
        GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      }),
      { abortSignal: AbortSignal.timeout(6000) }
    );

    const byService = new Map<string, number>();
    for (const period of response.ResultsByTime ?? []) {
      for (const group of period.Groups ?? []) {
        const rawName = group.Keys?.[0]?.trim() || 'Other';
        const amount = Number(group.Metrics?.UnblendedCost?.Amount ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        byService.set(rawName, (byService.get(rawName) ?? 0) + amount);
      }
      if ((period.Groups ?? []).length === 0) {
        const total = Number(period.Total?.UnblendedCost?.Amount ?? 0);
        if (Number.isFinite(total) && total > 0) {
          byService.set('Other', (byService.get('Other') ?? 0) + total);
        }
      }
    }

    const services: CostServiceItem[] = [];
    for (const [rawName, amount] of byService.entries()) {
      const mapped = mapCeServiceName(rawName);
      const monthly = roundMoney(amount);
      services.push({
        id: mapped.id,
        name: mapped.name,
        monthly,
        annual: roundMoney(monthly * 12),
      });
    }
    services.sort((a, b) => b.monthly - a.monthly);

    const monthlyTotal = roundMoney(services.reduce((sum, s) => sum + s.monthly, 0));

    if (monthlyTotal > 0 && services.length > 0) {
      const resources = await inspectRealResources().catch(() => ({
        iamUsers: 0,
        s3Buckets: 0,
        ec2Instances: 0,
        resourceTotal: services.length,
      }));

      res.status(200).json({
        services,
        monthlyTotal,
        annualTotal: roundMoney(monthlyTotal * 12),
        resourceTotal: resources.resourceTotal,
        iamUsers: resources.iamUsers,
        s3Buckets: resources.s3Buckets,
        ec2Instances: resources.ec2Instances,
        period: { start, end },
        source: 'cost-explorer',
        status: 'ok',
      });
      return;
    }

    console.warn('Cost Explorer sin importes; usando inspección de recursos reales');
    const estimated = await estimateCostsFromResources();
    res.status(200).json({
      ...estimated,
      period: { start, end },
      message: 'Cost Explorer sin datos o en $0; costo estimado por recursos reales',
      status: 'ok',
    });
  } catch (error) {
    console.error('Error en AWS Cost Explorer API:', error);
    try {
      const estimated = await estimateCostsFromResources();
      res.status(200).json({
        ...estimated,
        period: currentMonthRange(),
        message: 'Cost Explorer no disponible; costo estimado por recursos reales',
        status: 'ok',
      });
    } catch (fallbackError) {
      const message =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      res.status(500).json({ message });
    }
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', region: AWS_REGION });
});

app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
  console.log(`Región AWS: ${AWS_REGION}`);
  console.log('Endpoint EC2/S3/DynamoDB: GET /api/aws/instances');
  console.log('Endpoint IAM: GET /api/iam');
  console.log('Endpoint Costos: GET /api/costs/real');
});
