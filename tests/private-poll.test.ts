import { describe, expect, it } from 'vitest';
import { PollState, pureCircuits } from '../managed/private-poll/contract/index.js';
import { createPollPrivateState } from '../src/witnesses.js';
import { PollSimulator } from './poll-simulator.js';

const QUESTION = 'Should the hackathon run for 48 hours?';

const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

describe('private-poll contract', () => {
  it('initialises an open poll with the question and zero tallies', () => {
    const sim = new PollSimulator(QUESTION);
    const state = sim.ledger();

    expect(state.question).toBe(QUESTION);
    expect(state.state).toBe(PollState.OPEN);
    expect(state.yesVotes).toBe(0n);
    expect(state.noVotes).toBe(0n);
    expect(state.nullifiers.isEmpty()).toBe(true);
  });

  it('stores only a hash of the organizer secret key on the ledger', () => {
    const organizer = createPollPrivateState();
    const sim = new PollSimulator(QUESTION, organizer);
    const onChain = sim.ledger().organizer;

    expect(toHex(onChain)).toBe(toHex(pureCircuits.organizerKey(organizer.secretKey)));
    expect(toHex(onChain)).not.toBe(toHex(organizer.secretKey));
  });

  it('counts yes and no votes from different voters', () => {
    const sim = new PollSimulator(QUESTION);

    sim.as(createPollPrivateState()).vote(true);
    sim.as(createPollPrivateState()).vote(true);
    const state = sim.as(createPollPrivateState()).vote(false);

    expect(state.yesVotes).toBe(2n);
    expect(state.noVotes).toBe(1n);
    expect(state.nullifiers.size()).toBe(3n);
  });

  it('publishes a nullifier that does not reveal the voter secret key', () => {
    const voter = createPollPrivateState();
    const sim = new PollSimulator(QUESTION);
    const state = sim.as(voter).vote(true);

    const published = [...state.nullifiers].map(toHex);
    expect(published).toEqual([toHex(pureCircuits.nullifier(voter.secretKey))]);
    expect(published).not.toContain(toHex(voter.secretKey));
  });

  it('rejects a second vote from the same secret key', () => {
    const voter = createPollPrivateState();
    const sim = new PollSimulator(QUESTION);
    sim.as(voter).vote(true);

    expect(() => sim.as(voter).vote(false)).toThrow(/Already voted/);
    expect(sim.ledger().yesVotes).toBe(1n);
    expect(sim.ledger().noVotes).toBe(0n);
  });

  it('lets only the organizer close the poll', () => {
    const organizer = createPollPrivateState();
    const sim = new PollSimulator(QUESTION, organizer);

    expect(() => sim.as(createPollPrivateState()).close()).toThrow(/Only the organizer/);
    expect(sim.ledger().state).toBe(PollState.OPEN);

    expect(sim.as(organizer).close().state).toBe(PollState.CLOSED);
  });

  it('rejects votes after the poll is closed', () => {
    const organizer = createPollPrivateState();
    const sim = new PollSimulator(QUESTION, organizer);
    sim.as(organizer).close();

    expect(() => sim.as(createPollPrivateState()).vote(true)).toThrow(/Poll is closed/);
  });

  it('cannot be closed twice', () => {
    const organizer = createPollPrivateState();
    const sim = new PollSimulator(QUESTION, organizer);
    sim.as(organizer).close();

    expect(() => sim.as(organizer).close()).toThrow(/already closed/);
  });
});
