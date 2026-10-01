import { ASSIGNMENT_STATUSES } from './constants.js';

export function isAdjacentOrNonOverlapping(startA, endA, startB, endB) {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();
  // Overlap occurs only if the intersection has strictly positive duration
  return Math.max(sA, sB) >= Math.min(eA, eB);
}

export function calculateShiftDurationHours(startTime, endTime) {
  const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

export function evaluateVolunteerEligibility(volunteer, shift, options = {}) {
  const {
    allShifts = [],
    allAssignments = [],
    maxHoursPerVolunteer = null,
    ignoreAssignmentId = null
  } = options;

  const reasons = [];
  const ineligibilityReasons = [];

  const shiftStart = new Date(shift.startTime).getTime();
  const shiftEnd = new Date(shift.endTime).getTime();
  const shiftHours = calculateShiftDurationHours(shift.startTime, shift.endTime);

  // 1. Event membership status
  if (volunteer.membershipStatus && volunteer.membershipStatus !== 'active') {
    ineligibilityReasons.push(`Membership is ${volunteer.membershipStatus}, must be active.`);
  }

  // 2. Full availability coverage
  const availabilities = volunteer.availabilities || [];
  const coversShift = availabilities.some(avail => {
    const aStart = new Date(avail.startTime).getTime();
    const aEnd = new Date(avail.endTime).getTime();
    return aStart <= shiftStart && aEnd >= shiftEnd;
  });

  if (!coversShift) {
    ineligibilityReasons.push('Volunteer availability does not fully cover the shift window.');
  } else {
    reasons.push('Available for the entire shift window.');
  }

  // 3. Required skills check
  const requiredSkills = (shift.requiredSkills || []).map(s => s.trim().toLowerCase());
  const volunteerSkills = (volunteer.skills || []).map(s => s.trim().toLowerCase());
  const missingSkills = (shift.requiredSkills || []).filter(
    skill => !volunteerSkills.includes(skill.trim().toLowerCase())
  );

  if (missingSkills.length > 0) {
    ineligibilityReasons.push(`Missing required skill(s): ${missingSkills.join(', ')}.`);
  } else if (requiredSkills.length > 0) {
    reasons.push(`Possesses all required skills (${shift.requiredSkills.join(', ')}).`);
  } else {
    reasons.push('No special skills required.');
  }

  // 4. Overlap & Duplicate check with other active assignments
  const activeAssignments = allAssignments.filter(a => {
    if (a.id === ignoreAssignmentId) return false;
    if (a.volunteerId !== volunteer.id) return false;
    // Canceled assignments do NOT block or count
    if (a.status === ASSIGNMENT_STATUSES.CANCELED || a.status === ASSIGNMENT_STATUSES.ABSENT) {
      return false;
    }
    return true;
  });

  // Duplicate check: already assigned to this exact shift
  const duplicate = activeAssignments.find(a => a.shiftId === shift.id);
  if (duplicate) {
    ineligibilityReasons.push('Volunteer is already assigned to this shift.');
  }

  // Overlap check
  const shiftsById = new Map(allShifts.map(s => [s.id, s]));
  let overlapFound = false;

  for (const assignment of activeAssignments) {
    const existingShift = shiftsById.get(assignment.shiftId);
    if (!existingShift) continue;

    if (!isAdjacentOrNonOverlapping(shift.startTime, shift.endTime, existingShift.startTime, existingShift.endTime)) {
      overlapFound = true;
      ineligibilityReasons.push(
        `Overlaps with active shift "${existingShift.title || existingShift.roleName || 'Scheduled Shift'}" (${new Date(existingShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(existingShift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`
      );
      break;
    }
  }

  if (!duplicate && !overlapFound) {
    reasons.push('No schedule overlaps with other active shifts.');
  }

  // 5. Workload limit
  let currentAssignedHours = 0;
  for (const assignment of activeAssignments) {
    const existingShift = shiftsById.get(assignment.shiftId);
    if (existingShift) {
      currentAssignedHours += calculateShiftDurationHours(existingShift.startTime, existingShift.endTime);
    }
  }

  if (maxHoursPerVolunteer && (currentAssignedHours + shiftHours) > maxHoursPerVolunteer) {
    ineligibilityReasons.push(
      `Exceeds maximum workload: ${(currentAssignedHours + shiftHours).toFixed(1)}h / max ${maxHoursPerVolunteer}h.`
    );
  } else {
    reasons.push(`Workload: ${currentAssignedHours.toFixed(1)}h assigned (+${shiftHours.toFixed(1)}h this shift).`);
  }

  // Preferred skills match
  const matchedPreferredSkills = (shift.preferredSkills || []).filter(
    skill => volunteerSkills.includes(skill.trim().toLowerCase())
  );
  if (matchedPreferredSkills.length > 0) {
    reasons.push(`Matches preferred skills: ${matchedPreferredSkills.join(', ')}.`);
  }

  // Zone / Role preferences
  const preferredZones = volunteer.preferredZoneIds || volunteer.preferredZones || [];
  const prefersZone = shift.zoneId ? preferredZones.some(z => (typeof z === 'string' ? z === shift.zoneId : z?.id === shift.zoneId)) : false;
  if (prefersZone) {
    reasons.push('Matches volunteer zone preference.');
  }

  const preferredRoles = volunteer.preferredRoleNames || volunteer.preferredRoles || [];
  const shiftRole = (shift.roleName || shift.title || '').trim().toLowerCase();
  const prefersRole = shiftRole ? preferredRoles.some(r => {
    const roleStr = (typeof r === 'string' ? r : r?.name || '').trim().toLowerCase();
    return roleStr && (roleStr === shiftRole || shiftRole.includes(roleStr));
  }) : false;
  if (prefersRole) {
    reasons.push('Matches volunteer role preference.');
  }

  const isEligible = ineligibilityReasons.length === 0;

  // Ranking calculation
  // Factors:
  // - Fewer assigned hours (higher priority): weight -10 per hour
  // - Preferred skills matched: +5 per match
  // - Preferred zone: +3
  // - Preferred role: +2
  const rankingScore = isEligible
    ? (100 - (currentAssignedHours * 10) + (matchedPreferredSkills.length * 5) + (prefersZone ? 3 : 0) + (prefersRole ? 2 : 0))
    : -9999;

  return {
    isEligible,
    reasons,
    ineligibilityReasons,
    rankingScore,
    currentAssignedHours,
    projectedTotalHours: currentAssignedHours + shiftHours,
    matchedPreferredSkills,
    prefersZone,
    prefersRole
  };
}

export function rankEligibleCandidates(volunteers, shift, options = {}) {
  const evaluations = volunteers.map(volunteer => {
    const evalResult = evaluateVolunteerEligibility(volunteer, shift, options);
    return {
      volunteer,
      ...evalResult
    };
  });

  const eligible = evaluations.filter(e => e.isEligible);
  const ineligible = evaluations.filter(e => !e.isEligible);

  // Stable sorting for eligible:
  // 1. Fewer assigned hours (ascending)
  // 2. Preferred skills matched (descending)
  // 3. Preferred zone (descending)
  // 4. Preferred role (descending)
  // 5. Stable tie-break by volunteer name or ID
  eligible.sort((a, b) => {
    if (a.currentAssignedHours !== b.currentAssignedHours) {
      return a.currentAssignedHours - b.currentAssignedHours;
    }
    if (b.matchedPreferredSkills.length !== a.matchedPreferredSkills.length) {
      return b.matchedPreferredSkills.length - a.matchedPreferredSkills.length;
    }
    if (a.prefersZone !== b.prefersZone) {
      return b.prefersZone ? 1 : -1;
    }
    if (a.prefersRole !== b.prefersRole) {
      return b.prefersRole ? 1 : -1;
    }
    const nameA = a.volunteer.name || a.volunteer.email || a.volunteer.id;
    const nameB = b.volunteer.name || b.volunteer.email || b.volunteer.id;
    return nameA.localeCompare(nameB);
  });

  // Sort ineligible by name for predictable browsing
  ineligible.sort((a, b) => {
    const nameA = a.volunteer.name || a.volunteer.email || a.volunteer.id;
    const nameB = b.volunteer.name || b.volunteer.email || b.volunteer.id;
    return nameA.localeCompare(nameB);
  });

  return {
    eligible,
    ineligible,
    totalEvaluated: volunteers.length
  };
}

export function previewReassignmentImpact({
  volunteer,
  sourceShift,
  targetShift,
  allShifts,
  allAssignments,
  allZones,
  maxHoursPerVolunteer = null
}) {
  const activeAssignments = allAssignments.filter(
    a => a.status !== ASSIGNMENT_STATUSES.CANCELED && a.status !== ASSIGNMENT_STATUSES.ABSENT
  );

  const existingSourceAssignment = activeAssignments.find(
    a => a.volunteerId === volunteer.id && a.shiftId === sourceShift.id
  );

  // Evaluate candidate eligibility ignoring the existing assignment
  const eligibility = evaluateVolunteerEligibility(volunteer, targetShift, {
    allShifts,
    allAssignments,
    maxHoursPerVolunteer,
    ignoreAssignmentId: existingSourceAssignment ? existingSourceAssignment.id : null
  });

  // Calculate source zone coverage before and after
  const sourceZoneId = sourceShift.zoneId;
  const targetZoneId = targetShift.zoneId;

  const sourceRequired = sourceShift.requiredHeadcount || 1;
  const targetRequired = targetShift.requiredHeadcount || 1;

  const sourceShiftAssignmentsBefore = activeAssignments.filter(a => a.shiftId === sourceShift.id);
  const targetShiftAssignmentsBefore = activeAssignments.filter(a => a.shiftId === targetShift.id);

  const sourceShiftCountBefore = sourceShiftAssignmentsBefore.length;
  const sourceShiftCountAfter = Math.max(0, sourceShiftCountBefore - 1);

  const targetShiftCountBefore = targetShiftAssignmentsBefore.length;
  const targetShiftCountAfter = targetShiftCountBefore + 1;

  const sourceWillBeUnderstaffed = sourceShiftCountAfter < sourceRequired;

  const zonesById = new Map(allZones.map(z => [z.id, z]));
  const sourceZone = zonesById.get(sourceZoneId) || { name: 'Source Zone' };
  const targetZone = zonesById.get(targetZoneId) || { name: 'Destination Zone' };

  return {
    isEligible: eligibility.isEligible,
    eligibility,
    sourceZone: {
      id: sourceZoneId,
      name: sourceZone.name,
      shiftTitle: sourceShift.title || sourceShift.roleName,
      required: sourceRequired,
      beforeCount: sourceShiftCountBefore,
      afterCount: sourceShiftCountAfter,
      willBeUnderstaffed: sourceWillBeUnderstaffed
    },
    targetZone: {
      id: targetZoneId,
      name: targetZone.name,
      shiftTitle: targetShift.title || targetShift.roleName,
      required: targetRequired,
      beforeCount: targetShiftCountBefore,
      afterCount: targetShiftCountAfter,
      isFullyStaffedAfter: targetShiftCountAfter >= targetRequired
    },
    workloadChangeHours: {
      sourceHours: calculateShiftDurationHours(sourceShift.startTime, sourceShift.endTime),
      targetHours: calculateShiftDurationHours(targetShift.startTime, targetShift.endTime),
      netChangeHours: calculateShiftDurationHours(targetShift.startTime, targetShift.endTime) - calculateShiftDurationHours(sourceShift.startTime, sourceShift.endTime)
    },
    warnings: [
      ...(sourceWillBeUnderstaffed ? [`Warning: Moving this volunteer will leave ${sourceZone.name} understaffed (${sourceShiftCountAfter}/${sourceRequired} filled).`] : []),
      ...(!eligibility.isEligible ? [`Candidate is not eligible: ${eligibility.ineligibilityReasons.join(' ')}`] : [])
    ]
  };
}
