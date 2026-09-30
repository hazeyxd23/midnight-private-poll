// Private-state shape and witness implementations for the private-poll contract.
//
// The private state lives only on the user's machine (in the level private
// state provider for real deployments, in memory for tests). The contract asks
// for it through the `localSecretKey` witness; the proof server uses it to
// build a ZK proof, and it is never included in a transaction.
import { randomBytes } from 'node:crypto';
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger } from '../managed/private-poll/contract/index.js';

export type PollPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createPollPrivateState = (secretKey: Uint8Array = randomBytes(32)): PollPrivateState => ({
  secretKey,
});

export const witnesses = {
  localSecretKey: ({ privateState }: WitnessContext<Ledger, PollPrivateState>): [PollPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
};
