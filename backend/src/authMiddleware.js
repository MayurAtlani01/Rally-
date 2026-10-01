import { store } from './store.js';
import { ROLES } from '../../shared/constants.js';

export function authMiddleware(req, res, next) {
  let userId = req.headers['x-user-id'] || null;
  let tokenPayload = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    if (rawToken.startsWith('demo-token-')) {
      userId = rawToken.replace('demo-token-', '');
    } else if (rawToken.includes('.')) {
      try {
        const payloadBase64 = rawToken.split('.')[1];
        const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
        tokenPayload = JSON.parse(payloadJson);
        if (tokenPayload.sub) {
          userId = tokenPayload.sub;
        }
      } catch (e) {
        // Not a valid JWT, ignore
      }
    } else if (rawToken) {
      userId = rawToken;
    }
  }

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required. Sign in to continue.',
      code: 'UNAUTHENTICATED'
    });
  }

  let profile = store.getProfileById(userId);
  if (!profile && tokenPayload) {
    // Provision local profile for Supabase user if not yet stored
    const email = tokenPayload.email || `${userId}@user.local`;
    const fullName = tokenPayload.user_metadata?.full_name || email.split('@')[0];
    profile = store.createProfile({
      id: userId,
      fullName: fullName.charAt(0).toUpperCase() + fullName.slice(1),
      email,
      phone: tokenPayload.user_metadata?.phone || '',
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`
    });
  }

  if (!profile) {
    return res.status(401).json({
      error: 'User profile not found. Sign in to continue.',
      code: 'PROFILE_NOT_FOUND'
    });
  }

  req.user = profile;

  // The URL controls the authorization scope; a stale or forged header cannot
  // grant a role from a different event when an event is selected.
  const pathParts = req.baseUrl === '/api/events' ? req.path.split('/') : [];
  const pathEventId = pathParts[1] || null;
  const isSpecialPath = ['join', 'preview-invite'].includes(pathEventId);
  const scopedEventId = pathEventId && !isSpecialPath ? pathEventId : null;
  const eventId = scopedEventId || req.params.eventId || req.headers['x-event-id'];

  if (eventId) {
    req.eventId = eventId;
    req.membership = store.getMembership(eventId, req.user.id);
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
