import { store } from './store.js';

console.log('🤖 RALLY Background Escalation Worker started.');

function runEscalationCycle() {
  try {
    const escalated = store.checkAndEscalateUrgentIssues();
    const timestamp = new Date().toLocaleTimeString();
    if (escalated.length > 0) {
      console.log(`[${timestamp}] Escalated ${escalated.length} urgent issues:`, escalated.map(e => e.title));
    }
  } catch (err) {
    console.error('Error in escalation cycle:', err);
  }
}

// Run immediately and every 30 seconds
runEscalationCycle();
setInterval(runEscalationCycle, 30000);
