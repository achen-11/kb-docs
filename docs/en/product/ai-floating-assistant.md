# AI Floating Assistant

> A site-level AI panel that floats over the lower-right corner of the Kooboo administration interface. It uses the current page as context, supports conversations and tool calls, asks for confirmation when required, and can be moved or resized.

## Where It Appears

The AI Floating Assistant is part of the site administration layout. After you open a site, an AI button appears in the lower-right corner.

| Item | Details |
|------|---------|
| Entry point | The floating **AI** button in the lower-right corner |
| Scope | Current site |
| Common pages | CMS pages, Development pages, Developer Mode, and other site-level administration pages |
| May not appear on | Account-level pages such as Console, Market, and Mail, or in restricted site environments |

The assistant does not replace the page you are working on. It opens a collapsible, movable, and resizable panel over the current administration page.

<DocImage src="/product/ai-floating-assistant/floating-button.png" alt="AI Floating Assistant button in the lower-right corner of a site administration page" width="1120" />

## Context Sources

When the panel opens, the current site and page become part of the conversation context.

| Context | Source |
|---------|--------|
| Current site | The `SiteId` in the URL |
| Current page | The current route and page title, such as Pages, Content, or Site Settings |
| Conversation history | AI conversations for the current site |
| Resource references | Code references manually added from Developer Mode or another code editor |
| Available capabilities | MCP servers, AI functions, and built-in tools enabled under [CMS: AI Service](/en/cms/settings/ai-service.md) |

The **Current Page** banner at the top of the panel shows which administration page the assistant is using as context. If you move from Pages to Site Settings, for example, the banner changes with the route.

## Open and Adjust the Panel

Click the floating button to open the panel over the current page.

<DocImage src="/product/ai-floating-assistant/floating-panel.png" alt="The open AI Floating Assistant panel, which can be moved and resized" width="1120" />

| Area | How to use it |
|------|---------------|
| Title bar | Identifies Kooboo AI. Drag an empty part of the title bar to move the panel. |
| Current Page banner | Confirms which administration page provides the current context. |
| Message area | Shows AI responses, tool calls, reasoning progress, and copy actions. |
| Composer | Enter a request, select a model, upload images, and choose an execution policy. |
| Send button | Click to send, or use `Ctrl + Enter`. |

When the panel is closed, a suggested action may appear above the floating button. Selecting the suggestion opens the panel and adds that action to the current conversation.

### Move and Resize

| Action | Method |
|--------|--------|
| Move the panel | Drag an empty part of the title bar that is not a button, input, or link. |
| Change width or height | Drag any edge of the panel. |
| Change both dimensions | Drag a corner. Resize indicators appear at the lower corners. |
| Temporarily maximize | Select **Fullscreen** in the title bar. Press `Esc` or select the button again to restore the floating layout. |

The minimum panel size is `360 × 420` pixels. The panel cannot be dragged outside the visible area or above the administration header. When the browser window changes size, Kooboo moves the panel back into the visible area.

The current browser stores the panel position and size. Closing and reopening the panel, or refreshing the page, restores the previous floating layout. Fullscreen mode is not stored as the long-term layout.

## Title Bar Actions

| Action | Details |
|--------|---------|
| **+** | Start a new conversation. |
| History | Open recent conversations and return to an earlier session. |
| Fullscreen | Expand the panel for reading long responses or reviewing changes. |
| Close | Collapse the panel back to the floating button. |

## Composer

| Control | Details |
|---------|---------|
| Model | Select the provider and model for this conversation. If no model is available, check [Console: AI Configuration](./console/ai-config.md). |
| Execution policy | Switch between **Always ask**, **Automatically run allowed operations**, and **Automatic execution**. See [AI Chat Settings](./ai-chat.md#settings) for the full configuration. |
| Upload image | Add a screenshot or image to the conversation context. |
| Token usage | When available, shows how much of the model context window is in use. |
| Send / Stop | Sends a message when idle and stops the current response while it is being generated. |

The composer supports editing the previous user message, queuing a new message while AI is working, and continuing after a response is stopped. Configuration questions can usually be asked directly. Review the confirmation details before allowing writes, deletions, code changes, or tool calls.

## Use with Developer Mode

Developer Mode can add the current resource or editor content to an AI conversation as a code reference.

| Scenario | Workflow |
|----------|----------|
| Explain the current code | Open the resource in Developer Mode -> right-click its tab -> **Add to Chat** -> ask a question in the floating assistant. |
| Modify a page or script | Ask AI to explain the proposed change -> review the diff -> confirm before applying it. |
| Investigate an API or CodeBlock | Open the resource in Developer Mode -> add it as a code reference -> ask AI to analyze it with the source context. |

This page describes the administration interface. For KScript, template resources, and API usage, see [API](/en/api/) and [Template Engine](/en/templateEngine/).

## AI Floating Assistant vs. AI Chat

| AI Floating Assistant | AI Claw / AI Chat |
|-----------------------|-------------------|
| Stays attached to the administration page you are using. | Provides a dedicated AI workspace with a conversation area, left panels, and a site workspace. |
| Best for questions while configuring a page or for quickly explaining the current screen. | Best for building and previewing sites, reviewing code, running scheduled tasks, and inspecting task history. |
| Opened from the floating button in the lower-right corner. | Opened from the **AI** button in the top navigation. |

## Common Workflows

| Goal | Workflow |
|------|----------|
| Ask how to configure the current page | Open the target CMS page -> select the floating AI button -> ask your question. |
| Ask AI to review a configuration sequence | Keep the page open -> describe the intended result in the panel -> check the fields against the response. |
| Keep a list visible while chatting | Open the panel -> move it away from the list -> resize it from an edge. |
| Read a long response | Open the panel -> select **Fullscreen** -> read or copy the response -> press `Esc` to restore it. |
| Open the full AI workspace | Select **AI** in the top navigation -> open [AI Claw / AI Chat](./ai-chat.md). |

## Related Documentation

| Document | Details |
|----------|---------|
| [AI Claw / AI Chat](./ai-chat.md) | Dedicated workspace for conversations, previews, tasks, and settings. |
| [Console: AI Configuration](./console/ai-config.md) | Organization-level AI provider credentials. |
| [CMS: AI Service](/en/cms/settings/ai-service.md) | MCP and AI function configuration for a site. |
| [Developer Mode](./developer-mode.md) | Edit and debug resources, and add code references to AI conversations. |
