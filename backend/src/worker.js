import config, { validateConfig } from './config.js';
import { getRepo } from './db/repo.js';

validateConfig();

console.log('🤖 RALLY Background Escalation Worker started.');
console.log(`Persistence: Shared Postgres | Interval: ${config.escalationIntervalMs / 1000}s`);

async function runEscalationCycle() {
  try {
    const repo = getRepo();
    const escalated = await repo.checkAndEscalateUrgentIssues(config.urgentEscalationMinutesDefault);
    const timestamp = new Date().toLocaleTimeString();
    if (escalated.length > 0) {
      console.log(`[${timestamp}] Atomically escalated ${escalated.length} urgent issues to event organizers:`, escalated.map(e => e.title));
    }
  } catch (err) {
    console.error('Error in escalation cycle:', err.message);
  }
}

// Run immediately and every interval
runEscalationCycle();
setInterval(runEscalationCycle, config.escalationIntervalMs);
