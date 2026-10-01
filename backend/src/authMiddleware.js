import { getRepo } from './db/repo.js';
import { verifyAccessToken } from './db/supabase.js';
import { ROLES } from '../../shared/constants.js';

/**
 * Strict authentication middleware.
 * Requires and verifies a valid Supabase Bearer access token.
 * Rejects missing, malformed, expired, and forged tokens.
 * Never authenticates using x-user-id or unverified token claims.
 */
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Valid Bearer access token must be provided.',
      code: 'UNAUTHENTICATED'
    });
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken || rawToken.startsWith('demo-token-')) {
    return res.status(401).json({
      error: 'Invalid or demo token. Real verified Supabase authentication required.',
      code: 'INVALID_TOKEN'
    });
  }

  // Strictly verify token using Supabase verification
  const { user: verifiedUser, error: verifyError } = await verifyAccessToken(rawToken);
  if (verifyError || !verifiedUser || !verifiedUser.id) {
    return res.status(401).json({
      error: 'Authentication token is invalid, expired, or signature could not be verified.',
      code: 'INVALID_TOKEN'
    });
  }

  // Derive profile identity strictly from the verified Supabase identity
  const repo = getRepo();
  let profile = await repo.getProfileById(verifiedUser.id);
  if (!profile) {
    // Upsert verified identity profile
    const email = verifiedUser.email || `${verifiedUser.id}@user.local`;
    const fullName = verifiedUser.user_metadata?.full_name || email.split('@')[0];
    profile = await repo.upsertProfile({
      id: verifiedUser.id,
      email,
      fullName: fullName.charAt(0).toUpperCase() + fullName.slice(1),
      phone: verifiedUser.user_metadata?.phone || '',
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`
    });
  }

  req.user = profile;
  req.token = rawToken;

  // The URL strictly controls the authorization scope
  const pathParts = req.baseUrl === '/api/events' ? req.path.split('/') : [];
  const pathEventId = pathParts[1] || null;
  const isSpecialPath = ['join', 'preview-invite'].includes(pathEventId);
  const scopedEventId = pathEventId && !isSpecialPath ? pathEventId : null;
  const eventId = scopedEventId || req.params.eventId;

  if (eventId) {
    req.eventId = eventId;
    req.membership = await repo.getMembership(eventId, req.user.id);
  }

  if (scopedEventId && (!req.membership || req.membership.status !== 'active')) {
    return res.status(403).json({
      error: 'You are not an active member of this event.',
      code: 'NOT_A_MEMBER'
    });
  }

  req.hasRole = (...roles) => {
    if (!req.membership || req.membership.status !== 'active') return false;
    return roles.includes(req.membership.role);
  };

  req.isOrganizer = () => req.hasRole(ROLES.ORGANIZER);
  req.isCoordinator = () => req.hasRole(ROLES.COORDINATOR);
  req.isVolunteer = () => req.hasRole(ROLES.VOLUNTEER);

  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.membership) {
      return res.status(403).json({
        error: 'Forbidden: You are not an active member of this event.',
        code: 'NOT_A_MEMBER'
      });
    }

    if (req.membership.status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden: Your membership status is not active.',
        code: 'MEMBERSHIP_INACTIVE'
      });
    }

    if (!roles.includes(req.membership.role)) {
      return res.status(403).json({
        error: `Forbidden: Requires one of [${roles.join(', ')}]. You are [${req.membership.role}].`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}
