import {
	defineRailway,
	github,
	postgres,
	preserve,
	project,
	service,
	volume,
} from "railway/iac";

// Infrastructure as Code for Railway (production). Change it through a PR: the "Railway config" workflow comments the
// plan on the PR and applies it when the release PR (main → production) is merged.
// Anything omitted here is deleted on apply — run `railway config pull` before editing if the dashboard changed.
export default defineRailway(() => {
	const Postgres = postgres("Postgres", { region: "us-east4-eqdc4a" });
	Postgres.deploy = {
		limitOverride: { containers: { cpu: 0.5, memoryBytes: 500000000 } },
	};
	Postgres.networking = { privateNetworkEndpoint: "postgres" };
	const postgresVolume = volume("postgres-volume", {
		alerts: { usage: { "100": {}, "80": {}, "95": {} } },
		allowOnlineResize: true,
		region: "us-east4-eqdc4a",
		sizeMB: 5000,
	});

	const server = service("ext.2", {
		// Deploys the `production` branch (releases are PRs main → production).
		// checkSuites = "Wait for CI": deploys only after the GitHub Actions workflow passes.
		source: github("gugeldev/ext.2", {
			branch: "production",
			checkSuites: true,
		}),
		build: {
			buildEnvironment: "V3",
			builder: "DOCKERFILE",
			// Build context is the repo root (Bun workspace), so no rootDirectory.
			dockerfilePath: "apps/server/Dockerfile",
			watchPatterns: [
				"/apps/server/**",
				"/package.json",
				"/bun.lock",
				"/bunfig.toml",
			],
		},
		replicas: { "us-east4-eqdc4a": 1 },
		deploy: {
			preDeployCommand: ["bun src/db/migrate.ts"],
			healthcheckPath: "/health",
			healthcheckTimeout: 60,
			restartPolicyType: "ON_FAILURE",
			// Single-client API: small caps keep the bill low (Bun idles at a few tens of MB).
			limitOverride: { containers: { cpu: 0.5, memoryBytes: 512000000 } },
		},
		networking: {
			privateNetworkEndpoint: "ext2",
			serviceDomains: { "mundomadam.up.railway.app": { port: 3000 } },
		},
		// PORT is pinned so it matches the domain's target port (Railway would inject 8080 otherwise).
		// Secrets are `preserve()`: the value is set once with `railway variables --set` and never lives in the repo.
		env: {
			DATABASE_URL: Postgres.env.DATABASE_URL,
			PORT: "3000",
			MASTER_PASSWORD: preserve(),
			SEED_STORE_NAME: preserve(),
			SEED_USER_NAME: preserve(),
			SEED_USER_EMAIL: preserve(),
			SEED_USER_PASSWORD: preserve(),
			// Product photos (Cloudflare R2). Only the bucket name lives here; the S3 endpoint, the bucket's token and its
			// public URL are `preserve()` like the other secrets. Set those four before the release that adds this block:
			// with only R2_BUCKET the group is partial and the server refuses to boot (src/env.ts).
			R2_ENDPOINT: preserve(),
			R2_ACCESS_KEY_ID: preserve(),
			R2_SECRET_ACCESS_KEY: preserve(),
			R2_BUCKET: "mundomadam-photos-prod",
			PHOTOS_PUBLIC_URL: preserve(),
		},
	});

	return project("server", {
		variables: { managed: true },
		resources: [server, Postgres, postgresVolume],
	});
});
