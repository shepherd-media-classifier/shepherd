import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { randomLetters } from './utils';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfraStack extends cdk.Stack {
  constructor(app: Construct, id: string, props?: cdk.StackProps) {
    super(app, id, props);
    const stack = this // idc for `this`

    /** create the main network stack */

    const vpc = new cdk.aws_ec2.Vpc(stack, 'shepherd-vpc', {
      vpcName: 'shepherd-vpc',
      maxAzs: 2,
      natGateways: 1,
      /** 
       * need separate cidr for each vpc / shepherd installation, if we are connecting them via vpn peering / tailnet.
       * n.b. legacy shepherd uses '10.0.0.0/16', maybe we need peering during cdk migration?
       */
      cidr: '10.1.0.0/16', //hard-coded for now
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    })

    // N.B. removing cluster to services stack 


    const alb = new cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer(this, 'alb', {
      vpc,
      loadBalancerName: 'shepherd-alb',
      internetFacing: true,
      http2Enabled: false,
      // deletionProtection: true, //might want this in prod!!!
      dropInvalidHeaderFields: true,
    })
    // !!! alb has an SG auto created !!!
    alb.loadBalancerSecurityGroups

    /** general log group for the vpc */
    const logGroup = new cdk.aws_logs.LogGroup(this, 'logGroup', {
      logGroupName: 'shepherd-logs',
      retention: cdk.aws_logs.RetentionDays.THREE_MONTHS,
    })


    /** create the postgres rds database */
    const { sgPgdb, pgdb } = pgdbAndAccess(stack, vpc)

    /** create input bucket, and queues */
    const { inputBucket, sqsInputQ } = bucketAndNotificationQs(stack, vpc)

    /** cfn outputs */
    new cdk.CfnOutput(stack, 'AwsAccountId', { value: cdk.Aws.ACCOUNT_ID })
    new cdk.CfnOutput(stack, 'ShepherdVPC', { value: vpc.vpcId })
    new cdk.CfnOutput(stack, 'ShepherdSecurityGroup', { value: sgPgdb.securityGroupId })
    new cdk.CfnOutput(stack, 'RdsEndpointUrl', { value: pgdb.dbInstanceEndpointAddress })
    // new cdk.CfnOutput(stack, 'SQSFeederQueue', { value: sqsFeederQueue.queueUrl })
    new cdk.CfnOutput(stack, 'S3Bucket', { value: inputBucket.bucketName })
    new cdk.CfnOutput(stack, 'SQSInputQueue', { value: sqsInputQ.queueUrl })
    new cdk.CfnOutput(stack, 'LogGroupArn', { value: logGroup.logGroupArn }) //move to services stack?
    new cdk.CfnOutput(stack, 'LoadBalancerArn', { value: alb.loadBalancerArn })
    new cdk.CfnOutput(stack, 'LoadBalancerDnsName', { value: alb.loadBalancerDnsName })
  }
}

const pgdbAndAccess = (stack: cdk.Stack, vpc: cdk.aws_ec2.Vpc) => {

  /** create the security group for the postgres rds database */
  const sgPgdb = new cdk.aws_ec2.SecurityGroup(stack, 'shepherd-pgdb-sg', {
    vpc,
    allowAllOutbound: true,
    securityGroupName: 'shepherd-pgdb-sg',
  })
  sgPgdb.addIngressRule(cdk.aws_ec2.Peer.ipv4(vpc.vpcCidrBlock), cdk.aws_ec2.Port.tcp(5432), 'allow db traffic') // allow traffic from within the vpc

  /** create the postgres rds database */
  const pgdb = new cdk.aws_rds.DatabaseInstance(stack, 'shepherd-pgdb', {
    vpc,
    instanceIdentifier: 'shepherd-pgdb',
    engine: cdk.aws_rds.DatabaseInstanceEngine.postgres({
      version: cdk.aws_rds.PostgresEngineVersion.VER_13_10,
    }),
    autoMinorVersionUpgrade: true,
    instanceType: new cdk.aws_ec2.InstanceType('t3.xlarge'),
    allocatedStorage: 80,
    storageType: cdk.aws_rds.StorageType.GP2,
    deletionProtection: true,
    removalPolicy: cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    databaseName: 'arblacklist',  //legacy
    credentials: {
      username: 'postgres',
      password: cdk.SecretValue.plainText('postgres'),
    },
    vpcSubnets: {
      subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
    },
    securityGroups: [sgPgdb],
  })

  return {
    sgPgdb,
    pgdb,
  }
}

const bucketAndNotificationQs = (stack: cdk.Stack, vpc: cdk.aws_ec2.Vpc) => {

  /** create AWS_SQS_INPUT_QUEUE, with DLQ and policies */
  const sqsInputDLQ = new cdk.aws_sqs.Queue(stack, 'shepherd-input-dlq', {
    queueName: 'shepherd-input-dlq',
    retentionPeriod: cdk.Duration.days(14),
  })
  const sqsInputQ = new cdk.aws_sqs.Queue(stack, 'shepherd-input-q', {
    queueName: 'shepherd-input',
    retentionPeriod: cdk.Duration.days(14),
    visibilityTimeout: cdk.Duration.minutes(15),
    deadLetterQueue: {
      maxReceiveCount: 3,
      queue: sqsInputDLQ,
    },
  })

  /** create the input bucket */
  const inputBucket = new cdk.aws_s3.Bucket(stack, 'shepherd-input', {
    accessControl: cdk.aws_s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
    bucketName: `shepherd-input-${cdk.Aws.REGION}`,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  })
  inputBucket.addObjectCreatedNotification(new cdk.aws_s3_notifications.SqsDestination(sqsInputQ))

  return {
    sqsInputQ,
    inputBucket,
  }
}
