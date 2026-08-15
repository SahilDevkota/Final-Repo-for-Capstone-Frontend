import jwt from 'jsonwebtoken'

// Tokens are issued by the Spring Boot backend, which signs with HS384.
// This service only verifies them — it never creates accounts or tokens,
// so there is one source of identity for the whole app.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in to continue' })
  }

  try {
    const claims = jwt.verify(header.slice(7), process.env.JWT_SECRET, {
      algorithms: ['HS384'],
    })

    // `sub` is the username the backend put in the token
    req.username = claims.sub
    req.token = header.slice(7)

    if (!req.username) {
      return res.status(401).json({ error: 'Token has no subject' })
    }
    next()
  } catch (error) {
    // Expired and malformed both mean "sign in again", so both are 401.
    // The Java filter returns 500 for a bad signature; this does not.
    const expired = error.name === 'TokenExpiredError'
    res.status(401).json({
      error: expired ? 'Your session has expired' : 'Invalid session',
    })
  }
}
