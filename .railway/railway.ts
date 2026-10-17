import {
	defineRailway,
	github,
	postgres,
	project,
	service,
	volume,
} from "railway/iac";

// Infrastructure as Code for Railway (production). Apply with `railway config plan` / `railway config apply`.
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
		// checkSuites = "Wait for CI": deploys only after the GitHub Actions workflow passes.
		source: github("gugeldev/ext.2", { branch: "main", checkSuites: true }),
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
			limitOverride: { containers: { cpu: 2, memoryBytes: 2000000000 } },
		},
		networking: {
			privateNetworkEndpoint: "ext2",
			serviceDomains: { "ext2-production.up.railway.app": { port: 3000 } },
		},
		// PORT is pinned so it matches the domain's target port (Railway would inject 8080 otherwise).
		env: { DATABASE_URL: Postgres.env.DATABASE_URL, PORT: "3000" },
	});

	return project("server", {
		variables: { managed: true },
		resources: [server, Postgres, postgresVolume],
	});
});
