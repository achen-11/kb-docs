# Mail: Calendar

> Create events, invite attendees, and respond to meeting invitations received by email. Events with attendees send invitation messages.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Calendar** at the bottom of the navigation. |
| Direct URL | `/_Admin/kmail/calendar` |
| Frontend route | `/kmail/calendar` |
| Prerequisite | Set a default address under [Mail Addresses](./addresses.md). |

<DocImage src="/product/mail/calendar-overview.png" alt="Mail Calendar with month view and event list" width="1120" />

## Page Structure

| Area | Details |
|------|---------|
| Month view | Shows events by month. Hover over a date and select **+** to create an event. |
| Event list | Shows events for the selected date. |
| Event details | Select an event to review its time, location, description, and attendee status. |
| Collapse | Hides or shows the event list. |

The page loads approximately 31 days before and after the current date. Changing months reloads the range.

## Create an Event

Select **+** on a date, or select `New Schedule` when the selected date has no events.

| Field | Details |
|-------|---------|
| Schedule Subject | Required title; 1-50 characters. |
| Participants | Attendee email addresses; optional. |
| Start Time | Start date and time. |
| End Time | End date and time; must be later than Start Time. |
| Location | Event location. |
| Description | Rich-text description. |

If the event has attendees and has not expired, Kooboo asks whether to send invitations. A default mail address is required.

## Edit or Delete

| Action | Availability | Details |
|--------|--------------|---------|
| Edit | Current user is the organizer. | Update the title, time, location, description, or attendees. |
| Delete | Available in event details. | Deletes the event. For an unexpired event with attendees, Kooboo asks whether to send cancellation messages. |

When an unexpired event changes, Kooboo may ask whether to notify existing, added, or removed attendees.

## Meeting Invitations

When a message contains calendar data, its details page displays an invitation card.

| Action | Details |
|--------|---------|
| Yes | Accept. |
| No | Decline. |
| Maybe | Tentatively accept. |
| Re-select | Change a previous response. |

Expired invitations cannot be answered.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Schedule a meeting | Set the default address -> Calendar -> select **+** on a date -> enter the subject, attendees, and time -> save. |
| Change the meeting time | Calendar -> open the event -> Edit -> change the time -> confirm attendee notifications. |
| Cancel a meeting | Calendar -> open the event -> Delete -> confirm cancellation messages. |
| Respond to an invitation | Inbox -> open the invitation -> Yes, No, or Maybe. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Mail Addresses](./addresses.md) | Default address configuration. |
| [Messages](./messages.md#message-details) | Meeting invitations in message details. |
| [Compose](./compose.md) | Sending messages and saving drafts. |
