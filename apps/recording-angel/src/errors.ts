export class RecordingAngelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "RecordingAngelError";
  }
}

export class SessionNotFoundError extends RecordingAngelError {
  constructor(identifier: string) {
    super(`Session not found: ${identifier}`, "SESSION_NOT_FOUND");
  }
}

export class SessionAlreadyHostedError extends RecordingAngelError {
  constructor() {
    super("Session already has a host connected", "SESSION_ALREADY_HOSTED");
  }
}

export class InvalidTokenError extends RecordingAngelError {
  constructor() {
    super("Invalid or expired token", "INVALID_TOKEN");
  }
}

export class UnauthorizedError extends RecordingAngelError {
  constructor() {
    super("Invalid API key", "UNAUTHORIZED");
  }
}

export class SessionEndedError extends RecordingAngelError {
  constructor() {
    super("Session has already ended", "SESSION_ENDED");
  }
}
