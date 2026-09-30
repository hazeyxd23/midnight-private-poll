/**
 * Read the deployed poll's PUBLIC ledger state straight from the indexer.
 *
 * Needs no wallet and no private state — this is exactly what any observer of
 * the chain can see. Usage: npm run status [-- <contractAddress>]
 */
import { WebSocket } from 'ws';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ledger, PollState } from '../managed/private-poll/contract/index.js';
import { resolveNetwork, getDeployment } from './network';

// @ts-expect-error Required for GraphQL subscriptions
globalThis.WebSocket = WebSocket;

const { network, config } = resolveNetwork();
setNetworkId(config.networkId);

const address = process.argv.slice(2).find((a) => /^[0-9a-f]{64}$/i.test(a)) ?? getDeployment(network)?.address;
if (!address) {
  console.error(`No contract address given and none recorded for ${network}. Run npm run deploy first.`);
  process.exit(1);
}

const provider = indexerPublicDataProvider(config.indexer, config.indexerWS);
const contractState = await provider.queryContractState(address);
if (!contractState) {
  console.error(`No contract found at ${address} on ${network}.`);
  process.exit(1);
}

const poll = ledger(contractState.data);
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

console.log(`\n  Private Poll on ${network}`);
console.log(`  Contract address: ${address}\n`);
console.log('  ── Public ledger state ──');
console.log(`  question:   ${poll.question}`);
console.log(`  state:      ${PollState[poll.state]}`);
console.log(`  yesVotes:   ${poll.yesVotes}`);
console.log(`  noVotes:    ${poll.noVotes}`);
console.log(`  organizer:  ${hex(poll.organizer)}  (hash of a private key)`);
console.log(`  nullifiers: ${poll.nullifiers.size()}`);
for (const n of poll.nullifiers) console.log(`    - ${hex(n)}`);
console.log('');
process.exit(0);
