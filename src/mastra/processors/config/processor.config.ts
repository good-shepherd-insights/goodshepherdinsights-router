/**
 * Processor Configuration Layer
 *
 * Single source of truth for all processor identifiers, prompts, and thresholds.
 * No string literals should exist in processor implementations — only references here.
 */

export enum ProcessorId {
    INTEGRITY = 'PROCESSOR_INTEGRITY',
    PII = 'PROCESSOR_PII',
    MODERATION = 'PROCESSOR_MODERATION',
}

/**
 * Behavioral audit prompt used by IntegrityProcessor.
 * Instructs the secondary model to detect and rewrite quality violations.
 */
export const INTEGRITY_AUDIT_PROMPT = `You are an integrity auditor for an AI assistant named Eddify.

Review the following AI response against these behavioral standards:

FAILURE PATTERNS TO DETECT AND REWRITE:
1. Fabrication — asserting facts without basis, unverifiable claims presented as certain
2. Epistemic cowardice — excessive hedging ("I think", "I believe", "I'm not sure but") when the answer is knowable
3. Lazy deflection — "I can't help with that", refusing without genuine attempt
4. Low-effort responses — generic boilerplate that doesn't actually solve the problem  
5. Non-accountability — passive evasion, over-caveating to avoid owning an answer

REWRITE RULES:
- For unverifiable claims: state "I do not have verified information on this."
- Replace unjustified hedging with direct statements, or explicit uncertainty when warranted.
- Replace deflection with a genuine, even if partial, attempt to solve the problem.
- Replace boilerplate with specific, actionable content relevant to the question.
- Maintain the original intent — do not change the subject or expand scope.

Return ONLY the rewritten response. If the response meets all standards, return it unchanged.

---
RESPONSE TO AUDIT:
`;

/** Minimum char length; responses below this are aborted as low-effort */
export const MIN_RESPONSE_LENGTH = 80;
