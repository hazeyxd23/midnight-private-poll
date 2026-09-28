// In-memory simulator for the private-poll contract.
//
// Runs the compiled circuits directly through @midnight-ntwrk/compact-runtime —
// no node, indexer or proof server needed — so the contract logic can be
// tested quickly. Each "user" is just a different private state (secret key)
// acting on the same shared public contract state.
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, type Ledger } from '../contracts/managed/private-poll/contract/index.js';
import { witnesses, createPollPrivateState, type PollPrivateState } from '../src/witnesses.js';

const COIN_PUBLIC_KEY = '0'.repeat(64);

export class PollSimulator {
  readonly contract = new Contract<PollPrivateState>(witnesses);
  readonly address = sampleContractAddress();
  private context: CircuitContext<PollPrivateState>;

  constructor(question: string, organizer: PollPrivateState = createPollPrivateState()) {
    const { currentContractState, currentPrivateState } = this.contract.initialState(
      createConstructorContext(organizer, COIN_PUBLIC_KEY),
      question,
    );
    this.context = createCircuitContext(this.address, COIN_PUBLIC_KEY, currentContractState, currentPrivateState);
  }

  /** Public ledger state, exactly as anyone reading the chain would see it. */
  ledger(): Ledger {
    return ledger(this.context.currentQueryContext.state);
  }

  /** Switch the acting user by swapping in their private state (secret key). */
  as(user: PollPrivateState): this {
    this.context = createCircuitContext(
      this.address,
      COIN_PUBLIC_KEY,
      this.context.currentQueryContext.state,
      user,
    );
    return this;
  }

  vote(choice: boolean): Ledger {
    this.context = this.contract.impureCircuits.vote(this.context, choice).context;
    return this.ledger();
  }

  close(): Ledger {
    this.context = this.contract.impureCircuits.close(this.context).context;
    return this.ledger();
  }
}
