import type { Client } from "@libsql/client";

export interface SegmentInput {
  sourceText: string;
  language: string;
  text: string;
  isFinal: boolean;
}

export interface Segment extends SegmentInput {
  id: string;
  sequence: number;
  createdAt: string;
}

export class TranscriptStore {
  private buffer: Segment[] = [];
  private nextSequence = 0;

  constructor(
    private sessionId: string,
    private db: Client,
  ) {}

  get segmentCount(): number {
    return this.buffer.length;
  }

  getBuffer(): ReadonlyArray<Segment> {
    return this.buffer;
  }

  append(input: SegmentInput): Segment {
    const segment: Segment = {
      ...input,
      id: crypto.randomUUID(),
      sequence: this.nextSequence++,
      createdAt: new Date().toISOString(),
    };
    this.buffer.push(segment);
    return segment;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const statements = this.buffer.map((seg) => ({
      sql: `INSERT INTO transcript_segments (id, session_id, sequence, source_text, language, text, is_final, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        seg.id,
        this.sessionId,
        seg.sequence,
        seg.sourceText,
        seg.language,
        seg.text,
        seg.isFinal ? 1 : 0,
        seg.createdAt,
      ] as (string | number)[],
    }));

    await this.db.batch(statements, "write");
    this.buffer = [];
  }
}
