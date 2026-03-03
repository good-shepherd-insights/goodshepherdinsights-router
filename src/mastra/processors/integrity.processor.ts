/**
 * Integrity Processor (Custom)
 *
 * A second-pass LLM auditor that evaluates the raw agent output for behavioral
 * violations (fabrication, lazy deflection, low-effort boilerplate, non-accountability)
 * and rewrites the response to meet Eddify's quality standards before delivery.
 *
 * Mastra has no native quality/integrity rewriter — this fills that gap.
 * ModerationProcessor and PIIDetector only handle harm and PII respectively.
 */
import type { Processor } from '@mastra/core/processors';
import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { generateText } from 'ai';
import { monitor } from '../../monitor/monitor.js';
import {
    ProcessorId,
    INTEGRITY_AUDIT_PROMPT,
    MIN_RESPONSE_LENGTH,
} from './config/processor.config.js';
import { getProcessorModel } from './processor.model.js';

export const integrityProcessor: Processor<typeof ProcessorId.INTEGRITY> = {
    id: ProcessorId.INTEGRITY,
    name: 'Integrity Auditor',

    async processOutputResult({ messages, abort }: { messages: MastraDBMessage[]; abort: (reason?: string) => never }) {
        const last = messages.at(-1);
        if (!last) return messages;

        // MastraDBMessage content format 2: text lives in content.parts[{ type: 'text' }]
        const textPart = last.content.parts.find((p: any) => p.type === 'text') as any;
        const rawText: string = textPart?.text ?? '';

        // Hard abort — response too short to have real substance
        if (rawText.trim().length < MIN_RESPONSE_LENGTH) {
            monitor.processorEvent(ProcessorId.INTEGRITY, 'BLOCKED', 'Response below minimum quality length.');
            abort('Response did not meet minimum quality threshold (low effort).');
        }

        try {
            const { text: rewritten } = await generateText({
                model: getProcessorModel() as any,
                prompt: INTEGRITY_AUDIT_PROMPT + rawText,
            });

            if (textPart) {
                textPart.text = rewritten;
            }

            const changed = rewritten.trim() !== rawText.trim();
            monitor.processorEvent(
                ProcessorId.INTEGRITY,
                changed ? 'REWRITTEN' : 'PASSED',
                changed ? 'Output rewritten by integrity auditor.' : undefined,
            );
        } catch (err: any) {
            // Failsafe: audit call failed — pass original through rather than crash request
            monitor.processorEvent(ProcessorId.INTEGRITY, 'PASSED', `Audit error (${err?.message ?? 'unknown'}), passing original.`);
        }

        return messages;
    },
};
