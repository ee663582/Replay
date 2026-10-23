# Relay — context that travels well

Relay is a hackathon prototype for creating scoped conversation handoffs. Its landing page opens with an interactive thread-to-capsule illustration, then explains explicit privacy boundaries and version freshness before the existing workspace. The hero selection imports into the workspace; pasted text can be extracted into editable decisions, constraints, open questions, and next actions, then previewed from the recipient's perspective.

## Run locally

Requires Node.js 24+ and npm. The focused tests use Node's built-in TypeScript stripping support.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. To try the in-page MCP tools, leave Vite running and start `npm run mcp` in a second terminal; then connect from the **Try the Relay MCP server** panel in the workspace. Run the focused tests with `npm test`. To make a production build, run `npm run build`.

## Demo flow (about 90 seconds)

1. Start with the prefilled neighborhood repair-café conversation. Point out the `[PRIVATE — exclude from shared capsule]` section, which includes a phone number and sensitive personal detail.
2. Click **Extract context**. The browser-side prototype classifies lines with simple keyword rules; it is a demonstration heuristic, not an AI model. With the privacy filter on, text after an explicit `[PRIVATE ...]` marker is excluded from extraction. Editing the conversation or changing that filter requires another extraction before publishing.
3. Edit or remove a decision, question, or next action. Add a note to show that the capsule is reviewable and selective.
4. Choose a recipient and click **Create handoff**. The recipient tab shows the frozen shared copy.
5. Return to **Build capsule**, edit a detail or action state, and reopen **Recipient view**. The old copy remains visible with an out-of-date label until **Refresh copy** is clicked. The snapshot retains the recipient and version it was published with.
6. Choose **Revoke this handoff** to hide the snapshot in the simulated recipient view. Editing the draft does not restore it; restoring or publishing a new version is an explicit action.

## What this prototype does and does not do

- Runs entirely in the browser. Drafts and the published snapshot are stored in versioned local browser storage and can be recovered after reload. This storage is not encrypted, shared between people, or a secure multi-user access-control system. Clearing browser data removes the saved demo.
- Includes a simple local text-classification heuristic and editing flow. It does not use a language model.
- The “Copy demo placeholder” control may copy a hard-coded example string; it does not create a reachable public link. Clipboard failures are reported.
- This is an **Alexa+ concept experience simulation** only. It does not connect to Alexa+, Alexa devices, accounts, or conversation history. The browser app has a separate optional Amazon Bedrock integration through the local MCP server; it is not an Alexa+ or Amazon customer-facing integration.
- Privacy exclusion is a visible prototype rule based on an explicit `[PRIVATE ...]` marker. It is not a general sensitive-data detector or a production privacy guarantee. Review all extracted content before publishing.

## Stack

React, TypeScript, Vite, Tailwind CSS 4, and Lucide icons.

## MCP integration

Relay includes a self-hosted, stateless MCP server on the **Streamable HTTP** transport at `http://127.0.0.1:8787/mcp`. It uses the official TypeScript MCP SDK and advertises the `2025-11-25` protocol version.

Start the server in a separate terminal:

```sh
npm run mcp
```

The local extraction mode needs no cloud credentials. Check the service at `http://127.0.0.1:8787/health`, or connect an MCP client such as VS Code with `.vscode/mcp.json`:

```json
{
  "servers": {
    "relay": {
      "type": "http",
      "url": "http://127.0.0.1:8787/mcp"
    }
  }
}
```

The server exposes:

- `relay_extract_context`: prepare decisions, constraints, open questions, and next actions. By default, the explicit `[PRIVATE ...]` marker and all following conversation text are excluded.
- `relay_create_handoff`: return a frozen preview with a selected recipient. It does **not** share a link or persist data.
- `relay_review_handoff`: a review-first prompt for an MCP-capable agent.
- `relay://integration`: a resource describing the prototype boundaries.

The workspace also includes a small browser MCP client panel. With both Vite and `npm run mcp` running, connect to `http://127.0.0.1:8787/mcp`, choose **Extract via MCP**, review/edit the capsule, then choose **Create MCP preview**. This calls the same Streamable HTTP MCP tools as an external agent and displays the returned preview. Browser access is limited to HTTP loopback origins; the server itself remains bound to `127.0.0.1` by default.

An Agent Skill that instructs an agent to use these tools is in [`.agents/skills/relay-handoff/SKILL.md`](./.agents/skills/relay-handoff/SKILL.md). The skill requires user review before creating a preview and explains that this is not real sharing.

### Optional Amazon Bedrock extraction

Relay can use Amazon Bedrock Converse for extraction. You need an AWS identity with `bedrock:InvokeModel` permission, model access enabled in the selected region, and a model ID supported by Converse. To use IAM Identity Center, create and log in to a CLI profile (for example, `aws configure sso --profile relay-dev` followed by `aws sso login --profile relay-dev`), then set `AWS_PROFILE=relay-dev` in `.env`. The AWS SDK uses its credential provider chain; credentials are never stored in the browser or committed.

Copy `.env.example` to `.env` and set:

```dotenv
RELAY_EXTRACTION_PROVIDER=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=your-enabled-bedrock-model-id
```

Then restart `npm run mcp`. The MCP tool refuses to send text to Bedrock unless the agent sets `allowBedrockDataTransfer: true` after getting the user's explicit consent. The explicit private-marker filter still runs before the request; disabling that filter can send the whole conversation to AWS. Review the source and extracted draft before creating a preview. Model availability, pricing, and access requirements vary by region and model; consult [Amazon Bedrock Converse](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html) and [AWS Builder Center](https://builder.aws.com/) before enabling it.

This is a documented AWS integration, but AWS inference is optional and is not called in local mode. It is not an Alexa+ integration. The endpoint binds to loopback by default and has no authentication; do not expose it to a network or public internet without adding authentication, authorization, and production access controls.

Run the MCP protocol integration tests with:

```sh
npm test
```
