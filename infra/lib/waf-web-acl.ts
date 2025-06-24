import { Stack, aws_wafv2, aws_logs, aws_iam, Aws, ArnFormat, RemovalPolicy } from 'aws-cdk-lib'
import { Config } from '../../Config'

export interface WafWebAclResult {
	wafWebAcl: aws_wafv2.CfnWebACL
}

export const createWafWebAcl = (stack: Stack, config: Config, logGroupInfra: aws_logs.LogGroup): WafWebAclResult => {
	// Extract IP addresses from both whitelist arrays
	const allowedIps = [
		...config.txids_whitelist.map(ip => `${ip}/32`),
		...config.ranges_whitelist.map(range => `${range.server}/32`)
	]

	// Create dedicated WAF log group with required naming convention
	const wafLogGroup = new aws_logs.LogGroup(stack, 'wafLogGroup', {
		logGroupName: 'aws-waf-logs-shepherd',
		retention: aws_logs.RetentionDays.ONE_MONTH,
		removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
	})

	// Create WAF Web ACL with IP allowlist rule
	const wafWebAcl = new aws_wafv2.CfnWebACL(stack, 'shepherdWafWebAcl', {
		name: 'shepherd-waf-web-acl',
		description: 'WAF Web ACL for Shepherd ALB with IP allowlist',
		scope: 'REGIONAL',
		defaultAction: {
			block: {}
		},
		rules: [
			{
				name: 'IPAllowlistRule',
				priority: 1,
				statement: {
					ipSetReferenceStatement: {
						arn: new aws_wafv2.CfnIPSet(stack, 'shepherdAllowedIps', {
							name: 'shepherd-allowed-ips',
							description: 'Allowed IP addresses for Shepherd',
							scope: 'REGIONAL',
							ipAddressVersion: 'IPV4',
							addresses: allowedIps,
						}).attrArn,
					},
				},
				action: {
					allow: {}
				},
				visibilityConfig: {
					sampledRequestsEnabled: true,
					cloudWatchMetricsEnabled: true,
					metricName: 'IPAllowlistRule',
				},
			},
		],
		visibilityConfig: {
			sampledRequestsEnabled: true,
			cloudWatchMetricsEnabled: true,
			metricName: 'ShepherdWafWebAcl',
		},
	})

	// Create WAF logging configuration to CloudWatch Logs with correct ARN format
	new aws_wafv2.CfnLoggingConfiguration(stack, 'wafLoggingConfig', {
		logDestinationConfigs: [
			`arn:aws:logs:${config.region}:${Aws.ACCOUNT_ID}:log-group:aws-waf-logs-shepherd`,
		],
		resourceArn: wafWebAcl.attrArn,
	})

	// Grant WAF permissions to write to CloudWatch Logs
	wafLogGroup.addToResourcePolicy(new aws_iam.PolicyStatement({
		effect: aws_iam.Effect.ALLOW,
		principals: [new aws_iam.ServicePrincipal('delivery.logs.amazonaws.com')],
		actions: [
			'logs:CreateLogStream',
			'logs:PutLogEvents',
		],
		resources: [wafLogGroup.logGroupArn],
		conditions: {
			StringEquals: {
				'aws:SourceAccount': Aws.ACCOUNT_ID,
			},
		},
	}))

	return {
		wafWebAcl,
	}
} 
