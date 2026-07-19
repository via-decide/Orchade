# Event Flow

Command Issued -> Queued Event -> Scheduler Tick -> Event Flush -> Subscribers -> History -> Replay Frame.

Events may be cancelled by high-priority handlers. Failed dispatch is retained in the dead-letter queue for diagnostics.
