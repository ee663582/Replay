# 90-second walkthrough

**Opening:** “When a conversation ends, the useful context is scattered through the thread. Relay makes a small, intentional handoff instead of forwarding everything.”

**Show the source:** Use the sample repair-café conversation. Call out the marked private section and keep the explicit-marker filter on. Click **Extract context** and explain that this five-hour prototype uses a transparent local heuristic. If you edit the conversation or privacy filter, extraction must be run again before publishing.

**Show control:** Edit one decision. Remove anything the next person does not need. Add a missing action if helpful. The sender chooses the audience before creating the capsule.

**Show recipient:** Publish the handoff and open the recipient preview. Edit the source capsule or recipient; the frozen copy is marked out of date until refreshed. Revoke access, edit the source, and confirm the handoff remains revoked until explicitly restored or republished.

**Close honestly:** “This demo simulates the Alexa+ handoff experience; it does not connect to Alexa+. The app's drafts persist in this browser only, which is not secure multi-user sharing. A separate Streamable HTTP MCP server exposes extraction and handoff-preview tools. It runs locally by default and can optionally call Amazon Bedrock only after the user consents to sending the non-excluded conversation text. The preview tool does not share or persist a handoff.”

## Optional MCP and AWS demo

Start both `npm run dev` and `npm run mcp` in separate terminals. In the web app workspace, use **Try the Relay MCP server** to connect to `http://127.0.0.1:8787/mcp`. Click **Extract via MCP**, edit or remove a returned detail in the capsule, then click **Create MCP preview**. This visibly exercises the Streamable HTTP client and server, and shows the agent-facing result next to the reviewable capsule. It does not sync with the app's separate recipient tab or create a real share link.

The no-credentials local mode is the reliable baseline. To demonstrate AWS inference, configure the optional Bedrock settings in `.env` as documented in the README, restart the server, then disclose the data transfer and check the explicit Bedrock consent box before extraction. Bedrock access and model invocation have not been verified until tested with an AWS account and enabled model.
