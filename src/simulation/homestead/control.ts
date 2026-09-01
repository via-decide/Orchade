export type ActuatorCommandType = 'OPEN_VALVE' | 'CLOSE_VALVE' | 'START_PUMP' | 'STOP_PUMP' | 'SETPOINT';

export interface ActuatorCommand {
  commandId: string;
  propertyId: string;
  entityId: string;
  actuatorId: string;
  type: ActuatorCommandType;
  requestedBy: string;
  requestedAt?: string;
  requestedTick?: number;
  parameters: Record<string, number | string | boolean>;
  preconditions: string[];
  safetyEnvelopeRef: string;
}

export type ControlCheckName =
  | 'sensorFreshness'
  | 'tankAvailability'
  | 'pumpHealth'
  | 'valveHealth'
  | 'energyAvailability'
  | 'runtimeLimit'
  | 'pressureSafe';

export interface ControlCheck {
  name: ControlCheckName;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  reasonCode: string;
  evidenceRefs: string[];
}

export interface ControlDecision {
  commandId: string;
  result: 'AUTHORIZED' | 'REJECTED' | 'DEFERRED';
  checks: ControlCheck[];
  evidenceRefs: string[];
}

export interface PostActionVerification {
  commandId: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  acknowledgementRef?: string;
  observationRefs: string[];
  expectedChange: string;
  reasonCode?: string;
}

export function evaluateControlDecision(command: ActuatorCommand, checks: ControlCheck[]): ControlDecision {
  const requiredChecks = new Set<ControlCheckName>([
    'sensorFreshness',
    'tankAvailability',
    'pumpHealth',
    'valveHealth',
    'energyAvailability',
    'runtimeLimit',
  ]);
  const supplied = new Set(checks.map(check => check.name));
  const normalizedChecks = checks.map(check => ({ ...check, evidenceRefs: [...check.evidenceRefs] }));
  requiredChecks.forEach(name => {
    if (!supplied.has(name)) normalizedChecks.push({ name, status: 'UNKNOWN', reasonCode: 'CHECK_NOT_EVALUATED', evidenceRefs: [] });
  });
  const result = normalizedChecks.some(check => check.status === 'FAIL')
    ? 'REJECTED'
    : normalizedChecks.some(check => check.status === 'UNKNOWN')
      ? 'DEFERRED'
      : 'AUTHORIZED';
  return {
    commandId: command.commandId,
    result,
    checks: normalizedChecks,
    evidenceRefs: [...new Set(normalizedChecks.flatMap(check => check.evidenceRefs))],
  };
}
