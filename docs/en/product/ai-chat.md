# AI Claw / AI Chat

> Describe a goal in natural language, work with AI at the site level, preview the site, manage automated tasks, and request human assistance when needed.

## How to Open It

| Item | Details |
|------|---------|
| Top navigation | Open a site, then select **AI** in the top navigation. |
| Direct URL | `/_Admin/ai-chat/overview?SiteId={SiteGUID}` |
| Open a left panel | `/_Admin/ai-chat/overview?SiteId={SiteGUID}&tab={Panel}` |
| Open a Data submenu | Add `&submenu={SubItem}`, for example `submenu=content-model`. |
| Frontend route | `/ai-chat/overview` |
| Scope | Site-level page; `SiteId` is required. |

Common `tab` values are `chat` (the default and may be omitted), `fix`, `task`, `data`, `design`, `service`, and `setting`.

AI Claw and the [AI Floating Assistant](./ai-floating-assistant.md) share the same conversation and tool capabilities. AI Claw is a dedicated workspace: panels for conversations, tasks, data, design, and support are available on the left, while the site workspace on the right can display a browser preview, source code, media, or an application blueprint.

<DocImage src="/product/ai-chat/ai-chat-overview.png" alt="AI Claw with the conversation area and site workspace" width="1120" />

## Page Structure

The interface has four main areas:

| Area | How to use it |
|------|---------------|
| Top navigation | Switch sites, return to **AI Creation**, or reopen the **AI** entry point. |
| Activity bar | Open conversation history, scheduled routines, task history, data, design, human help, or settings. Use `Cmd/Ctrl + B` to expand or collapse the adjacent panel. |
| Conversation area | Work with the **Kooboo Self-Service Agent**. The header also provides access to **Human Help**. |
| Site workspace | Preview the site or switch to Code, Media Library, or Application Blueprint. |

The left panel may be collapsed when conversation mode opens. Select an item in the activity bar, or press `Cmd/Ctrl + B`, to expand it.

## Conversation Area

The conversation area is the primary place to give AI instructions and review its work.

| Control | Details |
|---------|---------|
| Composer | Enter a goal in natural language, such as "Check whether the home page content is complete." |
| Model | Select a provider and model. Some models also support a reasoning-effort setting. |
| Execution policy | Switch between **Always ask**, **Automatically run allowed operations**, and **Automatic execution**. Open the dropdown for the full settings page. |
| Upload image | Add screenshots or images to the conversation context. |
| Send | Select the send button or use the configured shortcut. The default is `Enter`; it can be changed to `Cmd/Ctrl + Enter`. |
| Stop | While a response is being generated, the send action changes to Stop. |

When AI proposes a write, code change, or tool call that requires approval, the conversation shows a confirmation item. The MCP servers, AI functions, and built-in tools available to the site are controlled by [CMS: AI Service](/en/cms/settings/ai-service.md).

The conversation may also show:

| Feature | Details |
|---------|---------|
| Current todos | Breaks a multi-step goal into tasks and tracks progress beside the conversation. |
| Recommended next actions | Suggests useful follow-up actions after a response. A suggestion can be sent directly or placed in the composer. |
| Site-building progress | Shows milestones for site-building workflows. |

## Site Workspace

The site workspace stays beside the conversation so you can inspect results without leaving AI Chat. Use the workspace tabs to change modes.

| Mode | Details |
|------|---------|
| Browser | Provides a live site preview. Navigate with the address bar, switch between desktop, tablet, and mobile viewports, select page elements, and send annotations to AI. |
| Code | Browse the site resource tree and preview source files. You can reference code or open [Developer Mode](./developer-mode.md). |
| Media Library | Browse site media when the current user has permission. |
| Application Blueprint | When the site has a blueprint, review its structure and continue discussing it with AI. |

<DocImage src="/product/ai-chat/workspace-code.png" alt="AI Chat Code workspace with the site resource tree and source preview" width="1120" />

The Browser workspace also includes diagnostic tools:

| Tool | Details |
|------|---------|
| Runtime Logs | Review errors, warnings, and normal logs captured from the preview, then ask AI to investigate them. |
| Network Requests | Review failed, timed-out, or otherwise abnormal requests, then ask AI to investigate them. |
| Iframe preview notice | Explains embedded-preview limits. Device capabilities, authentication, payment redirects, and similar flows should still be verified by opening the site in a new tab. |

While AI is generating a page, the preview may display build progress. When the first page becomes available, the preview opens automatically. Drag the divider to resize the workspace, or use the conversation header to collapse or expand it.

## Left Panels

### Conversation History

Open the conversation-history panel to manage conversations for the current site.

| Action | Details |
|--------|---------|
| Overview / All conversations | Show only the overview conversation or browse every conversation. |
| New conversation | Start an empty conversation. |
| Import | Import a conversation file. |
| Rename / Delete | Manage stored conversations. |

### Scheduled Routines

Turn an AI instruction into an automation that runs once or on a schedule.

<DocImage src="/product/ai-chat/fixed-tasks.png" alt="Scheduled routines panel with its empty state and add action" width="1120" />

Select **+** in the panel header to open **New Automation Task**. You can also select **Use Template** to start with a template for commerce, content inspection, development quality, site maintenance, or another supported workflow.

<DocImage src="/product/ai-chat/fixed-task-dialog.png" alt="New Automation Task dialog with name, prompt, schedule, model, and status fields" width="720" />

| Field | What to enter |
|-------|---------------|
| Task name | A recognizable name that identifies the target and intended result. |
| Prompt | Complete instructions describing what AI should inspect, generate, report, or call. |
| Execution type | Run once or repeat on a schedule. |
| Repeat interval | For recurring tasks, enter a value and unit such as days, hours, or minutes. |
| Start time | The first or next scheduled execution time. |
| Model | The AI model used by the automation. |
| Status | Keep the task disabled until its configuration has been reviewed, then enable it. |

After saving, you can edit, delete, or run the task immediately. Kooboo prevents a running task from being started again at the same time.

### Task History

Task History shows execution records for AI automations.

<DocImage src="/product/ai-chat/task-list.png" alt="AI task history with status filters and an execution record" width="1120" />

| Filter | Details |
|--------|---------|
| All | Show every task execution. |
| Waiting | The execution has not started. |
| Running | The execution is in progress. |
| Completed | The execution completed successfully. |
| Failed | The execution failed and needs investigation. |

Select a task on the left to review its complete execution record. When a task can be continued, **Continue Session** opens a new conversation with the task log as context.

### Data

Browse or maintain content and commerce data without leaving the AI workspace.

<DocImage src="/product/ai-chat/data-content.png" alt="AI Chat Data panel with content models, content items, product types, categories, and products" width="1120" />

| Group | Pages |
|-------|-------|
| Content | Content Models, Content Data |
| Commerce | Product Types, Categories, Products |

Example deep link: `/_Admin/ai-chat/overview?SiteId={SiteGUID}&tab=data&submenu=content-model`.

### Design

Review and edit site design variables such as colors, typography, border radius, spacing, and shadows. If design variables have not been created, select **Initialize Design Variables** before editing and saving them.

<DocImage src="/product/ai-chat/design.png" alt="AI Chat Design panel with the Initialize Design Variables action" width="1120" />

### Human Help

In supported environments, select an expert, submit a support request, and track messages and acceptance status. Human Help is also available from the conversation header.

Human assistance may involve expert services, payment, and acceptance. Use [Console: Balance](./console/balance.md) and [Console: Orders](./console/orders.md) to review account balance, orders, and payments.

### Settings

Open **AI Chat Settings** to manage personal preferences and the execution policy shared by the current site.

<DocImage src="/product/ai-chat/settings.png" alt="AI Chat Settings with personal preferences and the site execution policy" width="1120" />

| Section | Scope | Settings |
|---------|-------|----------|
| Personal preferences | Current browser | Send shortcut, behavior when sending while AI is working, default execution policy for new sites, and completion notifications. |
| Site execution policy | Shared by the site | **Always ask**, **Automatically run allowed operations**, or **Automatic execution**. The allow-list mode also lets you manage which functions can run automatically. |

Changing the site execution policy requires the corresponding AI edit permission. The policy control beside the composer provides a shortcut; use this settings page for the full configuration.

## Before You Start

| Check | Where to verify it |
|-------|--------------------|
| An organization-level AI provider is configured. | [Console: AI Configuration](./console/ai-config.md) |
| The account has sufficient balance. | [Console: Balance](./console/balance.md) |
| Required MCP servers or AI functions are enabled for the site. | [CMS: AI Service](/en/cms/settings/ai-service.md) |
| The execution policy is appropriate for the environment. | AI Chat Settings, or the execution-policy control beside the composer. |
| AI has the source context it needs. | Use the **Code** workspace, or right-click a resource tab in [Developer Mode](./developer-mode.md) and select **Add Code Reference**. |

## AI Chat vs. the AI Floating Assistant

| AI Claw / AI Chat | AI Floating Assistant |
|-------------------|-----------------------|
| Dedicated workspace with a conversation area, left panels, and a site workspace. | Floats over the current administration page so you can ask questions while continuing to work there. |
| Best for site building, previews, code review, scheduled routines, and task history. | Best for questions that depend on the current CMS page. |
| Focuses the interface on AI-assisted work. | Keeps the current CMS page visible and usable. |

## Common Workflows

| Goal | Workflow |
|------|----------|
| Start a site-level AI conversation | Open the site -> select **AI** -> describe the goal -> choose a model and execution policy -> send. |
| Inspect the site while chatting | Keep the **Browser** workspace open -> ask AI to make a change -> refresh and review the preview. |
| Give feedback on a preview element | Use the preview toolbar to select the element -> add an annotation -> place it in the composer or send it directly. |
| Investigate a preview error | Open **Runtime Logs** or **Network Requests** -> ask AI to investigate. |
| Create a recurring inspection | Open Scheduled Routines -> select **+** -> enter the name, prompt, schedule, and model -> create the task. |
| Review task results | Open Task History -> select a status filter -> open an execution record. |
| Update content or products | Open Data -> choose a Content or Commerce page. |
| Update design variables | Open Design -> initialize or edit the variables -> save. |
| Request human assistance | Select **Human Help** in the header or open the Human Help panel. |

## Related Documentation

| Document | Details |
|----------|---------|
| [AI Floating Assistant](./ai-floating-assistant.md) | AI assistance based on the current administration page. |
| [Console: AI Configuration](./console/ai-config.md) | Organization-level AI provider credentials. |
| [Console: Balance](./console/balance.md) | Balance and top-up entry points. |
| [CMS: AI Service](/en/cms/settings/ai-service.md) | MCP, AI functions, vector search, and site AI settings. |
| [Developer Mode](./developer-mode.md) | Multi-resource editing, debugging, and code references. |
